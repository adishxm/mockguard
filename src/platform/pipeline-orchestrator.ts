import path from 'node:path';
import fs from 'node:fs';
import { ProjectDiscovery, DiscoveredProject } from './project-discovery.js';
import { ConfigResolver } from './config-resolver.js';
import { BaselineRunner } from './baseline-runner.js';
import { ReportBuilder } from '../reports/report-builder.js';
import { RunDirectoryManager } from '../artifacts/run-directory.js';
import { SecretRedactor } from '../artifacts/secret-redactor.js';
import { MockGuardReport, Finding, GeminiAdvisorySection } from '../contracts/report.js';
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

    // 6.5. Compulsory Gemini Advisory Synthesis (Build with Gemini)
    // Automatically synthesize behavioral fixes when mock findings or surviving mutants exist
    let geminiAdvisory: GeminiAdvisorySection | undefined;
    if (findings.length > 0 || (mutationSummary && mutationSummary.survived > 0)) {
      geminiAdvisory = await this.synthesizeGeminiAdvisory({
        project,
        findings,
        mutationSummary,
        sourceFiles,
      });
    }

    // 7. Assemble Complete Report
    return ReportBuilder.build({
      project,
      command: testCommand,
      baseline,
      mutation: mutationSummary,
      findings,
      geminiAdvisory,
      runId: runManager.getRunId(),
    });
  }

  private static async synthesizeGeminiAdvisory(params: {
    project: DiscoveredProject;
    findings: Finding[];
    mutationSummary?: OrchestrationSummary;
    sourceFiles: string[];
  }): Promise<GeminiAdvisorySection> {
    const { project: _project, findings, mutationSummary, sourceFiles } = params;
    const apiKey = process.env.GEMINI_API_KEY;

    const survivingMutant = mutationSummary?.results.find((r) => r.outcome === 'SURVIVED');
    const primaryFinding = findings.length > 0 ? findings[0] : undefined;

    if (apiKey) {
      try {
        const { GoogleGeminiProvider } = await import('../../gemini_integration/gemini_provider.js');
        const provider = new GoogleGeminiProvider(apiKey);

        let sourceExcerpt = '';
        if (sourceFiles.length > 0 && fs.existsSync(sourceFiles[0])) {
          sourceExcerpt = fs.readFileSync(sourceFiles[0], 'utf-8').slice(0, 1500);
        }

        const response = await provider.generate({
          mode: 'suggest-assertion',
          testExcerpt: primaryFinding?.snippet || primaryFinding?.message || 'Weak AI mock test',
          sourceExcerpt,
          mutant: survivingMutant
            ? {
                id: survivingMutant.mutantId,
                status: 'SURVIVED',
                reason: 'Test asserts mock invocation only without asserting state or outcome',
              }
            : undefined,
          constraints: {
            maxInputBytes: 10000,
            maxOutputTokens: 1000,
            timeoutMs: 10000,
            allowSourceUpload: true,
          },
        });

        const content = response.content as any;
        return {
          status: 'ACTIVE',
          model: response.model,
          rootCause: content?.rootCause || content?.finding || 'Test asserts mock interaction rather than application state.',
          suggestedAssertion: content?.suggestedAssertion || content?.recommendation || 'Assert observable state and invariants.',
          remediationSnippet: content?.remediationCode || undefined,
          targetMutant: survivingMutant ? survivingMutant.mutantId : primaryFinding?.id,
          tokensConsumed: {
            prompt: response.usage?.inputTokens,
            candidates: response.usage?.outputTokens,
          },
        };
      } catch {
        // Fallback to deterministic offline advisory if network or API key fails
      }
    }

    // Deterministic Offline Advisory Engine (Build with Gemini Prompt Template)
    let rootCause = 'Test relies solely on mock interaction checks without asserting return values or state invariants.';
    let suggestedFix = 'Assert observable domain state postconditions (e.g. orderStatus === "CONFIRMED", fulfillmentEvent === true).';
    let remediation = [
      '// Suggested Gemini Behavioral Fix:',
      'const result = checkout("SUCCESS");',
      'expect(result.orderStatus).toBe("CONFIRMED");',
      'expect(result.fulfillmentEvent).toBe(true);',
    ].join('\n');

    if (primaryFinding?.kind === 'MOCKED_SUT') {
      rootCause = 'Test mocks the System Under Test (SUT) directly, testing the mock framework rather than implementation code.';
      suggestedFix = 'Do not mock the SUT class/function. Mock only boundary external dependencies (HTTP, database).';
    } else if (primaryFinding?.kind === 'CALL_ONLY_ASSERTION') {
      rootCause = 'Test only checks expect(mock).toHaveBeenCalled() without inspecting return values, state changes, or business side effects.';
      suggestedFix = 'Replace interaction checks with state assertions verifying the observable outcome of the operation.';
    }

    return {
      status: 'OFFLINE_FALLBACK',
      model: 'gemini-2.5-flash',
      targetMutant: survivingMutant ? survivingMutant.mutantId : primaryFinding?.id,
      rootCause: `${rootCause} (Set GEMINI_API_KEY to query Google AI Studio live)`,
      suggestedAssertion: suggestedFix,
      remediationSnippet: remediation,
    };
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
            !name.endsWith('.d.ts') &&
            name !== 'run-jest.js' &&
            !name.includes('jest.config') &&
            !name.includes('tsconfig')
          ) {
            const rel = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
            const cleanInc = includePattern ? includePattern.replace(/\\/g, '/').replace(/\*/g, '') : '';
            const cleanExc = excludePattern ? excludePattern.replace(/\\/g, '/').replace(/\*/g, '') : '';
            if (cleanInc && !rel.includes(cleanInc)) {
              continue;
            }
            if (cleanExc && rel.includes(cleanExc)) {
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
              const filterClean = testMatchGlob.replace(/\\/g, '/').replace(/\*/g, '');
              const normPath = fullPath.replace(/\\/g, '/');
              if (!normPath.includes(filterClean)) {
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
