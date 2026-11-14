import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

import { parseCliArgs, DEFAULT_CLI_OPTIONS } from '../../src/cli/args.js';
import { ProjectDiscovery } from '../../src/platform/project-discovery.js';
import { ConfigResolver } from '../../src/platform/config-resolver.js';
import { BoundedProcessSupervisor } from '../../src/platform/process-supervisor.js';
import { BaselineRunner } from '../../src/platform/baseline-runner.js';
import { SecretRedactor } from '../../src/artifacts/secret-redactor.js';
import { RunDirectoryManager } from '../../src/artifacts/run-directory.js';
import { MutationOrchestrator } from '../../src/mutation/orchestrator.js';
import { MutationAdapter, MutantDefinition, MutantExecutionResult } from '../../src/mutation/adapter.js';
import { ReportBuilder } from '../../src/reports/report-builder.js';

test('1. Clean project initialization', () => {
  assert.strictEqual(DEFAULT_CLI_OPTIONS.command, 'verify');
  assert.strictEqual(DEFAULT_CLI_OPTIONS.format, 'terminal');
  assert.strictEqual(DEFAULT_CLI_OPTIONS.timeoutMs, 60000);
});

test('2. CLI argument validation', () => {
  const parsed = parseCliArgs(['verify', './my-app', '--format', 'json', '--timeout', '5000', '--bail']);
  assert.strictEqual(parsed.command, 'verify');
  assert.strictEqual(parsed.format, 'json');
  assert.strictEqual(parsed.timeoutMs, 5000);
  assert.strictEqual(parsed.bail, true);

  assert.throws(() => parseCliArgs(['--format', 'invalid']), /Invalid format/);
  assert.throws(() => parseCliArgs(['--timeout', 'abc']), /positive integer/);
});

test('3. Missing Jest configuration handled properly', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-missing-'));
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-pkg' }));

  const discovered = ProjectDiscovery.discover(tempDir);
  assert.strictEqual(discovered.hasPackageJson, true);
  assert.strictEqual(discovered.jestConfigPath, undefined);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('4. Explicit Jest configuration discovered', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-explicit-'));
  const configPath = path.join(tempDir, 'custom.jest.json');
  fs.writeFileSync(configPath, JSON.stringify({ testEnvironment: 'node' }));

  const discovered = ProjectDiscovery.discover(tempDir, configPath);
  assert.strictEqual(discovered.jestConfigPath, configPath);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('5. Malformed configuration throws readable error', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-malformed-'));
  fs.writeFileSync(path.join(tempDir, 'package.json'), 'NOT_VALID_JSON{');

  assert.throws(() => ProjectDiscovery.discover(tempDir), /Malformed package.json/);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('6. Multiple Jest projects / Monorepo detected', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-mono-'));
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
    name: 'root-monorepo',
    workspaces: ['packages/*']
  }));

  const discovered = ProjectDiscovery.discover(tempDir);
  assert.strictEqual(discovered.isMonorepo, true);
  assert.deepStrictEqual(discovered.monorepoProjects, ['packages/*']);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('7. Successful baseline execution', async () => {
  const supervisor = new BoundedProcessSupervisor();
  // Using node -e as reliable cross-platform test runner mock
  const runner = new BaselineRunner(supervisor);

  const command = {
    executable: process.execPath,
    args: ['-e', 'console.log("Tests: 5 passed, 5 total"); process.exit(0);'],
    cwd: process.cwd(),
    isCustomScript: false
  };

  const res = await runner.run(command);
  assert.strictEqual(res.status, 'PASS');
  assert.strictEqual(res.testsPassed, 5);
  assert.strictEqual(res.testsTotal, 5);
});

test('8. Failed baseline execution', async () => {
  const runner = new BaselineRunner();
  const command = {
    executable: process.execPath,
    args: ['-e', 'console.error("Tests: 1 failed, 2 passed, 3 total"); process.exit(1);'],
    cwd: process.cwd(),
    isCustomScript: false
  };

  const res = await runner.run(command);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.testsPassed, 2);
  assert.strictEqual(res.testsTotal, 3);
});

