import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { AnalysisRuleEngine } from '../../src/analysis/rules/rule-engine.js';
import { MutationCorrelationEngine } from '../../src/mutation/correlation-engine.js';
import { EquivalentMutantClassifier } from '../../src/mutation/equivalent-mutants.js';
import { FlakinessClassifier } from '../../src/mutation/flakiness-classifier.js';
import { DiscoveredTestBlock, TestFileAnalysis } from '../../src/analysis/model.js';
import { ProductionSymbolTarget } from '../../src/analysis/symbol-resolver.js';
import { NormalizedMutantRecord } from '../../src/mutation/stryker-normalizer.js';
import { MutantOutcome } from '../../src/contracts/outcomes.js';

/**
 * P6 Synthetic Benchmark Harness
 *
 * Evaluates analytical detection baselines across synthetic fixtures without modifying
 * or claiming unreviewed metrics on the real corpus (corpus/cases.jsonl).
 *
 * NOTE: P6 calibration is ongoing. This harness evaluates synthetic analytical baselines
 * and does NOT claim canonical P6 execution completion or real-world precision/recall before
 * live test execution and formal Worker 03 ground-truth review.
 *
 * Baselines evaluated:
 * - B0-synth: Synthetic null baseline (uncalibrated analytical reference with 0% detection;
 *             distinct from canonical P6 B0 runner-only baseline which requires live test runner)
 * - B1: Static analysis only (AnalysisRuleEngine)
 * - B2: Mutation testing only (survival without static attribution)
 * - B3: MockGuard combined (static findings + dynamic mutant survival + SUT correlation + stability)
 */

interface SyntheticCase {
  id: string;
  name: string;
  isWeakMock: boolean;
  testBlock: DiscoveredTestBlock;
  analysis: TestFileAnalysis;
  targetSymbol: ProductionSymbolTarget;
  mutant: NormalizedMutantRecord;
  repeatedRuns?: MutantOutcome[];
}

