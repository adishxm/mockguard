import test from 'node:test';
import assert from 'node:assert';
import {
  EquivalentMutantClassifier,
} from '../../src/mutation/equivalent-mutants.js';
import { NormalizedMutantRecord } from '../../src/mutation/stryker-normalizer.js';

test('1. EquivalentMutantClassifier: identifies logging template mutation as equivalent candidate', () => {
  const classifier = new EquivalentMutantClassifier();

  const mutants: NormalizedMutantRecord[] = [
    {
      id: 'm-log-1',
      file: 'src/logging/logger.ts',
      operator: 'StringLiteral',
      replacement: '""',
      startLine: 15,
      startColumn: 10,
      outcome: 'SURVIVED',
      coveredBy: ['test-1'],
      killedBy: [],
    },
    {
      id: 'm-logic-1',
      file: 'src/order-service.ts',
      operator: 'EqualityOperator',
      replacement: '!==',
      startLine: 25,
      startColumn: 10,
      outcome: 'SURVIVED',
      coveredBy: ['test-1'],
      killedBy: [],
    },
  ];

  const analysis = classifier.classifyCandidates(mutants);

  // Invariant: claims.equivalentMutantsDetected must be boolean
  assert.strictEqual(typeof analysis.equivalentMutantsDetected, 'boolean');
  assert.strictEqual(analysis.equivalentMutantsDetected, true);
  assert.strictEqual(analysis.candidateCount, 1);
  assert.deepStrictEqual(analysis.candidateIds, ['m-log-1']);
});

test('2. EquivalentMutantClassifier: True business logic mutant is NEVER labeled as equivalent candidate', () => {
  const classifier = new EquivalentMutantClassifier();

  const businessMutants: NormalizedMutantRecord[] = [
    {
      id: 'm-discount',
      file: 'src/pricing.ts',
      operator: 'BinaryExpression',
      replacement: 'total * 1.0',
      startLine: 40,
      startColumn: 12,
      outcome: 'SURVIVED',
      coveredBy: ['test-pricing'],
      killedBy: [],
    },
    {
      id: 'm-auth',
      file: 'src/auth.ts',
      operator: 'ConditionalExpression',
      replacement: 'true',
      startLine: 12,
      startColumn: 5,
      outcome: 'SURVIVED',
      coveredBy: ['test-auth'],
      killedBy: [],
    },
  ];

  const analysis = classifier.classifyCandidates(businessMutants);
  assert.strictEqual(analysis.equivalentMutantsDetected, false);
  assert.strictEqual(analysis.candidateCount, 0);
  assert.deepStrictEqual(analysis.candidateIds, []);
});

test('3. Outcome Partitioning: Isolates candidates, timeouts, and errors from ordinary survivors', () => {
  const classifier = new EquivalentMutantClassifier();

  const mutants: NormalizedMutantRecord[] = [
    {
      id: 'm-surv-1',
      file: 'src/order.ts',
      operator: 'ConditionalExpression',
      replacement: 'false',
      startLine: 10,
      startColumn: 1,
      outcome: 'SURVIVED',
      coveredBy: ['t1'],
      killedBy: [],
    },
    {
      id: 'm-equiv-1',
      file: 'src/log.ts',
      operator: 'StringLiteral',
      replacement: '""',
      startLine: 10,
      startColumn: 1,
      outcome: 'SURVIVED',
      coveredBy: ['t1'],
      killedBy: [],
    },
    {
      id: 'm-timeout',
      file: 'src/order.ts',
      operator: 'BlockStatement',
      replacement: '{}',
      startLine: 20,
      startColumn: 1,
      outcome: 'TIMEOUT',
      coveredBy: ['t1'],
      killedBy: [],
    },
    {
      id: 'm-compile-err',
      file: 'src/order.ts',
      operator: 'BlockStatement',
      replacement: '{ syntax error }',
      startLine: 30,
      startColumn: 1,
      outcome: 'COMPILE_ERROR',
      coveredBy: [],
      killedBy: [],
    },
    {
      id: 'm-kill-1',
      file: 'src/order.ts',
      operator: 'EqualityOperator',
      replacement: '!==',
      startLine: 40,
      startColumn: 1,
      outcome: 'KILLED',
      coveredBy: ['t1'],
      killedBy: ['t1'],
    },
  ];

  const candidateIds = new Set(['m-equiv-1']);
  const partition = classifier.partitionOutcomes(mutants, candidateIds);

  assert.deepStrictEqual(partition.behavioralKills, ['m-kill-1']);
  assert.deepStrictEqual(partition.behavioralSurvivors, ['m-surv-1']);
  assert.deepStrictEqual(partition.equivalentCandidates, ['m-equiv-1']);
  assert.strictEqual(partition.infrastructureOutcomes.length, 2);
  assert.ok(partition.infrastructureOutcomes.some(i => i.mutantId === 'm-timeout' && i.outcome === 'TIMEOUT'));
  assert.ok(partition.infrastructureOutcomes.some(i => i.mutantId === 'm-compile-err' && i.outcome === 'COMPILE_ERROR'));
});
