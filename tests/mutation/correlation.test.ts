import test from 'node:test';
import assert from 'node:assert';
import {
  MutationCorrelationEngine,
} from '../../src/mutation/correlation-engine.js';
import { Finding } from '../../src/analysis/rules/types.js';
import { DiscoveredTestBlock } from '../../src/analysis/model.js';
import { NormalizedMutantRecord } from '../../src/mutation/stryker-normalizer.js';

function createMockBlock(
  id: string,
  name: string,
  file = 'tests/order.test.ts',
  invokesSut = true
): DiscoveredTestBlock {
  return {
    id,
    name,
    kind: 'it',
    location: {
      filePath: file,
      span: { startLine: 10, startColumn: 1, endLine: 25, endColumn: 5 },
    },
    invocations: invokesSut
      ? [
          {
            location: { filePath: file, span: { startLine: 12, startColumn: 5, endLine: 12, endColumn: 20 } },
            expressionText: 'orderService.checkout()',
            resolution: {
              status: 'resolved',
              importKind: 'direct',
              canonicalFilePath: 'src/order-service.ts',
              canonicalSymbolName: 'checkout',
            },
          },
        ]
      : [],
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

const mockSutTarget = {
  canonicalFilePath: 'src/order-service.ts',
  canonicalSymbolName: 'checkout',
  declarationSpan: { startLine: 1, startColumn: 1, endLine: 30, endColumn: 1 },
};

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

  const result = engine.correlate([], [mutant], [block], mockSutTarget);

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

  const result = engine.correlate([finding], [mutant], [block], mockSutTarget);

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const missingIdAbstention = result.abstentions.find(a => a.reason === 'MISSING_TEST_ID');
  assert.ok(missingIdAbstention, 'Must abstain due to missing test ID');
});

