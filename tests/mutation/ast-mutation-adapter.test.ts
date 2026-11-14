import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { AstMutationAdapter } from '../../src/mutation/ast-mutation-adapter.js';

test('AstMutationAdapter: generates all 4 deterministic operator categories', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-ast-test-'));
  const sampleFile = path.join(tempDir, 'payment-calculator.ts');

  const code = `
export function calculateDiscount(amount: number, isVip: boolean): number {
  if (amount <= 0) {
    return 0;
  }
  if (isVip === true) {
    return 1;
  }
  return 0;
}
`;
  fs.writeFileSync(sampleFile, code, 'utf-8');

  const adapter = new AstMutationAdapter();
  const mutants = await adapter.generateMutants([sampleFile]);

  // Operators represented:
  const operators = new Set(mutants.map((m) => m.operator));
  assert.ok(operators.has('ComparisonOperatorReplacement'), 'Expected ComparisonOperatorReplacement');
  assert.ok(operators.has('BooleanLiteralFlip'), 'Expected BooleanLiteralFlip');
  assert.ok(operators.has('NumericBoundaryMutation'), 'Expected NumericBoundaryMutation');
  assert.ok(operators.has('PrimitiveReturnMutation'), 'Expected PrimitiveReturnMutation');

  // Verify deterministic IDs
  const mutants2 = await adapter.generateMutants([sampleFile]);
  assert.strictEqual(mutants.length, mutants2.length);
  for (let i = 0; i < mutants.length; i++) {
    assert.strictEqual(mutants[i].id, mutants2[i].id);
    assert.strictEqual(mutants[i].line, mutants2[i].line);
    assert.strictEqual(mutants[i].column, mutants2[i].column);
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('AstMutationAdapter: skips test files, declaration files, and node_modules', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-skip-test-'));
  const testFile = path.join(tempDir, 'payment.test.ts');
  const dtsFile = path.join(tempDir, 'types.d.ts');
  const sourceFile = path.join(tempDir, 'payment.ts');

  fs.writeFileSync(testFile, 'const a = true;', 'utf-8');
  fs.writeFileSync(dtsFile, 'export declare const a: boolean;', 'utf-8');
  fs.writeFileSync(sourceFile, 'export const active = true;', 'utf-8');

  const adapter = new AstMutationAdapter();
  const mutants = await adapter.generateMutants([testFile, dtsFile, sourceFile]);

  assert.strictEqual(mutants.length, 1);
  assert.strictEqual(mutants[0].file, path.resolve(sourceFile));

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('AstMutationAdapter: respects maxMutants bound', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-max-test-'));
  const sourceFile = path.join(tempDir, 'many-mutants.ts');

  const code = `
export function check(x: number) {
  if (x === 0) return true;
  if (x > 1) return false;
  if (x <= 10) return true;
  return false;
}
`;
  fs.writeFileSync(sourceFile, code, 'utf-8');

  const adapter = new AstMutationAdapter();
  const allMutants = await adapter.generateMutants([sourceFile]);
  assert.ok(allMutants.length > 2);

  const bounded = await adapter.generateMutants([sourceFile], { maxMutants: 2 });
  assert.strictEqual(bounded.length, 2);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('AstMutationAdapter: testMutant leaves original source file completely untouched', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-isolated-test-'));
  const sourceFile = path.join(tempDir, 'logic.ts');
  const originalCode = 'export const flag = true;\n';
  fs.writeFileSync(sourceFile, originalCode, 'utf-8');

  const adapter = new AstMutationAdapter();
  const mutants = await adapter.generateMutants([sourceFile]);
  assert.strictEqual(mutants.length, 1);

  // Command that fails when executed
  const command = [process.execPath, '-e', 'process.exit(1);'];
  const res = await adapter.testMutant(mutants[0], command, {
    projectRoot: tempDir,
    timeoutMs: 5000,
  });

  assert.strictEqual(res.outcome, 'KILLED');

  // Verify original file was NEVER modified
  const currentCode = fs.readFileSync(sourceFile, 'utf-8');
  assert.strictEqual(currentCode, originalCode, 'Original source must remain identical');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('AstMutationAdapter: testMutant classifies pass as SURVIVED and timeout as TIMEOUT', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-outcomes-test-'));
  const sourceFile = path.join(tempDir, 'logic.ts');
  fs.writeFileSync(sourceFile, 'export const flag = true;\n', 'utf-8');

  const adapter = new AstMutationAdapter();
  const mutants = await adapter.generateMutants([sourceFile]);

  // 1. Passing test -> SURVIVED
  const passCommand = [process.execPath, '-e', 'process.exit(0);'];
  const survivedRes = await adapter.testMutant(mutants[0], passCommand, {
    projectRoot: tempDir,
    timeoutMs: 5000,
  });
  assert.strictEqual(survivedRes.outcome, 'SURVIVED');

  // 2. Hanging test -> TIMEOUT
  const hangCommand = [process.execPath, '-e', 'while(true) {}'];
  const timeoutRes = await adapter.testMutant(mutants[0], hangCommand, {
    projectRoot: tempDir,
    timeoutMs: 500,
  });
  assert.strictEqual(timeoutRes.outcome, 'TIMEOUT');

  fs.rmSync(tempDir, { recursive: true, force: true });
});
