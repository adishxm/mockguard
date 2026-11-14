import test from 'node:test';
import assert from 'node:assert';
import { GitComparator } from '../../src/platform/git-comparator.js';
import { parseCliArgs } from '../../src/cli/args.js';

test('GitComparator: resolves commit SHA for HEAD', () => {
  const sha = GitComparator.resolveCommit('HEAD', process.cwd());
  assert.ok(sha);
  assert.match(sha, /^[0-9a-f]{40}$/);
});

test('GitComparator: rejects invalid git references with clear error', () => {
  assert.throws(
    () => GitComparator.resolveCommit('non-existent-branch-ref-xyz-1234', process.cwd()),
    /Failed to resolve git reference/
  );
});

test('GitComparator: detects working tree state without modifying files', () => {
  const isDirty = GitComparator.isWorkingTreeDirty(process.cwd());
  assert.strictEqual(typeof isDirty, 'boolean');
});

test('GitComparator: CLI args parsing for compare command', () => {
  const parsed = parseCliArgs(['compare', '--base', 'HEAD~1', '--format', 'json']);
  assert.strictEqual(parsed.command, 'compare');
  assert.strictEqual(parsed.baseRef, 'HEAD~1');
  assert.strictEqual(parsed.format, 'json');

  // Throws if --base is missing
  assert.throws(
    () => parseCliArgs(['compare']),
    /Command "compare" requires --base/
  );
});

test('GitComparator: CLI args parsing for max-mutants and include/exclude', () => {
  const parsed = parseCliArgs([
    'verify',
    '.',
    '--max-mutants',
    '15',
    '--include',
    'src/core/**',
    '--exclude',
    '**/*.legacy.*',
  ]);

  assert.strictEqual(parsed.command, 'verify');
  assert.strictEqual(parsed.maxMutants, 15);
  assert.strictEqual(parsed.include, 'src/core/**');
  assert.strictEqual(parsed.exclude, '**/*.legacy.*');
});
