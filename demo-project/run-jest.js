import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

/**
 * Self-Contained Offline Jest-Compatible Test Runner for Demo Project.
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

  // Determine whether to run weak or strong test based on active test file or CLI flags
  let activeTestContent = '';
  const testFileCandidates = [
    path.resolve('tests/checkout.test.ts'),
    path.resolve('tests/checkout.test.js'),
    path.resolve('checkout.test.ts'),
  ];
  for (const c of testFileCandidates) {
    if (fs.existsSync(c)) {
      activeTestContent = fs.readFileSync(c, 'utf-8');
      break;
    }
  }

  const isExplicitWeak = testMatch.includes('weak') || testNamePattern.toLowerCase().includes('weak');
  const isExplicitStrong = testMatch.includes('strong') || testNamePattern.toLowerCase().includes('strong');

  // If not explicitly flagged, detect mode from active test file content
  const isWeak = isExplicitWeak || (!isExplicitStrong && (activeTestContent.includes('Weak') || activeTestContent.includes('toHaveBeenCalled')));
  const isStrong = isExplicitStrong || (!isExplicitWeak && (activeTestContent.includes('Strong') || activeTestContent.includes('CONFIRMED')));

  // Locate src/checkout.ts
  const sutCandidates = [
    path.resolve('src/checkout.ts'),
    path.resolve('checkout.ts'),
    path.join(path.dirname(process.argv[1]), 'src/checkout.ts'),
  ];
  const sutPath = sutCandidates.find((c) => fs.existsSync(c));
  if (!sutPath) {
    console.error(`Error: checkout.ts not found in ${process.cwd()} or script directory`);
    process.exit(1);
  }

  const rawTs = fs.readFileSync(sutPath, 'utf-8');

  // Transpile TypeScript to JavaScript (using typescript module or regex fallback)
  let outputJs = '';
  try {
    const ts = await import('typescript');
    const result = ts.default.transpileModule(rawTs, {
      compilerOptions: {
        module: ts.default.ModuleKind.ESNext,
        target: ts.default.ScriptTarget.ES2022,
      },
    });
    outputJs = result.outputText;
  } catch {
    // Zero-dependency fallback: strip TypeScript interfaces and type annotations
    outputJs = rawTs
      .replace(/export\s+interface[\s\S]*?}\n?/g, '')
      .replace(/:\s*CheckoutResult/g, '')
      .replace(/:\s*string/g, '')
      .replace(/:\s*boolean/g, '');
  }

  const encoded = Buffer.from(outputJs).toString('base64');
  const mod = await import(`data:text/javascript;base64,${encoded}`);
  const { checkout } = mod;

  // Mock functions factory
  function createMockFn() {
    let returnVal;
    const calls = [];
    const fn = function (...callArgs) {
      calls.push(callArgs);
      return returnVal;
    };
    fn.mockReturnValue = (val) => {
      returnVal = val;
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

  const suiteLabel = isStrong ? 'Strong Behavioral Suite' : 'Weak AI Mock Suite';
  console.log(`\nPASS demo-project (${suiteLabel})`);

  if (!isStrong) {
    // -------------------------------------------------------------
    // 1. WEAK AI-GENERATED TEST SUITE
    // -------------------------------------------------------------
    await runTestCase('processes successful payment', async () => {
      const payment = createMockFn().mockReturnValue({
        status: 'SUCCESS',
      });

      payment();

      // ⚠️ WEAK ASSERTION:
      // Only asserts that the mock was invoked!
      // Makes zero checks on checkout('SUCCESS') result, orderStatus, or fulfillmentEvent.
      assert.strictEqual(payment.mock.calls.length, 1, 'Payment mock was not called');
    });
  } else {
    // -------------------------------------------------------------
    // 2. STRONG BEHAVIORAL TEST SUITE
    // -------------------------------------------------------------
    await runTestCase('confirms the order after successful payment', async () => {
      const result = checkout('SUCCESS');

      // ✅ STRONG BEHAVIORAL ASSERTIONS:
      // Validates the actual application state and outcome of the business logic.
      assert.ok(result, 'Expected result object from checkout');
      assert.strictEqual(result.orderStatus, 'CONFIRMED', 'Expected orderStatus to be CONFIRMED');
      assert.strictEqual(result.fulfillmentEvent, true, 'Expected fulfillmentEvent to be true');
    });

    await runTestCase('cancels order when payment is not successful', async () => {
      const result = checkout('FAILED');

      assert.ok(result, 'Expected result object from checkout');
      assert.strictEqual(result.orderStatus, 'CANCELLED', 'Expected orderStatus to be CANCELLED');
      assert.strictEqual(result.fulfillmentEvent, false, 'Expected fulfillmentEvent to be false');
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
  console.error('Fatal fixture runner error:', err);
  process.exit(1);
});

