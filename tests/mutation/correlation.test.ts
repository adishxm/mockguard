import test from 'node:test';
import assert from 'node:assert';
import {
  MutationCorrelationEngine,
} from '../../src/mutation/correlation-engine.js';
import { Finding } from '../../src/analysis/rules/types.js';
import { DiscoveredTestBlock } from '../../src/analysis/model.js';
import { NormalizedMutantRecord } from '../../src/mutation/stryker-normalizer.js';

function createMockBlock(id: string, name: string, file = 'tests/order.test.ts'): DiscoveredTestBlock {
  return {
    id,
    name,
    kind: 'it',
    location: {
      filePath: file,
      span: { startLine: 10, startColumn: 1, endLine: 25, endColumn: 5 },
    },
    invocations: [],
    mockCalls: [],
    assertions: [],
  };
}

function createMockFinding(findingId: string, blockId: string): Finding {
  return {
    id: `${findingId}:${blockId}`,
    kind: 'CALL_ONLY_ASSERTION',
    confidence: 'medium',
    message: 'Test contains only positive interaction assertions.',
    locations: [
      {
        filePath: 'tests/order.test.ts',
        span: { startLine: 15, startColumn: 5, endLine: 15, endColumn: 30 },
      },
    ],
    evidence: ['expect(mock).toHaveBeenCalled()'],
  };
}

test('1. P4 Per-Test Evidence: Treats killedBy as test-failure attribution with cause UNKNOWN', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:checkout:10', 'checks out order');
  const mutant: NormalizedMutantRecord = {
    id: 'm-1',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 12,
    startColumn: 5,
    outcome: 'KILLED',
    coveredBy: ['it:checkout:10'],
    killedBy: ['it:checkout:10'],
  };

  const result = engine.correlate([], [mutant], [block], {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const evidence = result.perTestEvidence.get(block.id);
  assert.ok(evidence, 'Must generate per-test evidence for mapped block');
  assert.deepStrictEqual(evidence.coveredMutantIds, ['m-1']);
  assert.deepStrictEqual(evidence.killedMutantIds, ['m-1']);
  assert.strictEqual(evidence.killAttribution.length, 1);
  assert.strictEqual(
    evidence.killAttribution[0].cause,
    'UNKNOWN',
    'Kill cause must remain UNKNOWN without validated classification'
  );
});

test('2. P4 Guardrail: Abstains when test ID cannot be mapped to any discovered block', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:other-test:50', 'other test');
  const finding = createMockFinding('f-1', block.id);
  const mutant: NormalizedMutantRecord = {
    id: 'm-survivor',
    file: 'src/order-service.ts',
    operator: 'EqualityOperator',
    replacement: '!==',
    startLine: 14,
    startColumn: 1,
    outcome: 'SURVIVED',
    coveredBy: ['unmapped-stryker-id'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [mutant], [block], {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const missingIdAbstention = result.abstentions.find(a => a.reason === 'MISSING_TEST_ID');
  assert.ok(missingIdAbstention, 'Must abstain due to missing test ID');
});

test('3. P4 Guardrail: Abstains when test ID mapping is ambiguous (never guesses)', () => {
  const engine = new MutationCorrelationEngine();
  // Two blocks sharing the same name in different describe blocks
  const blockA = createMockBlock('it:shared:10', 'handles edge case', 'tests/a.test.ts');
  const blockB = createMockBlock('it:shared:30', 'handles edge case', 'tests/b.test.ts');
  const mutant: NormalizedMutantRecord = {
    id: 'm-survivor',
    file: 'src/order-service.ts',
    operator: 'EqualityOperator',
    replacement: '!==',
    startLine: 14,
    startColumn: 1,
    outcome: 'SURVIVED',
    coveredBy: ['handles edge case'],
    killedBy: [],
  };

  const result = engine.correlate([], [mutant], [blockA, blockB], {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const ambiguousAbstention = result.abstentions.find(a => a.reason === 'AMBIGUOUS_TEST_ID');
  assert.ok(ambiguousAbstention, 'Must abstain on ambiguous test ID mapping');
  assert.ok(ambiguousAbstention.details.includes('ambiguously matches 2 test blocks'));
  assert.strictEqual(result.perTestEvidence.size, 0, 'Must not register evidence for ambiguous mapping');
});

test('4. P4 Guardrail: Abstains when mutant file does not match canonical SUT path', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:checkout:10', 'checks out order');
  const finding = createMockFinding('f-1', block.id);
  const mutantOnUnrelatedFile: NormalizedMutantRecord = {
    id: 'm-unrelated',
    file: 'src/unrelated-helper.ts', // NOT the canonical SUT path
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 5,
    startColumn: 1,
    outcome: 'SURVIVED',
    coveredBy: ['it:checkout:10'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [mutantOnUnrelatedFile], [block], {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const sutMismatch = result.abstentions.find(a => a.reason === 'MISSING_SUT_PATH_MATCH');
  assert.ok(sutMismatch, 'Must abstain when mutant is not on the canonical SUT path');
});

test('5. P4 Guardrail: Abstains when mutant has NO_COVERAGE', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:checkout:10', 'checks out order');
  const finding = createMockFinding('f-1', block.id);
  const mutantNoCoverage: NormalizedMutantRecord = {
    id: 'm-no-cov',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 12,
    startColumn: 1,
    outcome: 'NO_COVERAGE',
    coveredBy: [],
    killedBy: [],
  };

  const result = engine.correlate(
    [finding],
    [mutantNoCoverage],
    [block],
    {
      canonicalFilePath: 'src/order-service.ts',
      canonicalSymbolName: 'checkout',
    },
    {
      testIdMapping: { 'test-1': block.id },
    }
  );

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const noCov = result.abstentions.find(a => a.reason === 'NO_COVERAGE');
  assert.ok(noCov, 'Must abstain on NO_COVERAGE mutant');
});

test('6. P4 Corroboration: Emits corroborating evidence without raising confidence or claiming PROVEN/VACUOUS', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:checkout:10', 'checks out order');
  const finding = createMockFinding('f-1', block.id);
  const survivingMutant: NormalizedMutantRecord = {
    id: 'm-survivor-1',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 18,
    startColumn: 5,
    outcome: 'SURVIVED',
    coveredBy: ['it:checkout:10'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [survivingMutant], [block], {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  assert.strictEqual(result.corroboratingMatches.length, 1);
  const match = result.corroboratingMatches[0];
  assert.strictEqual(match.relationship, 'CORROBORATING_SURVIVOR');
  assert.strictEqual(match.findingId, finding.id);
  assert.strictEqual(match.mutantId, 'm-survivor-1');

  // INVARIANTS:
  // 1. Finding confidence must remain unchanged (not raised)
  assert.strictEqual(finding.confidence, 'medium', 'Static finding confidence must NOT be raised');

  // 2. Prohibited verdict claims must not appear anywhere
  const matchStr = JSON.stringify(match);
  assert.ok(!matchStr.includes('PROVEN'), 'Must never emit PROVEN claim');
  assert.ok(!matchStr.includes('REDUNDANT'), 'Must never emit REDUNDANT claim');
  assert.ok(!matchStr.includes('VACUOUS'), 'Must never emit VACUOUS claim');
});