test('9. Process timeout handled and classified', async () => {
  const supervisor = new BoundedProcessSupervisor();
  const res = await supervisor.execute(process.execPath, ['-e', 'setTimeout(() => {}, 10000);'], {
    timeoutMs: 300
  });

  assert.strictEqual(res.timedOut, true);
});

test('10. Process cancellation', async () => {
  const supervisor = new BoundedProcessSupervisor();
  setTimeout(() => {
    supervisor.cancel();
  }, 100);

  const res = await supervisor.execute(process.execPath, ['-e', 'setTimeout(() => {}, 10000);'], {
    timeoutMs: 5000
  });

  assert.strictEqual(res.cancelled, true);
});

test('11. Missing executable error handled', async () => {
  const supervisor = new BoundedProcessSupervisor();
  const res = await supervisor.execute('non_existent_executable_12345', []);
  assert.ok(res.error);
});

test('12. Combined Output-size limit enforced', async () => {
  const supervisor = new BoundedProcessSupervisor();
  // Generate 50KB stdout and 50KB stderr, capped at total 1024 bytes
  const res = await supervisor.execute(process.execPath, [
    '-e',
    'console.log("A".repeat(50000)); console.error("B".repeat(50000));'
  ], {
    maxOutputBytes: 1024
  });

  assert.strictEqual(res.outputTruncated, true);
  const totalLength = res.stdout.length + res.stderr.length;
  assert.ok(totalLength <= 1024);
});

test('13. Child-process cleanup on cancellation', async () => {
  const supervisor = new BoundedProcessSupervisor();
  setTimeout(() => supervisor.cancel(), 150);
  const res = await supervisor.execute(process.execPath, ['-e', 'setInterval(() => {}, 100);']);
  assert.strictEqual(res.cancelled, true);
});

test('14. Mutation adapter KILLED outcome', async () => {
  const mockAdapter: MutationAdapter = {
    name: 'test-adapter',
    async generateMutants() { return []; },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      return { mutantId: m.id, outcome: 'KILLED', durationMs: 50 };
    }
  };

  const orchestrator = new MutationOrchestrator();
  const mutant: MutantDefinition = {
    id: 'm-1', file: 'order.ts', line: 10, column: 5, originalText: '>', mutatedText: '>=', operator: 'Binary'
  };

  const summary = await orchestrator.orchestrate(mockAdapter, [mutant], ['test']);
  assert.strictEqual(summary.killed, 1);
  assert.strictEqual(summary.score, 100);
});

test('15. Mutation adapter SURVIVED outcome', async () => {
  const mockAdapter: MutationAdapter = {
    name: 'test-adapter',
    async generateMutants() { return []; },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      return { mutantId: m.id, outcome: 'SURVIVED', durationMs: 50 };
    }
  };

  const orchestrator = new MutationOrchestrator();
  const mutant: MutantDefinition = {
    id: 'm-2', file: 'order.ts', line: 12, column: 5, originalText: 'true', mutatedText: 'false', operator: 'Boolean'
  };

  const summary = await orchestrator.orchestrate(mockAdapter, [mutant], ['test']);
  assert.strictEqual(summary.survived, 1);
  assert.strictEqual(summary.score, 0);
});

test('16. Mutation adapter TIMEOUT', async () => {
  const mockAdapter: MutationAdapter = {
    name: 'test-adapter',
    async generateMutants() { return []; },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      return { mutantId: m.id, outcome: 'TIMEOUT', durationMs: 2000 };
    }
  };

  const orchestrator = new MutationOrchestrator();
  const mutant: MutantDefinition = {
    id: 'm-3', file: 'order.ts', line: 14, column: 5, originalText: 'i++', mutatedText: '', operator: 'Loop'
  };

  const summary = await orchestrator.orchestrate(mockAdapter, [mutant], ['test']);
  assert.strictEqual(summary.timeouts, 1);
});