function createSyntheticCases(): SyntheticCase[] {
  const targetSymbol: ProductionSymbolTarget = {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'createOrder',
    declarationSpan: {
      startLine: 5,
      startColumn: 1,
      endLine: 50,
      endColumn: 1,
    },
  };

  // Case 1: MOCKED_SUT with surviving mutant (Weak test - should be flagged by B1, B2, B3)
  const block1: DiscoveredTestBlock = {
    id: 'test-synth-1',
    name: 'test-synth-1',
    kind: 'it',
    location: {
      filePath: 'tests/synthetic/order.test.ts',
      span: { startLine: 10, startColumn: 1, endLine: 25, endColumn: 1 },
    },
    invocations: [
      {
        callerTestId: 'test-synth-1',
        resolution: {
          status: 'resolved',
          importKind: 'direct',
          canonicalFilePath: 'src/order-service.ts',
          canonicalSymbolName: 'createOrder',
        },
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 18, startColumn: 5, endLine: 18, endColumn: 25 },
        },
        expressionText: 'createOrder(payload)',
      },
    ],
    mockCalls: [
      {
        kind: 'jest.spyOn',
        targetObjectText: 'orderService',
        targetPropertyText: 'createOrder',
        isDynamicComputedTarget: false,
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 12, startColumn: 5, endLine: 12, endColumn: 45 },
        },
        rawExpression: "jest.spyOn(orderService, 'createOrder')",
      },
      {
        kind: 'mockResolvedValue',
        targetObjectText: 'createOrder',
        isDynamicComputedTarget: false,
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 13, startColumn: 5, endLine: 13, endColumn: 45 },
        },
        rawExpression: 'mockResolvedValue({ status: "cancelled" })',
      },
    ],
    assertions: [
      {
        matcherName: 'toEqual',
        matcherKind: 'value_equality',
        actualExpressionText: 'res',
        expectedExpressionText: '{ status: "cancelled" }',
        isNegated: false,
        isDynamicComputed: false,
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 20, startColumn: 5, endLine: 20, endColumn: 35 },
        },
        rawExpression: 'expect(res).toEqual({ status: "cancelled" })',
      },
    ],
  };

  const mutant1: NormalizedMutantRecord = {
    id: 'mut-1',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'payment.status !== "failed"',
    startLine: 20,
    startColumn: 5,
    outcome: 'SURVIVED',
    coveredBy: ['test-synth-1'],
    killedBy: [],
  };

  // Case 2: Clean boundary mock with killed mutant (Strong test - should pass B1, B2, B3)
  const block2: DiscoveredTestBlock = {
    id: 'test-synth-2',
    name: 'test-synth-2',
    kind: 'it',
    location: {
      filePath: 'tests/synthetic/order.test.ts',
      span: { startLine: 30, startColumn: 1, endLine: 45, endColumn: 1 },
    },
    invocations: [
      {
        callerTestId: 'test-synth-2',
        resolution: {
          status: 'resolved',
          importKind: 'direct',
          canonicalFilePath: 'src/order-service.ts',
          canonicalSymbolName: 'createOrder',
        },
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 38, startColumn: 5, endLine: 38, endColumn: 25 },
        },
        expressionText: 'createOrder(payload)',
      },
    ],
    mockCalls: [
      {
        kind: 'mockResolvedValue',
        targetObjectText: 'paymentClient.charge',
        isDynamicComputedTarget: false,
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 32, startColumn: 5, endLine: 32, endColumn: 50 },
        },
        rawExpression: 'paymentClient.charge.mockResolvedValue({ status: "approved" })',
      },
    ],
    assertions: [
      {
        matcherName: 'toBe',
        matcherKind: 'value_equality',
        actualExpressionText: 'res.status',
        expectedExpressionText: '"confirmed"',
        isNegated: false,
        isDynamicComputed: false,
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 40, startColumn: 5, endLine: 40, endColumn: 35 },
        },
        rawExpression: 'expect(res.status).toBe("confirmed")',
      },
    ],
  };

  const mutant2: NormalizedMutantRecord = {
    id: 'mut-2',
    file: 'src/order-service.ts',
    operator: 'ConditionalExpression',
    replacement: 'payment.status !== "failed"',
    startLine: 25,
    startColumn: 5,
    outcome: 'KILLED',
    coveredBy: ['test-synth-2'],
    killedBy: ['test-synth-2'],
  };

  // Case 3: NO_ASSERTION test (Weak test - flagged by B1 static, but mutant survives in B2)
  const block3: DiscoveredTestBlock = {
    id: 'test-synth-3',
    name: 'test-synth-3',
    kind: 'it',
    location: {
      filePath: 'tests/synthetic/order.test.ts',
      span: { startLine: 50, startColumn: 1, endLine: 65, endColumn: 1 },
    },
    invocations: [
      {
        callerTestId: 'test-synth-3',
        resolution: {
          status: 'resolved',
          importKind: 'direct',
          canonicalFilePath: 'src/order-service.ts',
          canonicalSymbolName: 'createOrder',
        },
        location: {
          filePath: 'tests/synthetic/order.test.ts',
          span: { startLine: 58, startColumn: 5, endLine: 58, endColumn: 25 },
        },
        expressionText: 'createOrder(payload)',
      },
    ],
    mockCalls: [],
    assertions: [],
  };

  const mutant3: NormalizedMutantRecord = {
    id: 'mut-3',
    file: 'src/order-service.ts',
    operator: 'BinaryExpression',
    replacement: 'a - b',
    startLine: 30,
    startColumn: 5,
    outcome: 'SURVIVED',
    coveredBy: ['test-synth-3'],
    killedBy: [],
  };

  return [
    {
      id: 'SYNTH-001',
      name: 'mocked_sut_with_survivor',
      isWeakMock: true,
      testBlock: block1,
      analysis: {
        testFilePath: 'tests/synthetic/order.test.ts',
        testBlocks: [block1],
        unsupportedConstructs: [],
      },
      targetSymbol,
      mutant: mutant1,
      repeatedRuns: ['SURVIVED', 'SURVIVED'],
    },
    {
      id: 'SYNTH-002',
      name: 'valid_boundary_with_killed_mutant',
      isWeakMock: false,
      testBlock: block2,
      analysis: {
        testFilePath: 'tests/synthetic/order.test.ts',
        testBlocks: [block2],
        unsupportedConstructs: [],
      },
      targetSymbol,
      mutant: mutant2,
      repeatedRuns: ['KILLED', 'KILLED'],
    },
    {
      id: 'SYNTH-003',
      name: 'no_assertion_void_execution',
      isWeakMock: true,
      testBlock: block3,
      analysis: {
        testFilePath: 'tests/synthetic/order.test.ts',
        testBlocks: [block3],
        unsupportedConstructs: [],
      },
      targetSymbol,
      mutant: mutant3,
      repeatedRuns: ['SURVIVED', 'SURVIVED'],
    },
  ];
}

