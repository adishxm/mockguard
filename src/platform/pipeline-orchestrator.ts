import path from 'node:path';
import fs from 'node:fs';
import { ProjectDiscovery, DiscoveredProject } from './project-discovery.js';
import { ConfigResolver } from './config-resolver.js';
import { BaselineRunner } from './baseline-runner.js';
import { ReportBuilder } from '../reports/report-builder.js';
import { RunDirectoryManager } from '../artifacts/run-directory.js';
import { SecretRedactor } from '../artifacts/secret-redactor.js';
import { MockGuardReport, Finding } from '../contracts/report.js';
import { AstMutationAdapter } from '../mutation/ast-mutation-adapter.js';
import { MutationOrchestrator, OrchestrationSummary } from '../mutation/orchestrator.js';
import { TypeScriptProjectLoader } from '../analysis/project-loader.js';
import { JestTestAnalyzer } from '../analysis/jest-test-analyzer.js';
import { AnalysisRuleEngine } from '../analysis/rules/rule-engine.js';

export interface PipelineOptions {
  targetPath: string;
  configPath?: string;
  testMatch?: string;
  testNamePattern?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  maxMutants?: number;
  concurrency?: number;
  bail?: boolean;
  changed?: boolean;
  include?: string;
  exclude?: string;
}

export class PipelineOrchestrator {
  public static async verify(
    options: PipelineOptions,
    runManager: RunDirectoryManager = new RunDirectoryManager()
  ): Promise<MockGuardReport> {
    runManager.init();

    // 1. Discover Project
    const project = ProjectDiscovery.discover(
      options.targetPath,
      options.configPath
    );

    // 2. Resolve Test Command
    const testCommand = ConfigResolver.resolve(project, {
      testMatch: options.testMatch,
      testNamePattern: options.testNamePattern,
      changed: options.changed,
      bail: options.bail,
    });

    // 3. Execute Baseline
    const runner = new BaselineRunner();
    const baseline = await runner.run(testCommand, {
      timeoutMs: options.timeoutMs ?? 60_000,
      maxOutputBytes: options.maxOutputBytes ?? 10 * 1024 * 1024,
    });

    // Redact secret leaks from baseline stdout/stderr
    if (baseline.stdout) baseline.stdout = SecretRedactor.redact(baseline.stdout);
    if (baseline.stderr) baseline.stderr = SecretRedactor.redact(baseline.stderr);

    runManager.saveArtifact('baseline.stdout.log', baseline.stdout || '');
    runManager.saveArtifact('baseline.stderr.log', baseline.stderr || '');

    // CRITICAL INVARIANT: If baseline test suite failed, abort mutation immediately.
    // Mutation score is null.
    if (baseline.status !== 'PASS') {
      return ReportBuilder.build({
        project,
        command: testCommand,
        baseline,
        runId: runManager.getRunId(),
      });
    }

    // 4. Static Analysis on Test Files
    const findings = this.runStaticAnalysis(project, options.testMatch);

    // 5. Select Production Source Files
    const sourceFiles = this.discoverSourceFiles(
      project.projectRoot,
      options.include,
      options.exclude
    );

    // 6. Generate and Execute Mutants
    const mutationAdapter = new AstMutationAdapter();
    const mutants = await mutationAdapter.generateMutants(sourceFiles, {
      maxMutants: options.maxMutants ?? 20,
      projectRoot: project.projectRoot,
    });

    let mutationSummary: OrchestrationSummary | undefined;
    if (mutants.length > 0) {
      const orchestrator = new MutationOrchestrator();
      const rawTestCommand = [testCommand.executable, ...testCommand.args];

      mutationSummary = await orchestrator.orchestrate(
        mutationAdapter,
        mutants,
        rawTestCommand,
        {
          perMutantTimeoutMs: Math.min(15_000, options.timeoutMs ?? 15_000),
          totalTimeoutMs: options.timeoutMs ?? 120_000,
          concurrency: options.concurrency ?? 1,
          bail: options.bail ?? false,
        }
      );
    }

    // 7. Assemble Complete Report
    return ReportBuilder.build({
      project,
      command: testCommand,
      baseline,
      mutation: mutationSummary,
      findings,
      runId: runManager.getRunId(),
    });
  }

  private static runStaticAnalysis(
    project: DiscoveredProject,
    testMatchGlob?: string
  ): Finding[] {
    const findings: Finding[] = [];

    // Check if tsconfig exists
    const tsconfigPath = path.join(project.projectRoot, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      return findings;
    }

    try {
      const context = TypeScriptProjectLoader.load(tsconfigPath);
      const testAnalyzer = new JestTestAnalyzer(context.checker, project.projectRoot, context.program);
      const ruleEngine = new AnalysisRuleEngine();

      const testFiles = this.findTestFiles(project.projectRoot, testMatchGlob);
      for (const testFile of testFiles) {
        const sourceFile = context.program.getSourceFile(testFile);
        if (!sourceFile) continue;

        const analysis = testAnalyzer.analyzeSourceFile(sourceFile);
        const result = ruleEngine.analyze(analysis);

        for (const f of result.findings) {
          const primaryLoc = f.locations && f.locations.length > 0 ? f.locations[0] : undefined;
          findings.push({
            id: f.id,
            kind: f.kind,
            severity: f.confidence === 'unverified' ? 'info' : f.confidence,
            message: f.message,
            file: primaryLoc ? path.relative(project.projectRoot, primaryLoc.filePath) : undefined,
            line: primaryLoc?.span.startLine,
            column: primaryLoc?.span.startColumn,
            snippet: f.evidence && f.evidence.length > 0 ? f.evidence[0] : undefined,
          });
        }
      }
    } catch {
      // Non-fatal if TypeScript analysis cannot parse specific project variant
    }

    return findings;
  }

  private static discoverSourceFiles(
    projectRoot: string,
    includePattern?: string,
    excludePattern?: string
  ): string[] {
    const results: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === '.git' ||
            entry.name === '.mockguard' ||
            entry.name === 'coverage'
          ) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          const name = entry.name;
          if (
            (name.endsWith('.ts') || name.endsWith('.js')) &&
            !name.includes('.test.') &&
            !name.includes('.spec.') &&
            !name.endsWith('.d.ts')
          ) {
            const rel = path.relative(projectRoot, fullPath);
            if (includePattern && !rel.includes(includePattern.replace(/\*/g, ''))) {
              continue;
            }
            if (excludePattern && rel.includes(excludePattern.replace(/\*/g, ''))) {
              continue;
            }
            results.push(fullPath);
          }
        }
      }
    };

    walk(projectRoot);
    return results;
  }

  private static findTestFiles(
    projectRoot: string,
    testMatchGlob?: string
  ): string[] {
    const results: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === '.git' ||
            entry.name === '.mockguard'
          ) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          const name = entry.name;
          if (
            (name.includes('.test.') || name.includes('.spec.')) &&
            (name.endsWith('.ts') || name.endsWith('.js'))
          ) {
            if (testMatchGlob) {
              const filterClean = testMatchGlob.replace(/\*/g, '');
              if (!fullPath.includes(filterClean)) {
                continue;
              }
            }
            results.push(fullPath);
          }
        }
      }
    };

    walk(projectRoot);
    return results;
  }
}