test('3. P4 Guardrail: Abstains when test ID mapping is ambiguous (never guesses)', () => {
  const engine = new MutationCorrelationEngine();
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

  const result = engine.correlate([], [mutant], [blockA, blockB], mockSutTarget);

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
    file: 'src/unrelated-helper.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 5,
    startColumn: 1,
    outcome: 'SURVIVED',
    coveredBy: ['it:checkout:10'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [mutantOnUnrelatedFile], [block], mockSutTarget);

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
    mockSutTarget,
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

  const result = engine.correlate([finding], [survivingMutant], [block], mockSutTarget);

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

test('7. P4 Scope Guardrail: Abstains when mutant is in same file but outside SUT declaration span', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:checkout:10', 'checks out order');
  const finding = createMockFinding('f-1', block.id);

  // SUT target checkout is on lines 1..30
  // Mutant is located on line 85 (e.g. refund function) in the same order-service.ts file
  const mutantOutsideSpan: NormalizedMutantRecord = {
    id: 'm-outside-span',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 85,
    startColumn: 5,
    outcome: 'SURVIVED',
    coveredBy: ['it:checkout:10'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [mutantOutsideSpan], [block], mockSutTarget);

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const scopeAbstention = result.abstentions.find(
    a => a.reason === 'MISSING_SUT_PATH_MATCH' && a.details.includes('outside canonical SUT declaration span')
  );
  assert.ok(scopeAbstention, 'Must abstain when mutant is outside SUT declaration span');
});

test('8. P4 Scope Guardrail: Abstains when test block does not invoke the resolved SUT path', () => {
  const engine = new MutationCorrelationEngine();
  // Test block has invocations = [] (does NOT invoke SUT)
  const nonInvokingBlock = createMockBlock('it:helper-only:10', 'runs helper only', 'tests/order.test.ts', false);
  const finding = createMockFinding('f-1', nonInvokingBlock.id);

  const survivingMutant: NormalizedMutantRecord = {
    id: 'm-survivor-1',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 15,
    startColumn: 5,
    outcome: 'SURVIVED',
    coveredBy: ['it:helper-only:10'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [survivingMutant], [nonInvokingBlock], mockSutTarget);

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const noInvocationAbstention = result.abstentions.find(
    a => a.reason === 'MISSING_SUT_PATH_MATCH' && a.details.includes('does not invoke the resolved SUT path')
  );
  assert.ok(noInvocationAbstention, 'Must abstain when test does not invoke resolved SUT path');
});

test('9. P4 Exact Match Guardrail: Rejects substring match between test names', () => {
  const engine = new MutationCorrelationEngine();
  const block = createMockBlock('it:checkout:10', 'checks out order');
  const mutant: NormalizedMutantRecord = {
    id: 'm-survivor',
    file: 'src/order-service.ts',
    operator: 'EqualityOperator',
    replacement: '!==',
    startLine: 14,
    startColumn: 1,
    outcome: 'SURVIVED',
    // Stryker ID contains 'checks out order' as a substring, but is NOT an exact match
    coveredBy: ['checks out order with discount coupon and express shipping'],
    killedBy: [],
  };

  const result = engine.correlate([], [mutant], [block], mockSutTarget);

  assert.strictEqual(result.perTestEvidence.size, 0, 'Substring test ID match must NOT be admitted');
  const missingId = result.abstentions.find(a => a.reason === 'MISSING_TEST_ID');
  assert.ok(missingId, 'Must abstain when test ID does not match exactly');
});

test('10. P4 Guardrail: Name-only matching abstains when duplicate test names exist without unique ID', () => {
  const engine = new MutationCorrelationEngine();
  // Two different blocks in different files that have identical test names
  const block1 = createMockBlock('it:block1:10', 'renders correctly', 'tests/a.test.ts');
  const block2 = createMockBlock('it:block2:10', 'renders correctly', 'tests/b.test.ts');
  const mutant: NormalizedMutantRecord = {
    id: 'm-dup-name',
    file: 'src/order-service.ts',
    operator: 'EqualityOperator',
    replacement: '!==',
    startLine: 14,
    startColumn: 1,
    outcome: 'SURVIVED',
    coveredBy: ['renders correctly'],
    killedBy: [],
  };

  const result = engine.correlate([], [mutant], [block1, block2], mockSutTarget);

  assert.strictEqual(result.perTestEvidence.size, 0, 'Must abstain from mapping when test name is duplicated');
  const ambiguous = result.abstentions.find(
    a => a.reason === 'AMBIGUOUS_TEST_ID' && a.details.includes('by name')
  );
  assert.ok(ambiguous, 'Must produce AMBIGUOUS_TEST_ID for duplicate test name matching');
});

test('11. P4 Guardrail: Test invoking different symbol in same file abstains from SUT correlation', () => {
  const engine = new MutationCorrelationEngine();
  // Block invokes a different function (e.g. calculateTax instead of checkout) in order-service.ts
  const block = {
    id: 'it:other-fn:10',
    name: 'calculates tax',
    kind: 'it' as const,
    location: {
      filePath: 'tests/order.test.ts',
      span: { startLine: 10, startColumn: 1, endLine: 25, endColumn: 5 },
    },
    invocations: [
      {
        location: { filePath: 'tests/order.test.ts', span: { startLine: 12, startColumn: 5, endLine: 12, endColumn: 20 } },
        expressionText: 'orderService.calculateTax()',
        resolution: {
          status: 'resolved' as const,
          importKind: 'direct' as const,
          canonicalFilePath: 'src/order-service.ts',
          canonicalSymbolName: 'calculateTax', // Not checkout!
        },
      },
    ],
    mockCalls: [],
    assertions: [],
  };

  const finding = createMockFinding('f-tax', block.id);
  const mutant: NormalizedMutantRecord = {
    id: 'm-survivor-checkout',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'false',
    startLine: 15,
    startColumn: 5,
    outcome: 'SURVIVED',
    coveredBy: ['it:other-fn:10'],
    killedBy: [],
  };

  const result = engine.correlate([finding], [mutant], [block], mockSutTarget);

  assert.strictEqual(result.corroboratingMatches.length, 0);
  const sutMismatch = result.abstentions.find(
    a => a.reason === 'MISSING_SUT_PATH_MATCH' && a.details.includes('does not invoke the resolved SUT path')
  );
  assert.ok(sutMismatch, 'Must abstain when test does not invoke the specific SUT symbol');
});
