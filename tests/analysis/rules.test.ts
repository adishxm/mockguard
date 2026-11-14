import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { TypeScriptProjectLoader } from '../../src/analysis/project-loader.js';
import { JestTestAnalyzer } from '../../src/analysis/jest-test-analyzer.js';
import { AnalysisRuleEngine } from '../../src/analysis/rules/rule-engine.js';
import { BoundaryAllowlist } from '../../src/analysis/rules/boundary-allowlist.js';

function createTempProject(files: Record<string, string>): { dir: string; tsconfigPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-p2-rules-'));
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

test('1. MOCKED_SUT: Positive - flags jest.spyOn with replaced return value as high confidence', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/calculator.ts': `
      export class Calculator {
        calculate(x: number) { return x * 2; }
      }
    `,
    'tests/mocked-sut.test.ts': `
      import { Calculator } from '../src/calculator';
      describe('Calculator Tests', () => {
        it('calculates with replaced spy', () => {
          const calc = new Calculator();
          jest.spyOn(calc, 'calculate').mockReturnValue(999);
          const result = calc.calculate(5);
          expect(result).toBe(999);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/mocked-sut.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/calculator.ts',
    canonicalSymbolName: 'calculate',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/calculator.ts',
    canonicalSymbolName: 'calculate',
  });

  const mockedSut = result.findings.find(f => f.kind === 'MOCKED_SUT');
  assert.ok(mockedSut, 'Should emit MOCKED_SUT finding');
  assert.strictEqual(mockedSut.confidence, 'high');
  assert.ok(mockedSut.locations.length > 0);
  assert.ok(mockedSut.evidence.some(e => e.includes('replaces implementation')));

  fs.rmSync(dir, { recursive: true, force: true });
});

test('2. MOCKED_SUT: Negative - bare jest.spyOn without replaced implementation is NOT flagged', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/calculator.ts': `
      export class Calculator {
        calculate(x: number) { return x * 2; }
      }
    `,
    'tests/bare-spy.test.ts': `
      import { Calculator } from '../src/calculator';
      describe('Calculator Tests', () => {
        it('monitors calculate with bare spy', () => {
          const calc = new Calculator();
          const spy = jest.spyOn(calc, 'calculate');
          const result = calc.calculate(5);
          expect(result).toBe(10);
          expect(spy).toHaveBeenCalledWith(5);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/bare-spy.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/calculator.ts',
    canonicalSymbolName: 'calculate',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/calculator.ts',
    canonicalSymbolName: 'calculate',
  });

  const mockedSut = result.findings.find(f => f.kind === 'MOCKED_SUT');
  assert.strictEqual(mockedSut, undefined, 'Bare jest.spyOn must NOT be flagged as MOCKED_SUT');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('3. MOCKED_SUT: Negative - external boundary mock does NOT trigger MOCKED_SUT', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/payment-gateway.ts': `
      export class PaymentGateway {
        charge(amount: number) { return true; }
      }
    `,
    'src/order-service.ts': `
      import { PaymentGateway } from './payment-gateway';
      export class OrderService {
        constructor(private gateway: PaymentGateway) {}
        checkout(amt: number) { return this.gateway.charge(amt); }
      }
    `,
    'tests/boundary-mock.test.ts': `
      import { OrderService } from '../src/order-service';
      import { PaymentGateway } from '../src/payment-gateway';
      describe('OrderService Suite', () => {
        it('charges via mocked gateway', () => {
          const gateway = new PaymentGateway();
          jest.spyOn(gateway, 'charge').mockReturnValue(true);
          const service = new OrderService(gateway);
          const res = service.checkout(50);
          expect(res).toBe(true);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/boundary-mock.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const mockedSut = result.findings.find(f => f.kind === 'MOCKED_SUT');
  assert.strictEqual(mockedSut, undefined, 'External dependency boundary mock must NOT trigger MOCKED_SUT');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('4. NO_ASSERTION: Positive - test executes SUT with zero assertions', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/runner.ts': `
      export function runTask() { return 'done'; }
    `,
    'tests/no-assert.test.ts': `
      import { runTask } from '../src/runner';
      describe('Task Runner', () => {
        it('executes task silently', () => {
          runTask();
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/no-assert.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/runner.ts',
    canonicalSymbolName: 'runTask',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/runner.ts',
    canonicalSymbolName: 'runTask',
  });

  const noAssert = result.findings.find(f => f.kind === 'NO_ASSERTION');
  assert.ok(noAssert, 'Should emit NO_ASSERTION finding');
  assert.strictEqual(noAssert.confidence, 'medium');
  assert.ok(noAssert.evidence.some(e => e.includes('Zero assertions')));

  fs.rmSync(dir, { recursive: true, force: true });
});

test('5. CALL_ONLY_ASSERTION: Positive - flags test containing only positive interaction checks', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/notifier.ts': `
      export function notify(target: { send: () => void }) {
        target.send();
      }
    `,
    'tests/call-only.test.ts': `
      import { notify } from '../src/notifier';
      describe('Notifier', () => {
        it('invokes send without verifying state', () => {
          const fake = { send: jest.fn() };
          notify(fake);
          expect(fake.send).toHaveBeenCalled();
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/call-only.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/notifier.ts',
    canonicalSymbolName: 'notify',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/notifier.ts',
    canonicalSymbolName: 'notify',
  });

  const callOnly = result.findings.find(f => f.kind === 'CALL_ONLY_ASSERTION');
  assert.ok(callOnly, 'Should emit CALL_ONLY_ASSERTION finding');
  assert.strictEqual(callOnly.confidence, 'medium');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('6. CALL_ONLY_ASSERTION: Negative (Upgrade 1) - .not.toHaveBeenCalled on boundary is recognized as healthy negative side-effect check', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/checkout.ts': `
      export function processCart(cart: any[], paymentClient: any) {
        if (cart.length === 0) return false;
        return paymentClient.charge();
      }
    `,
    'tests/negative-side-effect.test.ts': `
      import { processCart } from '../src/checkout';
      describe('Checkout Process', () => {
        it('does not charge when cart is empty', () => {
          const paymentClient = { charge: jest.fn() };
          const res = processCart([], paymentClient);
          expect(paymentClient.charge).not.toHaveBeenCalled();
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/negative-side-effect.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/checkout.ts',
    canonicalSymbolName: 'processCart',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/checkout.ts',
    canonicalSymbolName: 'processCart',
  });

  const callOnly = result.findings.find(f => f.kind === 'CALL_ONLY_ASSERTION');
  assert.strictEqual(
    callOnly,
    undefined,
    'Negative side effect (.not.toHaveBeenCalled) must NOT be flagged as vacuous call-only assertion'
  );

  fs.rmSync(dir, { recursive: true, force: true });
});

test('7. MOCK_ASSERTION: Positive - flags configured mock value echo with low/advisory ceiling', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/service.ts': `
      export function executeService() { return 'real'; }
    `,
    'tests/mock-echo.test.ts': `
      import { executeService } from '../src/service';
      describe('Echo Test', () => {
        it('asserts configured mock directly', () => {
          const fakeHelper = jest.fn();
          fakeHelper.mockReturnValue(42);
          executeService();
          expect(fakeHelper()).toBe(42);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/mock-echo.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/service.ts',
    canonicalSymbolName: 'executeService',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/service.ts',
    canonicalSymbolName: 'executeService',
  });

  const mockAssertion = result.findings.find(f => f.kind === 'MOCK_ASSERTION');
  assert.ok(mockAssertion, 'Should emit MOCK_ASSERTION finding');
  assert.strictEqual(mockAssertion.confidence, 'low', 'Confidence ceiling must strictly remain low / advisory');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('8. UNSUPPORTED_PATTERN: Emits unverified confidence and abstains from guessing on dynamic constructs', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/dynamic-target.ts': `
      export class DynamicTarget {
        action() { return 1; }
      }
    `,
    'tests/unsupported.test.ts': `
      import { DynamicTarget } from '../src/dynamic-target';
      describe('Dynamic Suite', () => {
        it('invokes target via computed member access', () => {
          const target = new DynamicTarget();
          const methodName = 'action' + '';
          target[methodName]();
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/unsupported.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/dynamic-target.ts',
    canonicalSymbolName: 'action',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/dynamic-target.ts',
    canonicalSymbolName: 'action',
  });

  const unsupported = result.findings.find(f => f.kind === 'UNSUPPORTED_PATTERN');
  assert.ok(unsupported, 'Should emit UNSUPPORTED_PATTERN for dynamic computed member access');
  assert.strictEqual(unsupported.confidence, 'unverified');
  assert.strictEqual(result.hasUnsupportedPatterns, true);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('9. Invariant: AnalysisRuleEngine with zero findings does NOT declare a PASS verdict', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/math.ts': `
      export function add(a: number, b: number) { return a + b; }
    `,
    'tests/clean.test.ts': `
      import { add } from '../src/math';
      describe('Clean Test', () => {
        it('asserts state correctly', () => {
          const sum = add(2, 3);
          expect(sum).toBe(5);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/clean.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/math.ts',
    canonicalSymbolName: 'add',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/math.ts',
    canonicalSymbolName: 'add',
  });

  assert.strictEqual(result.findings.length, 0, 'Clean test should produce zero static findings');
  // Verify that AnalysisRuleResult has no 'verdict: PASS' field
  assert.strictEqual((result as any).verdict, undefined, 'Rule engine must not emit PASS verdict without mutation evidence');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('10. BoundaryAllowlist: Strict module-resolution evidence (no generic name heuristics)', () => {
  // Built-ins: must be recognized
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('node:fs'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('fs'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('http'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('crypto'), true);

  // Third-party packages: must be recognized
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('axios'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('@aws-sdk/client-s3'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('pg'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('ioredis'), true);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('node_modules/my-pkg/index.js'), true);

  // Internal modules: must NOT be classified as external boundaries
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('./payment-service'), false);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('../order-service'), false);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('./src/payment-service.ts'), false);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('src/services/payment-service.ts'), false);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary('/app/src/order-service.ts'), false);

  // Generic names without resolution evidence: must abstain (false)
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary(undefined), false);
  assert.strictEqual(BoundaryAllowlist.isExternalBoundary(''), false);
});

test('11. MOCKED_SUT: Internal module payment-service is correctly identified as SUT and flagged when mocked', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/payment-service.ts': `
      export class PaymentService {
        processPayment(amount: number) { return { status: 'success', amount }; }
      }
    `,
    'tests/payment.test.ts': `
      import { PaymentService } from '../src/payment-service';
      describe('PaymentService', () => {
        it('processes payment with mock replacement', () => {
          const ps = new PaymentService();
          jest.spyOn(ps, 'processPayment').mockReturnValue({ status: 'fake', amount: 0 });
          const res = ps.processPayment(100);
          expect(res.status).toBe('fake');
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/payment.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/payment-service.ts',
    canonicalSymbolName: 'processPayment',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/payment-service.ts',
    canonicalSymbolName: 'processPayment',
  });

  const mockedSut = result.findings.find(f => f.kind === 'MOCKED_SUT');
  assert.ok(mockedSut, 'Internal payment-service SUT must be flagged when its implementation is mocked');
  assert.strictEqual(mockedSut.confidence, 'high');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('12. MOCKED_SUT: Internal module order-service is correctly identified as SUT and flagged when mocked', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/order-service.ts': `
      export class OrderService {
        checkout(cartId: string) { return { cartId, approved: true }; }
      }
    `,
    'tests/order.test.ts': `
      import { OrderService } from '../src/order-service';
      describe('OrderService', () => {
        it('checks out with replaced implementation', () => {
          const os = new OrderService();
          jest.spyOn(os, 'checkout').mockImplementation(() => ({ cartId: 'mocked', approved: false }));
          const res = os.checkout('c-1');
          expect(res.approved).toBe(false);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/order.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const mockedSut = result.findings.find(f => f.kind === 'MOCKED_SUT');
  assert.ok(mockedSut, 'Internal order-service SUT must be flagged when its implementation is mocked');
  assert.strictEqual(mockedSut.confidence, 'high');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('13. MOCKED_SUT: Negative - mocking internal collaborator payment-service does NOT trigger MOCKED_SUT for order-service', () => {
  const { dir, tsconfigPath } = createTempProject({
    'src/payment-service.ts': `
      export class PaymentService {
        charge(amount: number) { return true; }
      }
    `,
    'src/order-service.ts': `
      import { PaymentService } from './payment-service';
      export class OrderService {
        constructor(private paymentService: PaymentService) {}
        checkout(amount: number) { return this.paymentService.charge(amount); }
      }
    `,
    'tests/order-integration.test.ts': `
      import { OrderService } from '../src/order-service';
      import { PaymentService } from '../src/payment-service';
      describe('OrderService Integration', () => {
        it('collaborates with payment service', () => {
          const payment = new PaymentService();
          jest.spyOn(payment, 'charge').mockReturnValue(true);
          const order = new OrderService(payment);
          const res = order.checkout(50);
          expect(res).toBe(true);
        });
      });
    `,
  });

  const ctx = TypeScriptProjectLoader.load(tsconfigPath);
  const analyzer = new JestTestAnalyzer(ctx.checker, dir, ctx.program);
  const sourceFile = ctx.program.getSourceFile(path.join(dir, 'tests/order-integration.test.ts'))!;
  const analysis = analyzer.analyzeSourceFile(sourceFile, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const engine = new AnalysisRuleEngine();
  const result = engine.analyze(analysis, {
    canonicalFilePath: 'src/order-service.ts',
    canonicalSymbolName: 'checkout',
  });

  const mockedSut = result.findings.find(f => f.kind === 'MOCKED_SUT');
  assert.strictEqual(
    mockedSut,
    undefined,
    'Mocking collaborator payment-service must NOT trigger MOCKED_SUT when order-service is SUT'
  );

  fs.rmSync(dir, { recursive: true, force: true });
});

test('14. Schema Compliance: Emitted findings satisfy finding.schema.json requirements', () => {
  const schemaPath = path.resolve('.brain/.work/contracts/v1/finding.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const allowedKinds = new Set(schema.properties.kind.enum);
  const allowedConfidences = new Set(schema.properties.confidence.enum);

  const sampleFindings = [
    {
      id: 'FINDING-1-MOCKED_SUT',
      kind: 'MOCKED_SUT',
      confidence: 'high',
      message: 'SUT is mocked',
      locations: [{ filePath: 'test.ts', span: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 } }],
      evidence: ['sample evidence'],
    },
    {
      id: 'FINDING-2-NO_ASSERTION',
      confidence: 'medium',
      kind: 'NO_ASSERTION',
      message: 'No assertions found',
      locations: [],
      evidence: ['zero assertions recorded'],
    },
    {
      id: 'FINDING-3-CALL_ONLY_ASSERTION',
      kind: 'CALL_ONLY_ASSERTION',
      confidence: 'medium',
      message: 'Only call assertions',
      locations: [],
      evidence: ['call only'],
    },
    {
      id: 'FINDING-4-MOCK_ASSERTION',
      kind: 'MOCK_ASSERTION',
      confidence: 'low',
      message: 'Advisory mock assertion',
      locations: [],
      evidence: ['mock value assertion'],
    },
    {
      id: 'FINDING-5-UNSUPPORTED_PATTERN',
      kind: 'UNSUPPORTED_PATTERN',
      confidence: 'unverified',
      message: 'Dynamic pattern',
      locations: [],
      evidence: ['unsupported pattern'],
    },
  ];

  for (const f of sampleFindings) {
    for (const req of schema.required) {
      assert.ok(req in f, `Finding must have required field '${req}'`);
    }
    assert.strictEqual(typeof f.id, 'string');
    assert.strictEqual(typeof f.message, 'string');
    assert.ok(Array.isArray(f.locations));
    assert.ok(Array.isArray(f.evidence));
    assert.ok(allowedKinds.has(f.kind), `Invalid finding kind: ${f.kind}`);
    assert.ok(allowedConfidences.has(f.confidence), `Invalid confidence: ${f.confidence}`);
  }
});
