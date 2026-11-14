import test from 'node:test';
import assert from 'node:assert';
import { FlakinessClassifier } from '../../src/mutation/flakiness-classifier.js';

test('FlakinessClassifier: returns INDETERMINATE when no runs or fewer than minEvidence comparable runs', () => {
  const classifier = new FlakinessClassifier();

  // Empty outcomes
  const resEmpty = classifier.classifyStability([]);
  assert.strictEqual(resEmpty.status, 'INDETERMINATE');
  assert.strictEqual(resEmpty.totalRuns, 0);
  assert.strictEqual(resEmpty.comparableRuns, 0);

  // Single run (below minEvidence = 2)
  const resSingle = classifier.classifyStability(['KILLED']);
  assert.strictEqual(resSingle.status, 'INDETERMINATE');
  assert.strictEqual(resSingle.totalRuns, 1);
  assert.strictEqual(resSingle.comparableRuns, 1);

  // Multiple runs but all non-comparable (TIMEOUT, COMPILE_ERROR)
  const resNonComparable = classifier.classifyStability(['TIMEOUT', 'COMPILE_ERROR']);
  assert.strictEqual(resNonComparable.status, 'INDETERMINATE');
  assert.strictEqual(resNonComparable.totalRuns, 2);
  assert.strictEqual(resNonComparable.comparableRuns, 0);

  // 1 comparable + 2 non-comparable (total 3 runs, but only 1 comparable)
  const resMixedNonComparable = classifier.classifyStability(['KILLED', 'TIMEOUT', 'COMPILE_ERROR']);
  assert.strictEqual(resMixedNonComparable.status, 'INDETERMINATE');
  assert.strictEqual(resMixedNonComparable.totalRuns, 3);
  assert.strictEqual(resMixedNonComparable.comparableRuns, 1);
});

test('FlakinessClassifier: returns STABLE when repeated runs yield identical comparable outcomes', () => {
  const classifier = new FlakinessClassifier();

  // All KILLED
  const resKilled = classifier.classifyStability(['KILLED', 'KILLED']);
  assert.strictEqual(resKilled.status, 'STABLE');
  assert.strictEqual(resKilled.outcome, 'KILLED');
  assert.strictEqual(resKilled.totalRuns, 2);
  assert.strictEqual(resKilled.comparableRuns, 2);

  // All SURVIVED with a non-comparable timeout in between
  const resSurvived = classifier.classifyStability(['SURVIVED', 'TIMEOUT', 'SURVIVED', 'SURVIVED']);
  assert.strictEqual(resSurvived.status, 'STABLE');
  assert.strictEqual(resSurvived.outcome, 'SURVIVED');
  assert.strictEqual(resSurvived.totalRuns, 4);
  assert.strictEqual(resSurvived.comparableRuns, 3);
});

test('FlakinessClassifier: returns FLAKY when repeated runs yield contradictory comparable outcomes', () => {
  const classifier = new FlakinessClassifier();

  // KILLED and SURVIVED
  const resFlaky = classifier.classifyStability(['KILLED', 'SURVIVED']);
  assert.strictEqual(resFlaky.status, 'FLAKY');
  assert.strictEqual(resFlaky.totalRuns, 2);
  assert.strictEqual(resFlaky.comparableRuns, 2);
  assert.deepStrictEqual(resFlaky.variance?.sort(), ['KILLED', 'SURVIVED']);
  assert.match(resFlaky.reason || '', /contradictory outcomes/);

  // 3 runs with flip-flop
  const resFlaky3 = classifier.classifyStability(['SURVIVED', 'KILLED', 'SURVIVED']);
  assert.strictEqual(resFlaky3.status, 'FLAKY');
  assert.strictEqual(resFlaky3.totalRuns, 3);
  assert.strictEqual(resFlaky3.comparableRuns, 3);
});

test('FlakinessClassifier: respects custom minEvidence threshold', () => {
  const classifier = new FlakinessClassifier();

  // 2 runs are not enough when minEvidence = 3
  const res2 = classifier.classifyStability(['KILLED', 'KILLED'], 3);
  assert.strictEqual(res2.status, 'INDETERMINATE');

  // 3 runs satisfy minEvidence = 3
  const res3 = classifier.classifyStability(['KILLED', 'KILLED', 'KILLED'], 3);
  assert.strictEqual(res3.status, 'STABLE');
  assert.strictEqual(res3.outcome, 'KILLED');
});