test('P6 Benchmark Harness: evaluates analytical baselines (B0-synth null, B1 static, B2 mutation, B3 combined) on synthetic fixtures', () => {
  const cases = createSyntheticCases();
  const ruleEngine = new AnalysisRuleEngine();
  const correlationEngine = new MutationCorrelationEngine();
  const flakinessClassifier = new FlakinessClassifier();

  // B0-synth: Synthetic null baseline (uncalibrated analytical reference with 0% detection; distinct from canonical P6 B0 runner-only baseline)
  const b0SynthDetections = cases.map(() => false);
  assert.strictEqual(b0SynthDetections.filter(Boolean).length, 0);

  // B1: Static Analysis Only
  const b1Detections = cases.map(c => {
    const res = ruleEngine.analyze(c.analysis, c.targetSymbol);
    return res.findings.some(f => f.kind === 'MOCKED_SUT' || f.kind === 'NO_ASSERTION' || f.kind === 'CALL_ONLY_ASSERTION');
  });
  // Case 1 and 3 are detected by B1; Case 2 is not
  assert.strictEqual(b1Detections[0], true);
  assert.strictEqual(b1Detections[1], false);
  assert.strictEqual(b1Detections[2], true);

  // B2: Mutation Testing Only (flags based on SURVIVED mutant)
  const b2Detections = cases.map(c => c.mutant.outcome === 'SURVIVED');
  assert.strictEqual(b2Detections[0], true);
  assert.strictEqual(b2Detections[1], false);
  assert.strictEqual(b2Detections[2], true);

  // B3: MockGuard Combined (static finding + correlated surviving mutant + stability)
  const b3Results = cases.map(c => {
    const staticRes = ruleEngine.analyze(c.analysis, c.targetSymbol);
    const correlation = correlationEngine.correlate(
      staticRes.findings,
      [c.mutant],
      [c.testBlock],
      c.targetSymbol
    );
    const stability = c.repeatedRuns
      ? flakinessClassifier.classifyStability(c.repeatedRuns)
      : undefined;

    return {
      caseId: c.id,
      findings: staticRes.findings,
      correlation,
      stability,
      hasCorroboratingEvidence: correlation.corroboratingMatches.some(
        m => m.mutantOutcome === 'SURVIVED'
      ),
    };
  });

  // SYNTH-001 has static finding MOCKED_SUT + corroborating surviving mutant on SUT path
  assert.strictEqual(b3Results[0].hasCorroboratingEvidence, true);
  assert.strictEqual(b3Results[0].stability?.status, 'STABLE');

  // SYNTH-002 has no findings, mutant killed -> strong test
  assert.strictEqual(b3Results[1].findings.length, 0);
  assert.strictEqual(b3Results[1].hasCorroboratingEvidence, false);

  // SYNTH-003 has NO_ASSERTION finding + corroborating surviving mutant
  assert.strictEqual(b3Results[2].hasCorroboratingEvidence, true);
});

test('P6 Benchmark Harness: preserves corpus/cases.jsonl as NOT_RUN and PENDING_REVIEW', () => {
  const corpusPath = path.resolve('corpus/cases.jsonl');
  assert.strictEqual(fs.existsSync(corpusPath), true, 'corpus/cases.jsonl must exist');

  const lines = fs
    .readFileSync(corpusPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  assert.strictEqual(lines.length, 10, 'Expected exactly 10 corpus cases');

  for (const line of lines) {
    const record = JSON.parse(line);
    assert.strictEqual(
      record.measured?.static_result,
      'NOT_RUN',
      `Case ${record.case_id} must retain measured.static_result = 'NOT_RUN'`
    );
    assert.strictEqual(
      record.measured?.dynamic_result,
      'NOT_RUN',
      `Case ${record.case_id} must retain measured.dynamic_result = 'NOT_RUN'`
    );
    assert.strictEqual(
      record.review_status,
      'PENDING_REVIEW',
      `Case ${record.case_id} must retain review_status = 'PENDING_REVIEW'`
    );
  }
});

test('P6 Benchmark Harness: verifies score calculation and equivalent mutant candidate claims', () => {
  const classifier = new EquivalentMutantClassifier();

  const mutants: NormalizedMutantRecord[] = [
    {
      id: 'm1',
      file: 'src/order-service.ts',
      operator: 'BinaryExpression',
      replacement: 'x = 1',
      startLine: 10,
      startColumn: 1,
      outcome: 'KILLED',
      coveredBy: ['t1'],
      killedBy: ['t1'],
    },
    {
      id: 'm2',
      file: 'src/logger.ts',
      operator: 'StringLiteral',
      replacement: '""',
      startLine: 20,
      startColumn: 1,
      outcome: 'SURVIVED',
      statusReason: 'log message mutation',
      coveredBy: ['t1'],
      killedBy: [],
    },
    {
      id: 'm3',
      file: 'src/order-service.ts',
      operator: 'ConditionalExpression',
      replacement: 'return false',
      startLine: 30,
      startColumn: 1,
      outcome: 'SURVIVED',
      coveredBy: ['t1'],
      killedBy: [],
    },
  ];

  const report = classifier.classifyCandidates(mutants);

  // Equivalent candidates flagged as boolean in claims
  assert.strictEqual(report.equivalentMutantsDetected, true);
  assert.strictEqual(report.candidateCount, 1);
  assert.strictEqual(report.candidateIds[0], 'm2');

  // Partitioned outcomes should NOT silently treat candidates as ordinary survivors
  const candidateSet = new Set(report.candidateIds);
  const partitioned = classifier.partitionOutcomes(mutants, candidateSet);
  assert.strictEqual(partitioned.behavioralKills.length, 1);
  assert.strictEqual(partitioned.behavioralSurvivors.length, 1);
  assert.strictEqual(partitioned.equivalentCandidates.length, 1);

  // Total evaluated without altering formula: killed / (killed + survived + noCoverage)
  const totalEvaluated = partitioned.behavioralKills.length + partitioned.behavioralSurvivors.length;
  const score = totalEvaluated > 0 ? (partitioned.behavioralKills.length / totalEvaluated) * 100 : null;
  assert.strictEqual(score, 50);
});
