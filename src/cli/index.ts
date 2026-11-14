#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { parseCliArgs, printHelp } from './args.js';
import { ProjectDiscovery } from '../platform/project-discovery.js';
import { ConfigResolver } from '../platform/config-resolver.js';
import { BaselineRunner } from '../platform/baseline-runner.js';
import { ReportBuilder } from '../reports/report-builder.js';
import { RunDirectoryManager } from '../artifacts/run-directory.js';
import { SecretRedactor } from '../artifacts/secret-redactor.js';
import { ExitCode } from '../contracts/exit-codes.js';

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  let options;
  try {
    options = parseCliArgs(argv);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    printHelp();
    process.exit(ExitCode.CONFIG_ERROR);
  }

  if (options.command === 'help') {
    printHelp();
    process.exit(ExitCode.SUCCESS);
  }

  if (options.command === 'version') {
    console.log('mockguard 0.1.0');
    process.exit(ExitCode.SUCCESS);
  }

  const runManager = new RunDirectoryManager();
  runManager.init();

  try {
    // 1. Discover Project
    const project = ProjectDiscovery.discover(
      options.targetPath,
      options.configPath
    );

    // 2. Resolve Test Command
    const testCommand = ConfigResolver.resolve(project, {
      testMatch: options.testMatch,
      bail: options.bail,
    });

    // 3. Execute Baseline
    const runner = new BaselineRunner();
    const baseline = await runner.run(testCommand, {
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
    });

    // Redact any output before storing/reporting
    if (baseline.stdout) {
      baseline.stdout = SecretRedactor.redact(baseline.stdout);
    }
    if (baseline.stderr) {
      baseline.stderr = SecretRedactor.redact(baseline.stderr);
    }

    // Save baseline evidence
    runManager.saveArtifact('baseline.stdout.log', baseline.stdout || '');
    runManager.saveArtifact('baseline.stderr.log', baseline.stderr || '');

    // 4. Build Report
    const report = ReportBuilder.build({
      project,
      command: testCommand,
      baseline,
      runId: runManager.getRunId(),
    });

    // 5. Output Report
    if (options.outFile) {
      ReportBuilder.writeJson(report, options.outFile);
    }

    if (options.format === 'json' && !options.outFile) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(ReportBuilder.renderTerminal(report));
    }

    // 6. Exit Code
    if (baseline.status === 'TIMEOUT') {
      process.exit(ExitCode.TIMEOUT);
    } else if (baseline.status !== 'PASS') {
      process.exit(ExitCode.BASELINE_FAILED);
    } else {
      process.exit(ExitCode.SUCCESS);
    }
  } catch (err) {
    console.error(`MockGuard Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(ExitCode.INTERNAL_ERROR);
  }
}

// Check if running directly as script
const isMain =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
    process.argv[1].endsWith('dist/cli/index.js') ||
    process.argv[1].endsWith('dist\\cli\\index.js'));

if (isMain) {
  main().catch((err) => {
    console.error('Fatal unhandled error:', err);
    process.exit(ExitCode.INTERNAL_ERROR);
  });
}
