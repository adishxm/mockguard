import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { TypeScriptProjectLoader } from '../../src/analysis/project-loader.js';
import { JestTestAnalyzer } from '../../src/analysis/jest-test-analyzer.js';

function createTempProject(files: Record<string, string>): { dir: string; tsconfigPath: string } {
  const rawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-p1-ast-'));
  const dir = fs.realpathSync(rawDir);
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  const tsconfigPath = path.join(dir, 'tsconfig.json');
  fs.writeFileSync(
    tsconfigPath,
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
      },
      include: ['src/**/*', 'tests/**/*'],
    })
  );
  return { dir, tsconfigPath };
}

test('1. TypeScriptProjectLoader loads tsconfig and provides TypeChecker', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/index.ts': 'export const answer = 42;',
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  assert.ok(ctx.program);
  assert.ok(ctx.checker);
  assert.strictEqual(ctx.rootDir, dir);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('2. Resolves SUT through direct named import', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/order-service.ts': `
      export function createOrder(id: string) { return { id, status: 'created' }; }
    `,
    'tests/direct.test.ts': `
      import { createOrder } from '../src/order-service';
      describe('Order Suite', () => {
        it('creates order directly', () => {
          const res = createOrder('o-1');
          expect(res.status).toBe('created');
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir);
  const testSourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/direct.test.ts'))!;
  assert.ok(testSourceFile);

  const analysis = analyzer.analyzeSourceFile(testSourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'createOrder',
  });

  assert.strictEqual(analysis.testBlocks.length, 2); // describe + it
  const itBlock = analysis.testBlocks.find(b => b.name === 'creates order directly')!;
  assert.ok(itBlock);
  assert.strictEqual(itBlock.invocations.length, 1);
  assert.strictEqual(itBlock.invocations[0].resolution.status, 'resolved');
  if (itBlock.invocations[0].resolution.status === 'resolved') {
    assert.strictEqual(itBlock.invocations[0].resolution.importKind, 'direct');
    assert.strictEqual(itBlock.invocations[0].resolution.canonicalSymbolName, 'createOrder');
  }

  // Assertions collected
  assert.strictEqual(itBlock.assertions.length, 1);
  assert.strictEqual(itBlock.assertions[0].matcherName, 'toBe');
  assert.strictEqual(itBlock.assertions[0].matcherKind, 'value_equality');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('3. Resolves SUT through aliased named import', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/order-service.ts': `
      export function createOrder(id: string) { return { id }; }
    `,
    'tests/aliased.test.ts': `
      import { createOrder as makeOrder } from '../src/order-service';
      describe('Aliased Suite', () => {
        test('calls aliased import', () => {
          const res = makeOrder('o-2');
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir);
  const testSourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/aliased.test.ts'))!;

  const analysis = analyzer.analyzeSourceFile(testSourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'createOrder',
  });

  const testBlock = analysis.testBlocks.find(b => b.name === 'calls aliased import')!;
  assert.ok(testBlock);
  assert.strictEqual(testBlock.invocations.length, 1);
  assert.strictEqual(testBlock.invocations[0].resolution.status, 'resolved');
  if (testBlock.invocations[0].resolution.status === 'resolved') {
    assert.strictEqual(testBlock.invocations[0].resolution.importKind, 'aliased');
    assert.strictEqual(testBlock.invocations[0].resolution.canonicalSymbolName, 'createOrder');
  }

  fs.rmSync(dir, { recursive: true, force: true });
});

test('4. Resolves SUT through namespace import and property access', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/order-service.ts': `
      export function createOrder(id: string) { return { id }; }
    `,
    'tests/namespace.test.ts': `
      import * as orderService from '../src/order-service';
      describe('Namespace Suite', () => {
        it('calls via namespace', () => {
          orderService.createOrder('o-3');
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir);
  const testSourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/namespace.test.ts'))!;

  const analysis = analyzer.analyzeSourceFile(testSourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'createOrder',
  });

  const itBlock = analysis.testBlocks.find(b => b.name === 'calls via namespace')!;
  assert.ok(itBlock);
  assert.strictEqual(itBlock.invocations.length, 1);
  assert.strictEqual(itBlock.invocations[0].resolution.status, 'resolved');
  if (itBlock.invocations[0].resolution.status === 'resolved') {
    assert.strictEqual(itBlock.invocations[0].resolution.importKind, 'namespace');
    assert.strictEqual(itBlock.invocations[0].resolution.canonicalSymbolName, 'createOrder');
  }

  fs.rmSync(dir, { recursive: true, force: true });
});

test('5. Accurately marks dynamic / computed calls as unsupported without guessing', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/order-service.ts': `
      export function createOrder(id: string) { return { id }; }
    `,
    'tests/dynamic.test.ts': `
      import * as orderService from '../src/order-service';
      describe('Dynamic Suite', () => {
        it('uses computed method name', () => {
          const fnName = 'createOrder';
          (orderService as any)[fnName]('o-4');
        });
        it('uses eval', () => {
          eval('createOrder("o-5")');
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir);
  const testSourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/dynamic.test.ts'))!;

  const analysis = analyzer.analyzeSourceFile(testSourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'createOrder',
  });

  // Verify computed member call is marked unsupported
  const itComputed = analysis.testBlocks.find(b => b.name === 'uses computed method name')!;
  assert.ok(itComputed);
  assert.strictEqual(itComputed.invocations.length, 1);
  assert.strictEqual(itComputed.invocations[0].resolution.status, 'unsupported');

  // Verify eval construct is detected as unsupported construct
  assert.ok(analysis.unsupportedConstructs.some(u => u.reason.includes('eval')));

  fs.rmSync(dir, { recursive: true, force: true });
});

test('6. Preserves accurate source spans and locations for blocks and mocks', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/order-service.ts': `
      export function chargeClient() { return true; }
    `,
    'tests/locations.test.ts': `
      describe('Locations Suite', () => {
        it('has exact line numbers', () => {
          const mockFn = jest.fn();
          mockFn.mockReturnValue(123);
          expect(mockFn).toHaveBeenCalled();
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir);
  const testSourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/locations.test.ts'))!;

  const analysis = analyzer.analyzeSourceFile(testSourceFile);

  const itBlock = analysis.testBlocks.find(b => b.name === 'has exact line numbers')!;
  assert.ok(itBlock);
  assert.strictEqual(itBlock.location.filePath, 'tests/locations.test.ts');
  assert.strictEqual(itBlock.location.span.startLine, 3);
  assert.strictEqual(itBlock.location.span.endLine, 7);

  // Mocks collected with locations
  assert.strictEqual(itBlock.mockCalls.length, 2); // jest.fn and mockReturnValue
  const mockFnCall = itBlock.mockCalls.find(m => m.kind === 'jest.fn')!;
  assert.strictEqual(mockFnCall.location.span.startLine, 4);

  // Assertions collected
  assert.strictEqual(itBlock.assertions.length, 1);
  assert.strictEqual(itBlock.assertions[0].matcherName, 'toHaveBeenCalled');
  assert.strictEqual(itBlock.assertions[0].matcherKind, 'interaction_call');
  assert.strictEqual(itBlock.assertions[0].location.span.startLine, 6);

  fs.rmSync(dir, { recursive: true, force: true });
});
