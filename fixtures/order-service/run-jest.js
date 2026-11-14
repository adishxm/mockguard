import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import ts from 'typescript';

/**
 * Self-Contained Offline Jest-Compatible Test Runner for OrderService Fixture.
 * Enables 100% offline baseline execution and mutant evaluation without network access.
 */
async function main() {
  const args = process.argv.slice(2);
  let testMatch = '';
  let testNamePattern = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--testMatch' && i + 1 < args.length) {
      testMatch = args[++i];
    } else if (args[i].startsWith('--testMatch=')) {
      testMatch = args[i].slice('--testMatch='.length);
    } else if (args[i] === '--testNamePattern' && i + 1 < args.length) {
      testNamePattern = args[++i];
    } else if (args[i].startsWith('--testNamePattern=')) {
      testNamePattern = args[i].slice('--testNamePattern='.length);
    }
  }

  // Determine whether to run weak, strong, or baseline (default)
  const isWeak = testMatch.includes('weak') || testNamePattern.toLowerCase().includes('weak');
  const isStrong = testMatch.includes('strong') || testNamePattern.toLowerCase().includes('strong');

  // Load and transpile order-service.ts in current working directory or sandbox
  const candidates = [
    path.resolve('order-service.ts'),
    path.resolve('fixtures/order-service/order-service.ts'),
    path.join(path.dirname(process.argv[1]), 'order-service.ts'),
  ];
  const sutPath = candidates.find((c) => fs.existsSync(c));
  if (!sutPath) {
    console.error(`Error: order-service.ts not found in ${process.cwd()} or script directory`);
    process.exit(1);
  }

  const rawTs = fs.readFileSync(sutPath, 'utf-8');
  const transpiled = ts.transpileModule(rawTs, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });

  // Evaluate transpiled module using data URI
  const encoded = Buffer.from(transpiled.outputText).toString('base64');
  const mod = await import(`data:text/javascript;base64,${encoded}`);
  const { OrderService } = mod;

  // Mock functions factory
  function createMockFn(impl) {
    let resolvedVal;
    let returnVal;
    let hasResolvedVal = false;
    let hasReturnVal = false;
    const calls = [];
    const fn = function (...callArgs) {
      calls.push(callArgs);
      if (hasResolvedVal) return Promise.resolve(resolvedVal);
      if (hasReturnVal) return returnVal;
      if (impl) return impl(...callArgs);
      return undefined;
    };
    fn.mockResolvedValue = (val) => {
      resolvedVal = val;
      hasResolvedVal = true;
      return fn;
    };
    fn.mockReturnValue = (val) => {
      returnVal = val;
      hasReturnVal = true;
      return fn;
    };
    fn.mock = { calls };
    return fn;
  }

  let testPassed = 0;
  let testFailed = 0;
  const errors = [];

  const runTestCase = async (name, testFn) => {
    try {
      await testFn();
      testPassed++;
      console.log(`  ✔ ${name}`);
    } catch (err) {
      testFailed++;
      errors.push({ name, err });
      console.log(`  ✕ ${name}`);
    }
  };

  console.log(`\nPASS fixtures/order-service (${isWeak ? 'Weak Suite' : isStrong ? 'Strong Suite' : 'Default Suite'})`);

  if (isWeak || (!isWeak && !isStrong)) {
    // -------------------------------------------------------------
    // WEAK TEST SUITE (Assumes AI Mock Illusion)
    // -------------------------------------------------------------
    await runTestCase('OrderService (Weak AI Mock Test) › processes payment', async () => {
      const mockCharge = createMockFn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
      const mockGateway = { charge: mockCharge };
      const mockEvents = { emit: createMockFn() };

      const service = new OrderService(mockGateway, mockEvents);
      const result = await service.processOrder('order-123', 50);

      // WEAK ASSERTIONS:
      // Only asserts mock interaction and return value.
      // Ignores service.status, service.transactionId, events, and boundary integrity.
      assert.strictEqual(mockCharge.mock.calls.length, 1, 'mockCharge was not called');
      assert.deepStrictEqual(mockCharge.mock.calls[0], [50], 'mockCharge called with wrong amount');
      assert.strictEqual(result, true, 'processOrder result was not true');
    });
  }

  if (isStrong) {
    // -------------------------------------------------------------
    // STRONG TEST SUITE (Verifies Real Behavior & Domain State)
    // -------------------------------------------------------------
    await runTestCase('OrderService (Strong) › transitions to PAID and emits event', async () => {
      const mockCharge = createMockFn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
      const mockGateway = { charge: mockCharge };
      const emitted = [];
      const mockEvents = {
        emit: (event, payload) => emitted.push({ event, payload }),
      };

      const service = new OrderService(mockGateway, mockEvents);

      // Verify unfulfilled initial state
      assert.strictEqual(service.isFulfilled, false, 'Initial state must not be fulfilled');
      assert.strictEqual(service.status, 'PENDING', 'Initial state must be PENDING');

      const result = await service.processOrder('order-101', 150);

      // BEHAVIORAL ASSERTIONS:
      assert.strictEqual(result, true);
      assert.strictEqual(service.status, 'PAID', 'State must transition to PAID');
      assert.strictEqual(service.isFulfilled, true, 'isFulfilled must be set to true');
      assert.strictEqual(service.transactionId, 'txn-999', 'Transaction ID must be stored');
      assert.strictEqual(emitted.length, 1, 'Expected exactly 1 ORDER_FULFILLED event');
      assert.deepStrictEqual(emitted[0], {
        event: 'ORDER_FULFILLED',
        payload: { orderId: 'order-101', amount: 150, transactionId: 'txn-999' },
      });
    });

    await runTestCase('OrderService (Strong) › rejects invalid or non-positive amounts', async () => {
      const mockCharge = createMockFn().mockResolvedValue({ success: true, transactionId: 'txn-pos' });
      const mockGateway = { charge: mockCharge };
      const mockEvents = { emit: createMockFn() };
      const service = new OrderService(mockGateway, mockEvents);

      let threwZero = false;
      try {
        await service.processOrder('order-102', 0);
      } catch (err) {
        threwZero = true;
        assert.ok(err.message.includes('Invalid order amount'), 'Must throw invalid amount');
      }
      assert.strictEqual(threwZero, true, 'Zero amount must throw error');
      assert.strictEqual(service.status, 'PENDING');

      // Boundary check: amount 1 must succeed
      const posService = new OrderService(mockGateway, mockEvents);
      const posResult = await posService.processOrder('order-102-pos', 1);
      assert.strictEqual(posResult, true, 'Positive amount 1 must succeed');
      assert.strictEqual(posService.status, 'PAID');
    });

    await runTestCase('OrderService (Strong) › prevents duplicate payment on already-paid orders', async () => {
      const mockCharge = createMockFn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
      const mockGateway = { charge: mockCharge };
      const mockEvents = { emit: createMockFn() };
      const service = new OrderService(mockGateway, mockEvents);

      await service.processOrder('order-104', 100);
      assert.strictEqual(service.status, 'PAID');

      let duplicateBlocked = false;
      try {
        await service.processOrder('order-104', 100);
      } catch (err) {
        duplicateBlocked = true;
        assert.ok(err.message.includes('already been paid'), 'Must block duplicate payment');
      }
      assert.strictEqual(duplicateBlocked, true, 'Duplicate payment must throw error');
    });
  }

  // Print Jest-compatible summary lines parsed by BaselineRunner
  const total = testPassed + testFailed;
  console.log(`\nTests:       ${testPassed} passed, ${total} total`);
  console.log(`Snapshots:   0 total`);
  console.log(`Time:        0.10s`);

  if (testFailed > 0) {
    console.error(`\nTest suite failed with ${testFailed} failures:`);
    for (const e of errors) {
      console.error(`  - ${e.name}: ${e.err.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal fixture runner error:', err);
  process.exit(1);
});