test('17. Compile error outcome', async () => {
  const mockAdapter: MutationAdapter = {
    name: 'test-adapter',
    async generateMutants() { return []; },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      return { mutantId: m.id, outcome: 'COMPILE_ERROR', durationMs: 20 };
    }
  };

  const orchestrator = new MutationOrchestrator();
  const mutant: MutantDefinition = {
    id: 'm-4', file: 'order.ts', line: 15, column: 5, originalText: 'const x = 1;', mutatedText: 'const x = ;', operator: 'Syntax'
  };

  const summary = await orchestrator.orchestrate(mockAdapter, [mutant], ['test']);
  assert.strictEqual(summary.compileErrors, 1);
});

test('18. JSON report schema validation', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-report-'));
  const project = ProjectDiscovery.discover(tempDir);
  const command = ConfigResolver.resolve(project);

  const report = ReportBuilder.build({
    project,
    command,
    baseline: { status: 'PASS', testsPassed: 10, testsTotal: 10, durationMs: 150 },
    mutation: {
      valid: 2, killed: 2, survived: 0, timeouts: 0, compileErrors: 0, cancelled: 0, unsupported: 0, score: 100, results: []
    }
  });

  assert.strictEqual(report.schemaVersion, 'mockguard.report.v1');
  assert.strictEqual(report.claims.sandboxed, false);
  assert.strictEqual(report.mutation.score, 100);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('19. Mutation score null when baseline fails (CRITICAL INVARIANT)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-score-null-'));
  const project = ProjectDiscovery.discover(tempDir);
  const command = ConfigResolver.resolve(project);

  const report = ReportBuilder.build({
    project,
    command,
    baseline: { status: 'FAIL', testsPassed: 8, testsTotal: 10, durationMs: 150 },
    mutation: {
      valid: 5, killed: 4, survived: 1, timeouts: 0, compileErrors: 0, cancelled: 0, unsupported: 0, score: 80, results: []
    }
  });

  assert.strictEqual(report.baseline.status, 'FAIL');
  assert.strictEqual(report.verdict, 'BASELINE_FAILED');
  assert.strictEqual(report.mutation.score, null, 'Score must be null when baseline fails');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('20. Secret redaction and artifact path containment', () => {
  const secretText = 'Authorization token: ghp_1234567890abcdefghijklmnopqrstuvwxyz and AWS key AKIAIOSFODNN7EXAMPLE';
  const redacted = SecretRedactor.redact(secretText);

  assert.ok(!redacted.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyz'));
  assert.ok(!redacted.includes('AKIAIOSFODNN7EXAMPLE'));
  assert.ok(redacted.includes('[REDACTED_SECRET]'));

  const manager = new RunDirectoryManager();
  const filePath = manager.saveArtifact('../../traversal.log', 'safe content');
  assert.strictEqual(path.basename(filePath), 'traversal.log');
  assert.ok(filePath.startsWith(manager.getRunDir()));

  manager.cleanup();
});

test('21. Regression: Supervisor resets cancellation state between executions', async () => {
  const supervisor = new BoundedProcessSupervisor();
  // First run: trigger cancellation
  setTimeout(() => supervisor.cancel(), 50);
  const res1 = await supervisor.execute(process.execPath, ['-e', 'setTimeout(() => {}, 5000);']);
  assert.strictEqual(res1.cancelled, true);

  // Second run on same instance: should NOT be cancelled
  const res2 = await supervisor.execute(process.execPath, ['-e', 'console.log("OK");']);
  assert.strictEqual(res2.cancelled, false);
  assert.strictEqual(res2.exitCode, 0);
  assert.ok(res2.stdout.includes('OK'));
});

test('22. Regression: ReportBuilder captures git commit SHA', () => {
  const project = ProjectDiscovery.discover(process.cwd());
  const command = ConfigResolver.resolve(project);
  const report = ReportBuilder.build({
    project,
    command,
    baseline: { status: 'PASS', testsPassed: 1, testsTotal: 1 }
  });

  // Verify commit is a 40-character git SHA
  assert.ok(report.project.commit);
  assert.match(report.project.commit, /^[0-9a-f]{40}$/);
});

test('23. Regression: test-runner argument filtering strips Jest flags', async () => {
  const testRunnerPath = path.resolve('scripts/test-runner.js');
  const { filterTestRunnerArgs } = await import(`file://${testRunnerPath}`);

  const inputArgs = ['--ci', '--maxWorkers=2', '--bail', '--test-name-pattern', 'Clean project', '--unknown-flag', 'some-non-existent-file.js'];
  const filtered = filterTestRunnerArgs(inputArgs);

  // Jest flags must be stripped
  assert.ok(!filtered.includes('--ci'));
  assert.ok(!filtered.includes('--maxWorkers=2'));
  assert.ok(!filtered.includes('--bail'));
  assert.ok(!filtered.includes('--unknown-flag'));
  assert.ok(!filtered.includes('some-non-existent-file.js'));

  // Valid node test runner options preserved
  assert.ok(filtered.includes('--test-name-pattern'));
  assert.strictEqual(filtered[filtered.indexOf('--test-name-pattern') + 1], 'Clean project');
});

test('24. Regression: test-runner rejects zero compiled test files cleanly', async () => {
  const testRunnerPath = path.resolve('scripts/test-runner.js');
  const { findTestFiles } = await import(`file://${testRunnerPath}`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-zero-tests-'));
  const found = findTestFiles(tempDir);
  assert.strictEqual(found.length, 0);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('25. P4/P5: MutationOrchestrator bounded concurrency pool', async () => {
  let activeWorkers = 0;
  let maxObservedConcurrency = 0;

  const mockAdapter: MutationAdapter = {
    name: 'concurrency-adapter',
    async generateMutants() { return []; },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      activeWorkers++;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, activeWorkers);
      await new Promise(resolve => setTimeout(resolve, 50));
      activeWorkers--;
      return { mutantId: m.id, outcome: 'KILLED', durationMs: 50 };
    }
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-1', file: 'f.ts', line: 1, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
    { id: 'm-2', file: 'f.ts', line: 2, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
    { id: 'm-3', file: 'f.ts', line: 3, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
    { id: 'm-4', file: 'f.ts', line: 4, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  const summary = await orchestrator.orchestrate(mockAdapter, mutants, ['test'], {
    concurrency: 2
  });

  assert.strictEqual(summary.killed, 4);
  assert.ok(maxObservedConcurrency <= 2, `Expected concurrency <= 2, got ${maxObservedConcurrency}`);
});

test('26. P4/P5: MutationOrchestrator total execution timeout', async () => {
  const slowAdapter: MutationAdapter = {
    name: 'slow-adapter',
    async generateMutants() { return []; },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { mutantId: m.id, outcome: 'KILLED', durationMs: 300 };
    }
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-1', file: 'f.ts', line: 1, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
    { id: 'm-2', file: 'f.ts', line: 2, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
    { id: 'm-3', file: 'f.ts', line: 3, column: 1, originalText: 'a', mutatedText: 'b', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  const summary = await orchestrator.orchestrate(slowAdapter, mutants, ['test'], {
    totalTimeoutMs: 150, // Total timeout expires before all 3 finish
    concurrency: 1
  });

  assert.ok(summary.cancelled >= 1, 'Expected at least one cancelled mutant due to total timeout');
});

test('27. P5: ConfigResolver testNamePattern and changed flags', () => {
  const project = ProjectDiscovery.discover(process.cwd());
  const resolved = ConfigResolver.resolve(project, {
    testNamePattern: 'Payment.*',
    changed: true,
  });

  assert.ok(resolved.args.includes('--testNamePattern'));
  assert.ok(resolved.args.includes('Payment.*'));
  assert.ok(resolved.args.includes('--onlyChanged'));
});
