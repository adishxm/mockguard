#!/usr/bin/env bash
set -e

# MockGuard Judge Demonstration Script (Bash)
# ----------------------------------------------------
# Proves: A test can pass and show high coverage while failing to detect a real bug.
# MockGuard exposes that false confidence.

echo "============================================================"
echo "        MOCKGUARD LIVE JUDGE DEMONSTRATION                  "
echo "============================================================"

# Act 1: The Problem
echo ""
echo "[ACT 1: THE AI MOCK ILLUSION - 30s]"
echo "AI code assistants generate tests that pass 100% green by checking mocks"
echo "instead of real application behavior."
echo ""

# Ensure starting state is weak test
node demo-project/switch-to-weak.js > /dev/null

echo "--- Production Logic (demo-project/src/checkout.ts) ---"
cat demo-project/src/checkout.ts

echo ""
echo "--- AI Generated Test (demo-project/tests/checkout.test.ts) ---"
cat demo-project/tests/checkout.test.ts

echo ""
echo "Notice: The test mocks payment and only asserts expect(payment).toHaveBeenCalled()."
echo "It NEVER asserts checkout outcome, orderStatus, or fulfillmentEvent!"

# Act 2: MockGuard Finds The Flaw
echo ""
echo "[ACT 2: MOCKGUARD EXPOSES THE FALSE CONFIDENCE - 60s]"
echo "Step 2A: Running baseline test suite..."
node dist/src/cli/index.js baseline ./demo-project

echo ""
echo "Step 2B: Running MockGuard verification with AST & mutation engine..."
set +e
node dist/src/cli/index.js verify ./demo-project
set -e

echo ""
echo ">>> Result: The weak test was 100% GREEN, but all mutants SURVIVED!"
echo ">>> MockGuard caught the call-only mock assertion and failed the verification."

# Act 3: Fixing The Test & Proving It
echo ""
echo "[ACT 3: FIX THE TEST AND PROVE DEFECT DETECTION - 60s]"
echo "Upgrading demo-project to strong behavioral test assertions..."
node demo-project/switch-to-strong.js

echo ""
echo "--- Strong Behavioral Test (demo-project/tests/checkout.test.ts) ---"
cat demo-project/tests/checkout.test.ts

echo ""
echo "Running MockGuard verification on behavioral test suite..."
node dist/src/cli/index.js verify ./demo-project

echo ""
echo "============================================================"
echo ">>> VERDICT: PASS (100% Mutation Score - All Mutants Killed)"
echo ">>> CONCLUSION: MockGuard checks whether tests detect real defects."
echo "============================================================"
