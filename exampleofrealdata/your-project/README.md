# E-Commerce Checkout Service (`your-project`)

> A target TypeScript project designed specifically for testing and benchmarking **MockGuard** (HackMatrix Problem Statement #41).

This project demonstrates the **False-Green Trap**: an AI-generated test suite that achieves green status and passes baseline checks, but tests only mock interactions instead of observable domain state.

---

## Project Structure

```text
your-project/
├── package.json               # Test script and dependencies
├── tsconfig.json              # TypeScript configuration for MockGuard static analysis
├── jest.config.js             # Jest configuration
├── run-jest.js                # High-speed offline Jest runner (used by MockGuard mutation sandboxes)
├── switch-tests.js            # Toggle between weak and strong test suites
├── src/
│   ├── index.ts               # Module exports
│   └── services/
│       └── checkout.ts        # Production SUT (CheckoutService with business logic & mutation sites)
├── tests/
│   └── checkout.test.ts       # Active test suite evaluated by Jest and MockGuard
└── templates/
    ├── checkout.weak.test.ts  # Weak AI-generated mock test (triggers CALL_ONLY_ASSERTION, mutants survive)
    └── checkout.strong.test.ts# Strong behavioral test (asserts state & events, kills all mutants)
```

---

## 1. Quick Test Run

Run tests directly in this project:

```bash
cd your-project
npm test
```

Expected output:
```text
PASS tests/checkout.test.ts (Weak AI Mock Suite)
  ✔ confirms an order after successful payment

Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.05s
```

---

## 2. Testing with MockGuard (From `mockguard` repo)

Navigate to your MockGuard repository:

```powershell
cd ..\mockguard
```

### Step A: Run Baseline
```powershell
node dist\src\cli\index.js baseline ..\your-project
```
**Expected Result:**
```text
Baseline: PASS (1/1 tests passed)
Verdict: UNVERIFIED
```

### Step B: Run Verification on the Weak AI Test Suite (Default)
```powershell
node dist\src\cli\index.js verify ..\your-project --max-mutants 5 --concurrency 1
```
**Expected Result:**
- **Baseline**: PASS
- **Static Findings**: `[MEDIUM] CALL_ONLY_ASSERTION` (test asserts only on `toHaveBeenCalledWith`)
- **Mutants**: 1 killed, 4 survived
- **Verdict**: `FAIL` (Exit code: 1)
- **Gemini Advisory**: Suggests asserting observable state postconditions (`orderStatus === 'PAID'`, etc.)

### Step C: Save JSON Report
```powershell
New-Item -ItemType Directory -Force mockguard-results
node dist\src\cli\index.js verify ..\your-project --max-mutants 5 --concurrency 1 --format json --out mockguard-results\first-run.json
Get-Content mockguard-results\first-run.json
```

---

## 3. Upgrading to Strong Behavioral Tests

Switch the test suite to strong behavioral assertions:

```powershell
cd ..\your-project
npm run use:strong
```

Run baseline and verification again from MockGuard:

```powershell
cd ..\mockguard
node dist\src\cli\index.js verify ..\your-project --max-mutants 5 --concurrency 1
```

**Expected Result:**
- **Baseline**: PASS (3/3 tests passed)
- **Static Findings**: 0 (no weak mock patterns)
- **Mutants**: 5 killed, 0 survived
- **Mutation Score**: 100%
- **Verdict**: `PASS` (Exit code: 0)

To switch back to the weak test suite:

```powershell
cd ..\your-project
npm run use:weak
```

---

## 4. Testing Specific Filters

### Run specific test pattern:
```powershell
node dist\src\cli\index.js verify ..\your-project --test-match "checkout"
```

### Limit mutation to services directory:
```powershell
node dist\src\cli\index.js verify ..\your-project --include "src/services" --max-mutants 5
```

### Timeout and Mutant Limit:
```powershell
node dist\src\cli\index.js verify ..\your-project --timeout 10000 --max-mutants 3
```

