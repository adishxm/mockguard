# MockGuard Real-Time External Repository Verification Guide

**Location**: `.brain/.demo/REALTIME_PROJECT_CHECKING_GUIDE.md`  
**Purpose**: Step-by-step operating runbook when a hackathon judge provides a **separate, live external repository URL** and requests you to verify it with MockGuard in real time.

---

## 1. Executive Scenario: The Judge's Live Challenge

> **Judge Scenario**:  
> *"That demo was great, but can you run MockGuard right now against this external repository to prove it works on unseen code?"*

MockGuard is architected for zero-configuration project discovery on standard TypeScript/JavaScript Jest repositories. You can clone and verify an external repository in **under 90 seconds** without modifying a single line of the judge's code.

---

## 2. Fast-Path Execution Runbook (PowerShell)

### Step 1: Clone the Judge-Provided Repository
Open PowerShell and clone the target project into your workspace:

```powershell
# Navigate to workspace parent
cd C:\Users\adity\OneDrive\Desktop\HackMatrix-Practise

# Clone the judge's repo
git clone <JUDGE_REPO_URL> judge-project

# Navigate into the judge's project
cd judge-project
```

---

### Step 2: Install Dependencies & Verify Original Tests
Confirm that the judge's repository currently compiles and passes tests natively:

```powershell
# Install project dependencies
npm install

# Run their original test suite
npm test
```

> [!IMPORTANT]
> **Safety Rule**: If the judge's original test suite fails before running MockGuard, point this out immediately! MockGuard enforces the invariant that **mutation testing is only valid when the original suite passes**.

---

### Step 3: Switch to MockGuard & Create Results Folder

```powershell
# Return to the MockGuard directory
cd ..\mockguard

# Ensure output directory exists
New-Item -ItemType Directory -Force mockguard-results | Out-Null
```

---

### Step 4: Run Baseline Verification
Run MockGuard's baseline verification to guarantee baseline isolation:

```powershell
node dist\src\cli\index.js baseline ..\judge-project
# Or using the global CLI:
# mockguard baseline ..\judge-project
```

**Expected Outcome**:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT
======================================================
Verdict:         UNVERIFIED
Baseline:        PASS (X/X tests passed)
------------------------------------------------------
Sandbox status:  sandboxed: false (local execution)
======================================================
```

---

### Step 5: Run Full MockGuard Verification (Bounded Sandbox)
Run full static AST inspection and deterministic mutation analysis with bounded constraints:

```powershell
node dist\src\cli\index.js verify ..\judge-project `
  --max-mutants 5 `
  --concurrency 1 `
  --format json `
  --out mockguard-results\judge-report.json
```

---

### Step 6: Check the Exit Code
Check the process exit code in PowerShell:

```powershell
$LASTEXITCODE
```

- **Exit Code `1`**: **FINDINGS DETECTED** (Surviving mutants or call-only mock assertions caught; weak tests exposed!).
- **Exit Code `0`**: **PASS** (100% of analyzed mutants were killed; robust behavioral tests!).
- **Exit Code `2`**: **BASELINE FAILED** (The judge's original tests were already broken).
- **Exit Code `3`**: **TIMEOUT** (Test runner hung or exceeded timeout bounds).

---

### Step 7: Preserve the Original Report
Always preserve the pristine original report before making any edits:

```powershell
Copy-Item mockguard-results\judge-report.json `
  mockguard-results\judge-report-original.json
```

---

### Step 8: Inspect Key JSON Evidence (PowerShell One-Liner)

```powershell
(Get-Content mockguard-results\judge-report.json | ConvertFrom-Json) | `
  Select-Object verdict, baseline, mutation, analysis
```

---

## 3. How to Present the Real-Time Findings to the Judge

When the verification completes, present the results using this framework:

### If Verdict is FAIL (Exit Code 1) — *The Standard "AI Mock Illusion" Outcome*
1. **Point to Baseline**:
   > *"Notice that the repository's baseline test suite passed 100% green. To traditional CI and code coverage tools, this repository appears fully protected."*
2. **Point to Static Findings**:
   > *"MockGuard's AST analyzer detected `CALL_ONLY_ASSERTION`. The test is asserting `expect(mock).toHaveBeenCalled()` rather than validating actual state transitions or return values."*
3. **Point to Mutation Score**:
   > *"MockGuard introduced controlled behavioral changes into their production code in a temporary sandbox. The tests still passed! X mutants survived, giving a mutation score of Y%. This proves the test suite gives false confidence."*
4. **Point to Google Gemini Advisory**:
   > *"Notice the Google Gemini Advisory card below: Gemini identified the exact root cause in their codebase and synthesized the specific assertion needed to kill the mutant."*

---

### If Verdict is PASS (Exit Code 0)
1. **Compliment the Codebase**:
   > *"All generated mutants were killed immediately by their test suite (100% mutation score). This proves their tests are genuine behavioral tests asserting domain outcomes rather than mock invocations."*

---

## 4. Handling Real-World Variations in Judge Repositories

| Repository Pattern | Recommended Command / Flag | Explanation |
|---|---|---|
| **Large Codebase (>50 files)** | `--include "src/services"` or `--max-mutants 5` | Bounds mutation run to 15–30 seconds instead of evaluating hundreds of files. |
| **Monorepo (Lerna / Turborepo / Nx)** | Point directly to package: `..\judge-project\packages\core` | Targets the specific service under inspection. |
| **Explicit Jest Config** | `-c ..\judge-project\jest.config.js` | Directs MockGuard to the custom Jest configuration file. |
| **Filter Specific Test Suite** | `--test-match "user"` or `-t "checkout"` | Runs only tests matching the name or glob pattern. |
| **Slow Test Suite** | `--timeout 20000 --max-mutants 3` | Prevents timeouts on heavy test suites. |

---

## 5. Live Gemini Advisory on Judge's Codebase

To show live AI-assisted remediation directly on the judge's repository:

```powershell
# Set your Google AI Studio API key
$env:GEMINI_API_KEY = "your-google-ai-studio-key"

# Re-run verify on judge repo
node dist\src\cli\index.js verify ..\judge-project --max-mutants 3
```

MockGuard will automatically:
1. Detect surviving mutants in the judge's code.
2. Query Google AI Studio live (`gemini-2.5-flash`).
3. Display the **Active Gemini Advisory** card with exact line numbers and proposed test fixes tailored to the judge's repository.

---

## 6. Real-Time Copy-Paste Cheat Sheet

```powershell
# Complete 1-Minute Judge Project Check
cd C:\Users\adity\OneDrive\Desktop\HackMatrix-Practise
git clone <JUDGE_REPO_URL> judge-project
cd judge-project; npm install; npm test; cd ..\mockguard

# Baseline run
node dist\src\cli\index.js baseline ..\judge-project

# Verify run
node dist\src\cli\index.js verify ..\judge-project --max-mutants 5 --concurrency 1 --format json --out mockguard-results\judge-report.json

# Check exit code & summary
$LASTEXITCODE
(Get-Content mockguard-results\judge-report.json | ConvertFrom-Json) | Select-Object verdict, baseline, mutation
```
