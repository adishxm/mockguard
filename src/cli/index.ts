#!/usr/bin/env node

import fs from 'node:fs';
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
    // -------------------------------------------------------------
    // COMMAND: compare
    // -------------------------------------------------------------
    if (options.command === 'compare') {
      const { GitComparator } = await import('../platform/git-comparator.js');
      const { PipelineOrchestrator } = await import('../platform/pipeline-orchestrator.js');

      const compareReport = await GitComparator.compare(
        {
          baseRef: options.baseRef!,
          targetPath: options.targetPath,
          configPath: options.configPath,
          format: options.format,
          outFile: options.outFile,
          timeoutMs: options.timeoutMs,
          maxOutputBytes: options.maxOutputBytes,
          maxMutants: options.maxMutants,
          concurrency: options.concurrency,
          bail: options.bail,
          testMatch: options.testMatch,
        },
        async (dir) => {
          return PipelineOrchestrator.verify(
            {
              ...options,
              targetPath: dir,
            },
            new RunDirectoryManager()
          );
        }
      );

      if (options.outFile) {
        ReportBuilder.writeJson(compareReport, options.outFile);
      }

      if (options.format === 'json' && !options.outFile) {
        console.log(JSON.stringify(compareReport, null, 2));
      } else {
        console.log(GitComparator.renderTerminal(compareReport));
      }

      if (
        compareReport.currentVerdict === 'FAIL' ||
        (compareReport.currentReport?.mutation &&
          compareReport.currentReport.mutation.survived > 0)
      ) {
        process.exit(ExitCode.FINDINGS_DETECTED);
      } else {
        process.exit(ExitCode.SUCCESS);
      }
      return;
    }

    // -------------------------------------------------------------
    // COMMAND: baseline
    // -------------------------------------------------------------
    if (options.command === 'baseline') {
      const project = ProjectDiscovery.discover(
        options.targetPath,
        options.configPath
      );

      const testCommand = ConfigResolver.resolve(project, {
        testMatch: options.testMatch,
        testNamePattern: options.testNamePattern,
        changed: options.changed,
        bail: options.bail,
      });

      const runner = new BaselineRunner();
      const baseline = await runner.run(testCommand, {
        timeoutMs: options.timeoutMs,
        maxOutputBytes: options.maxOutputBytes,
      });

      if (baseline.stdout) {
        baseline.stdout = SecretRedactor.redact(baseline.stdout);
      }
      if (baseline.stderr) {
        baseline.stderr = SecretRedactor.redact(baseline.stderr);
      }

      runManager.saveArtifact('baseline.stdout.log', baseline.stdout || '');
      runManager.saveArtifact('baseline.stderr.log', baseline.stderr || '');

      const report = ReportBuilder.build({
        project,
        command: testCommand,
        baseline,
        runId: runManager.getRunId(),
      });

      if (options.outFile) {
        ReportBuilder.writeJson(report, options.outFile);
      }

      if (options.format === 'json' && !options.outFile) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(ReportBuilder.renderTerminal(report));
      }

      if (baseline.status === 'TIMEOUT') {
        process.exit(ExitCode.TIMEOUT);
      } else if (baseline.status !== 'PASS') {
        process.exit(ExitCode.BASELINE_FAILED);
      } else {
        process.exit(ExitCode.SUCCESS);
      }
      return;
    }

    // -------------------------------------------------------------
    // COMMAND: verify (default)
    // -------------------------------------------------------------
    const { PipelineOrchestrator } = await import('../platform/pipeline-orchestrator.js');
    const report = await PipelineOrchestrator.verify(
      {
        targetPath: options.targetPath,
        configPath: options.configPath,
        testMatch: options.testMatch,
        testNamePattern: options.testNamePattern,
        timeoutMs: options.timeoutMs,
        maxOutputBytes: options.maxOutputBytes,
        maxMutants: options.maxMutants,
        concurrency: options.concurrency,
        bail: options.bail,
        changed: options.changed,
        include: options.include,
        exclude: options.exclude,
      },
      runManager
    );

    if (options.outFile) {
      ReportBuilder.writeJson(report, options.outFile);
    }

    if (options.format === 'json' && !options.outFile) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(ReportBuilder.renderTerminal(report));
    }

    if (report.baseline.status === 'TIMEOUT') {
      process.exit(ExitCode.TIMEOUT);
    } else if (report.baseline.status !== 'PASS') {
      process.exit(ExitCode.BASELINE_FAILED);
    } else if (
      report.verdict === 'FAIL' ||
      (report.mutation && report.mutation.survived > 0)
    ) {
      process.exit(ExitCode.FINDINGS_DETECTED);
    } else {
      process.exit(ExitCode.SUCCESS);
    }
  } catch (err) {
    console.error(`MockGuard Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(ExitCode.INTERNAL_ERROR);
  }
}

function checkIsMain(): boolean {
  if (!process.argv[1]) return false;
  try {
    const currentPath = fileURLToPath(import.meta.url);
    if (currentPath === process.argv[1]) return true;
    const normalizedArgv = process.argv[1].replace(/\\/g, '/');
    if (normalizedArgv.endsWith('cli/index.js')) return true;
    const realCurrent = fs.realpathSync(currentPath).toLowerCase();
    const realArgv = fs.realpathSync(process.argv[1]).toLowerCase();
    return realCurrent === realArgv;
  } catch {
    return false;
  }
}

const isMain = checkIsMain();

if (isMain) {
  main().catch((err) => {
    console.error('Fatal unhandled error:', err);
    process.exit(ExitCode.INTERNAL_ERROR);
  });
}
