import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeStrykerReport,
  mapStrykerStatus,
  StrykerReport,
} from '../../src/mutation/stryker-normalizer.js';

test('1. P3 Normalizer: Preserves NO_COVERAGE versus SURVIVED distinctions', () => {
  const sampleReport: StrykerReport = {
    schemaVersion: '1',
    thresholds: { high: 80, low: 60 },
    files: {
      'src/order-service.ts': {
        language: 'typescript',
        mutants: [
          {
            id: 'm-1',
            mutatorName: 'ConditionalExpression',
            replacement: 'false',
            location: { start: { line: 10, column: 5 }, end: { line: 10, column: 15 } },
            status: 'Survived',
            coveredBy: ['test-1'],
          },
          {
            id: 'm-2',
            mutatorName: 'EqualityOperator',
            replacement: '!==',
            location: { start: { line: 20, column: 5 }, end: { line: 20, column: 8 } },
            status: 'NoCoverage',
            coveredBy: [],
          },
          {
            id: 'm-3',
            mutatorName: 'BlockStatement',
            replacement: '{}',
            location: { start: { line: 30, column: 1 } },
            status: 'Killed',
            coveredBy: ['test-1', 'test-2'],
            killedBy: ['test-2'],
          },
        ],
      },
    },
  };

  const result = normalizeStrykerReport(sampleReport);
  assert.strictEqual(result.status, 'SUCCESS');
  if (result.status === 'SUCCESS') {
    assert.strictEqual(result.mutants.length, 3);

    const m1 = result.mutants.find(m => m.id === 'm-1')!;
    assert.strictEqual(m1.outcome, 'SURVIVED', 'Survived status must normalize to SURVIVED');
    assert.deepStrictEqual(m1.coveredBy, ['test-1']);

    const m2 = result.mutants.find(m => m.id === 'm-2')!;
    assert.strictEqual(m2.outcome, 'NO_COVERAGE', 'NoCoverage must strictly normalize to NO_COVERAGE, not SURVIVED');
    assert.deepStrictEqual(m2.coveredBy, []);

    const m3 = result.mutants.find(m => m.id === 'm-3')!;
    assert.strictEqual(m3.outcome, 'KILLED', 'Killed status must normalize to KILLED');
    assert.deepStrictEqual(m3.killedBy, ['test-2']);

    assert.strictEqual(result.counts.SURVIVED, 1);
    assert.strictEqual(result.counts.NO_COVERAGE, 1);
    assert.strictEqual(result.counts.KILLED, 1);
  }
});

test('2. P3 Normalizer: Normalizes all valid Stryker outcomes correctly', () => {
  assert.strictEqual(mapStrykerStatus('Killed'), 'KILLED');
  assert.strictEqual(mapStrykerStatus('Survived'), 'SURVIVED');
  assert.strictEqual(mapStrykerStatus('NoCoverage'), 'NO_COVERAGE');
  assert.strictEqual(mapStrykerStatus('Timeout'), 'TIMEOUT');
  assert.strictEqual(mapStrykerStatus('CompileError'), 'COMPILE_ERROR');
  assert.strictEqual(mapStrykerStatus('RuntimeError'), 'RUNTIME_ERROR');
  assert.strictEqual(mapStrykerStatus('Ignored'), 'IGNORED');
  assert.strictEqual(mapStrykerStatus('Pending'), 'PENDING');
  assert.strictEqual(mapStrykerStatus('UnknownStatus123'), 'UNSUPPORTED');
  assert.strictEqual(mapStrykerStatus(undefined), 'UNSUPPORTED');
});

test('3. P3 Normalizer: Rejects malformed or non-Stryker inputs with clear reason', () => {
  // Null or primitive
  assert.strictEqual(normalizeStrykerReport(null).status, 'REJECTED');
  assert.strictEqual(normalizeStrykerReport('not an object').status, 'REJECTED');

  // Missing schemaVersion
  const noSchema = { files: {} };
  const resNoSchema = normalizeStrykerReport(noSchema);
  assert.strictEqual(resNoSchema.status, 'REJECTED');
  if (resNoSchema.status === 'REJECTED') {
    assert.ok(resNoSchema.reason.includes('schemaVersion'));
  }

  // Missing files map
  const noFiles = { schemaVersion: '1' };
  const resNoFiles = normalizeStrykerReport(noFiles);
  assert.strictEqual(resNoFiles.status, 'REJECTED');
  if (resNoFiles.status === 'REJECTED') {
    assert.ok(resNoFiles.reason.includes('files'));
  }
});
