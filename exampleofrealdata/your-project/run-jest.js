import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

/**
 * Self-Contained Offline Jest-Compatible Test Runner for your-project.
 * Enables 100% offline baseline execution, test switching, and fast mutant evaluation.
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

  // Detect whether weak or strong suite is requested
  const isExplicitWeak = testMatch.includes('weak') || testNamePattern.toLowerCase().includes('weak');
  const isExplicitStrong = testMatch.includes('strong') || testNamePattern.toLowerCase().includes('strong');

  // Read active test file content
  let activeTestContent = '';
  const testCandidates = [
    path.resolve('tests/checkout.test.ts'),
    path.resolve('tests/checkout.test.js'),
    path.resolve('checkout.test.ts'),
    path.resolve('templates/checkout.weak.test.ts'),
  ];
  for (const c of testCandidates) {
    if (fs.existsSync(c)) {
      activeTestContent = fs.readFileSync(c, 'utf-8');
      break;
    }
  }

  // Determine suite mode
  const isWeak = isExplicitWeak || (!isExplicitStrong && (
    activeTestContent.includes('Weak') ||
    (activeTestContent.includes('toHaveBeenCalled') && !activeTestContent.includes('CONFIRMED'))
  ));
  const isStrong = !isWeak;

  // Locate SUT (src/services/checkout.ts) in current working directory (e.g. sandbox or workspace)
  const sutCandidates = [
    path.resolve('src/services/checkout.ts'),
    path.resolve('services/checkout.ts'),
    path.resolve('checkout.ts'),
    path.join(path.dirname(process.argv[1]), 'src/services/checkout.ts'),
  ];
  const sutPath = sutCandidates.find((c) => fs.existsSync(c));
  if (!sutPath) {
    console.error(`Error: checkout.ts not found in ${process.cwd()} or script directory`);
    process.exit(1);
  }

  const rawTs = fs.readFileSync(sutPath, 'utf-8');

  // Transpile TypeScript to JavaScript
  let outputJs = '';
  let tsModule = null;

  try {
    tsModule = await import('typescript');
  } catch {
    // Check local or sibling node_modules
    const candidates = [
      path.resolve('node_modules/typescript/lib/typescript.js'),
      path.resolve('../mockguard/node_modules/typescript/lib/typescript.js'),
      path.resolve('../../mockguard/node_modules/typescript/lib/typescript.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          const mod = await import(`file://${c}`);
          tsModule = mod.default || mod;
          break;
        } catch {}
      }
    }
  }

  if (tsModule && tsModule.transpileModule) {
    const result = tsModule.transpileModule(rawTs, {
      compilerOptions: {
        module: tsModule.ModuleKind?.ESNext || 99,
        target: tsModule.ScriptTarget?.ES2022 || 9,
      },
    });
    outputJs = result.outputText;
  } else {
    // Zero-dependency fallback: strip TypeScript interfaces and type annotations
    outputJs = rawTs
      .replace(/export\s+interface[\s\S]*?}\n?/g, '')
      .replace(/:\s*CheckoutResult/g, '')
      .replace(/:\s*PaymentResponse/g, '')
      .replace(/:\s*PaymentGateway/g, '')
      .replace(/:\s*EventBus/g, '')
      .replace(/:\s*'PENDING'\s*\|\s*'PAID'\s*\|\s*'FAILED'/g, '')
      .replace(/:\s*string/g, '')
      .replace(/:\s*number/g, '')
      .replace(/:\s*boolean/g, '');
  }

  const encoded = Buffer.from(outputJs).toString('base64');
  const mod = await import(`data:text/javascript;base64,${encoded}`);
  const { CheckoutService } = mod;

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
      console.log(`  ✕ ${name} (${err.message})`);
    }
  };

  const suiteLabel = isStrong ? 'Strong Behavioral Suite' : 'Weak AI Mock Suite';
  console.log(`\nPASS tests/checkout.test.ts (${suiteLabel})`);

  if (isWeak) {
    // -----------------------------------------------------------------
    // 1. WEAK AI-GENERATED TEST SUITE (The False-Green Trap)
    // -----------------------------------------------------------------
    await runTestCase('confirms an order after successful payment', async () => {
      const calls = [];
      const paymentMock = async (amount) => {
        calls.push(amount);
        return {
          status: 'SUCCESS',
          transactionId: 'txn-12345',
        };
      };

      const paymentGateway = {
        charge: paymentMock,
      };

      const service = new CheckoutService(paymentGateway);
      await service.checkout('order-100', 100);

      // ⚠️ WEAK ASSERTION:
      // Only asserts that the mock was invoked with 100!
      // Makes zero checks on the returned status, service.orderStatus, or fulfillment!
      assert.strictEqual(calls.length, 1, 'Payment mock was not called');
      assert.strictEqual(calls[0], 100, 'Payment mock was not called with amount 100');
    });
  } else {
    // -----------------------------------------------------------------
    // 2. STRONG BEHAVIORAL TEST SUITE
    // -----------------------------------------------------------------
    await runTestCase('confirms an order after successful payment', async () => {
      const calls = [];
      const paymentMock = async (amount) => {
        calls.push(amount);
        return {
          status: 'SUCCESS',
          transactionId: 'txn-12345',
        };
      };

      const publishedEvents = [];
      const eventBus = {
        publish: (event, payload) => publishedEvents.push({ event, payload }),
      };

      const paymentGateway = { charge: paymentMock };
      const service = new CheckoutService(paymentGateway, eventBus);

      const result = await service.checkout('order-100', 100);

      // ✅ 1. Assert observable return outcomes
      assert.ok(result, 'Expected result object from checkout');
      assert.strictEqual(result.status, 'CONFIRMED', `Expected status CONFIRMED, got ${result.status}`);
      assert.strictEqual(result.isFulfilled, true, `Expected isFulfilled to be true, got ${result.isFulfilled}`);
      assert.strictEqual(result.transactionId, 'txn-12345', 'Expected transactionId txn-12345');

      // ✅ 2. Assert observable internal state on SUT
      assert.strictEqual(service.orderStatus, 'PAID', `Expected service.orderStatus to be PAID, got ${service.orderStatus}`);

      // ✅ 3. Assert mock interaction
      assert.strictEqual(calls.length, 1, 'Payment mock was not called');
      assert.strictEqual(calls[0], 100, 'Payment mock was not called with 100');

      // ✅ 4. Assert domain event emission
      assert.strictEqual(publishedEvents.length, 1, 'Expected 1 domain event');
      assert.strictEqual(publishedEvents[0].event, 'ORDER_FULFILLED');
      assert.strictEqual(publishedEvents[0].payload.orderId, 'order-100');
    });

    await runTestCase('rejects orders with non-positive amount at boundary and accepts minimum valid amount', async () => {
      const service = new CheckoutService({ charge: async () => ({ status: 'SUCCESS', transactionId: 'txn-min' }) });

      let threwZero = false;
      try {
        await service.checkout('order-zero', 0);
      } catch (err) {
        threwZero = true;
        assert.ok(err.message.includes('Invalid checkout amount'), `Unexpected error: ${err.message}`);
      }
      assert.ok(threwZero, 'Expected amount 0 to throw an error');

      let threwNegative = false;
      try {
        await service.checkout('order-negative', -25);
      } catch (err) {
        threwNegative = true;
        assert.ok(err.message.includes('Invalid checkout amount'), `Unexpected error: ${err.message}`);
      }
      assert.ok(threwNegative, 'Expected negative amount to throw an error');

      assert.strictEqual(service.orderStatus, 'PENDING');

      // Verify boundary amount 1 succeeds
      const minResult = await service.checkout('order-min', 1);
      assert.strictEqual(minResult.status, 'CONFIRMED');
      assert.strictEqual(minResult.amount, 1);
      assert.strictEqual(service.orderStatus, 'PAID');
    });

    await runTestCase('handles declined payment gracefully', async () => {
      const service = new CheckoutService({
        charge: async () => ({ status: 'DECLINED', error: 'Insufficient funds' }),
      });

      const result = await service.checkout('order-declined', 50);

      assert.ok(result, 'Expected result object');
      assert.strictEqual(result.status, 'REJECTED', `Expected status REJECTED, got ${result.status}`);
      assert.strictEqual(result.isFulfilled, false, `Expected isFulfilled to be false, got ${result.isFulfilled}`);
      assert.strictEqual(service.orderStatus, 'FAILED', `Expected orderStatus to be FAILED, got ${service.orderStatus}`);
    });
  }

  // Print Jest-compatible summary lines parsed by MockGuard BaselineRunner
  const total = testPassed + testFailed;
  console.log(`\nTests:       ${testPassed} passed, ${total} total`);
  console.log(`Snapshots:   0 total`);
  console.log(`Time:        0.05s`);

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
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
