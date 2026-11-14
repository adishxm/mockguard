import test from 'node:test';
import assert from 'node:assert';
import { MutationOrchestrator } from '../../src/mutation/orchestrator.js';
import {
  MutantDefinition,
  MutantExecutionResult,
  MutationAdapter,
} from '../../src/mutation/adapter.js';

test('Worker 02: Concurrency defaults to 1 and preserves order', async () => {
  let activeWorkers = 0;
  let maxObserved = 0;

  const adapter: MutationAdapter = {
    name: 'default-adapter',
    async generateMutants() {
      return [];
    },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      activeWorkers++;
      maxObserved = Math.max(maxObserved, activeWorkers);
      await new Promise((r) => setTimeout(r, 20));
      activeWorkers--;
      return { mutantId: m.id, outcome: 'KILLED', durationMs: 20 };
    },
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-1', file: 'a.ts', line: 1, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-2', file: 'a.ts', line: 2, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-3', file: 'a.ts', line: 3, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  const summary = await orchestrator.orchestrate(adapter, mutants, ['test']);

  assert.strictEqual(maxObserved, 1, 'Default concurrency must strictly be 1');
  assert.strictEqual(summary.killed, 3);
  assert.strictEqual(summary.score, 100);
  assert.strictEqual(summary.runVerdict, 'COMPLETED');
});

test('Worker 02: StrykerJS concurrency delegation forces single coordinator', async () => {
  let activeWorkers = 0;
  let maxObserved = 0;

  const strykerAdapter: MutationAdapter = {
    name: 'StrykerJS-Adapter',
    async generateMutants() {
      return [];
    },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      activeWorkers++;
      maxObserved = Math.max(maxObserved, activeWorkers);
      await new Promise((r) => setTimeout(r, 20));
      activeWorkers--;
      return { mutantId: m.id, outcome: 'KILLED', durationMs: 20 };
    },
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-1', file: 'a.ts', line: 1, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-2', file: 'a.ts', line: 2, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  // Even if caller requests concurrency: 4, Stryker adapter delegation forces 1
  const summary = await orchestrator.orchestrate(strykerAdapter, mutants, ['test'], {
    concurrency: 4,
    delegateConcurrency: true,
  });

  assert.strictEqual(maxObserved, 1, 'Stryker delegation must force single orchestrator coordinator');
  assert.strictEqual(summary.killed, 2);
});

test('Worker 02: Unexpected adapter exceptions map to RUNTIME_ERROR', async () => {
  const crashAdapter: MutationAdapter = {
    name: 'crash-adapter',
    async generateMutants() {
      return [];
    },
    async testMutant(): Promise<MutantExecutionResult> {
      throw new Error('Process lock contention: EBUSY');
    },
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-crash', file: 'a.ts', line: 1, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  const summary = await orchestrator.orchestrate(crashAdapter, mutants, ['test']);

  assert.strictEqual(summary.runtimeErrors, 1);
  assert.strictEqual(summary.results[0].outcome, 'RUNTIME_ERROR');
  assert.ok(summary.results[0].stderr?.includes('EBUSY'));
  assert.strictEqual(summary.score, null, 'Score must be null when zero evaluated test mutants');
});

test('Worker 02: Extended status model (NO_COVERAGE, IGNORED, RUNTIME_ERROR)', async () => {
  const multiStatusAdapter: MutationAdapter = {
    name: 'multi-status-adapter',
    async generateMutants() {
      return [];
    },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      if (m.id === 'm-killed') {
        return { mutantId: m.id, outcome: 'KILLED', durationMs: 10, killedBy: ['order.test.ts'] };
      }
      if (m.id === 'm-nocov') {
        return { mutantId: m.id, outcome: 'NO_COVERAGE', durationMs: 5, testsRan: [] };
      }
      if (m.id === 'm-ignored') {
        return { mutantId: m.id, outcome: 'IGNORED', durationMs: 0 };
      }
      return { mutantId: m.id, outcome: 'RUNTIME_ERROR', durationMs: 0 };
    },
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-killed', file: 'a.ts', line: 1, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-nocov', file: 'a.ts', line: 2, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-ignored', file: 'a.ts', line: 3, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-error', file: 'a.ts', line: 4, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  const summary = await orchestrator.orchestrate(multiStatusAdapter, mutants, ['test']);

  assert.strictEqual(summary.killed, 1);
  assert.strictEqual(summary.noCoverage, 1);
  assert.strictEqual(summary.ignored, 1);
  assert.strictEqual(summary.runtimeErrors, 1);
  // Valid mutants should exclude IGNORED mutants (4 total - 1 ignored = 3 valid)
  assert.strictEqual(summary.valid, 3);
  // Score = killed / (killed + survived + noCoverage) = 1 / (1 + 0 + 1) = 50.0%
  assert.strictEqual(summary.score, 50);

  // Attribution verification
  assert.deepStrictEqual(summary.results[0].killedBy, ['order.test.ts']);
  assert.deepStrictEqual(summary.results[1].testsRan, []);
});

test('Worker 02: Timeout distinguishes interrupted CANCELLED from unstarted PENDING', async () => {
  const slowAdapter: MutationAdapter = {
    name: 'slow-adapter',
    async generateMutants() {
      return [];
    },
    async testMutant(m: MutantDefinition): Promise<MutantExecutionResult> {
      await new Promise((r) => setTimeout(r, 200));
      return { mutantId: m.id, outcome: 'KILLED', durationMs: 200 };
    },
  };

  const mutants: MutantDefinition[] = [
    { id: 'm-1', file: 'a.ts', line: 1, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-2', file: 'a.ts', line: 2, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
    { id: 'm-3', file: 'a.ts', line: 3, column: 1, originalText: '1', mutatedText: '2', operator: 'op' },
  ];

  const orchestrator = new MutationOrchestrator();
  const summary = await orchestrator.orchestrate(slowAdapter, mutants, ['test'], {
    totalTimeoutMs: 100, // Timeout triggers while m-1 is in-flight
    concurrency: 1,
  });

  assert.strictEqual(summary.runVerdict, 'TIMEOUT');
  assert.strictEqual(summary.cancelled, 1, 'In-flight mutant must be CANCELLED');
  assert.strictEqual(summary.pending, 2, 'Unstarted queued mutants must be PENDING');
  assert.strictEqual(summary.results[0].outcome, 'CANCELLED');
  assert.strictEqual(summary.results[1].outcome, 'PENDING');
  assert.strictEqual(summary.results[2].outcome, 'PENDING');
  assert.strictEqual(summary.score, null, 'Unexecuted and cancelled mutants excluded from score denominator');
});
