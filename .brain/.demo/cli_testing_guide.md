# MockGuard In-Depth CLI Testing & Verification Guide

**Repository**: `https://github.com/adishxm/mockguard`  
**Problem Statement**: HackMatrix PS #41 — *"AI-generated tests test the mock, not the code"*  
**Target Audience**: Developers, QA Engineers, CI/CD Architects, and Hackathon Evaluators  
**File Location**: `.brain/.demo/cli_testing_guide.md`

---

## 1. Introduction & CLI Architecture

MockGuard's Command Line Interface (`mockguard`) is built following strict **Unix philosophy principles**:
- **Composable**: Outputs clean, human-readable terminal summaries by default, or machine-parseable JSON streams when requested (`--format json`).
- **Deterministic Exit Codes**: Every execution state maps to a standardized exit code, allowing straightforward integration into pre-commit hooks, GitHub Actions, and gating scripts.
- **Defensive & Bounded**: Built-in process supervision kills runaway child processes, enforces memory caps (10MB output bounding), and redacts detected credentials in log streams.
- **Zero-Dependency Core**: Executes with native Node.js ESM without requiring heavy runtime frameworks.

### Global & Local Invocation

You can invoke MockGuard through any of the following mechanisms:

```bash
# 1. Local compiled entrypoint (recommended during development)
node dist/src/cli/index.js [command] [target-directory] [options]

# 2. Via npm package script
npm run demo:cli

# 3. Via npx (when linked or installed globally)
npx mockguard [command] [target-directory] [options]
```

---

## 2. Command Reference

| Command | Usage | Description |
|---|---|---|
| `verify` | `mockguard verify [dir] [options]` | **Default command**. Runs project discovery, verifies baseline tests pass, and conducts bounded mutation testing to prove behavioral assertions kill mutants. |
| `baseline` | `mockguard baseline [dir] [options]` | Runs the unmutated test suite only. Verifies baseline sanity without triggering mutation injection. |
| `help` | `mockguard --help` / `-h` | Prints the complete CLI help documentation and available options. |
| `version` | `mockguard --version` / `-v` | Prints the installed MockGuard version (`mockguard 0.1.0`). |

---

## 3. CLI Flags & Options Specification

| Flag | Long Option | Argument Type | Default | Description |
|---|---|---|---|---|
| `-c` | `--config <file>` | `string` (path) | Auto-discovered | Explicit path to `jest.config.(js\|ts\|json)`. Bypasses automatic discovery. |
| `-f` | `--format <format>` | `'terminal' \| 'json'` | `'terminal'` | Output format. `terminal` outputs ANSI color-coded tables; `json` outputs raw JSON. |
| `-o` | `--out <file>` | `string` (path) | `undefined` | Writes the structured verification report to the specified file path. |
| | `--timeout <ms>` | `integer` (> 0) | `60000` | Process execution timeout in milliseconds. Kills hung processes on expiration. |
| | `--concurrency <n>` | `integer` (> 0) | `1` | Maximum parallel worker processes for mutation evaluation. |
| | `--testMatch <glob>` | `string` (glob) | `undefined` | Glob pattern to filter test files (e.g., `'**/*.behavior.test.ts'`). |
| `-t` | `--testNamePattern <p>` | `string` (regex) | `undefined` | Filters tests matching the given name pattern (forwarded to test runner). |
| | `--changed` | `boolean` | `false` | Git-aware execution: only runs tests for files modified relative to git HEAD. |
| | `--bail` | `boolean` | `false` | Fail-fast mode: terminates mutation testing immediately on the first surviving mutant. |
| `-h` | `--help` | `boolean` | `false` | Displays usage and help text, then exits with code `0`. |
| `-v` | `--version` | `boolean` | `false` | Displays the current version, then exits with code `0`. |

---

## 4. Standard Exit Codes & Operational Invariants

MockGuard uses deterministic exit codes to communicate test verdicts to CI/CD pipelines:

```mermaid
flowchart TD
    Start([Start mockguard CLI]) --> ParseArgs[Parse CLI Arguments]
    ParseArgs -- Invalid Flag / Syntax --> Exit4[Exit 4: CONFIG_ERROR]
    ParseArgs -- Valid Flags --> Discover[Discover Project & Jest Config]
    Discover -- Bad Config / Malformed JSON --> Exit4
    Discover -- Valid --> Baseline[Execute Unmutated Baseline Suite]
    
    Baseline -- Process Hangs (> Timeout) --> Exit3[Exit 3: TIMEOUT]
    Baseline -- Any Test Fails --> Exit2[Exit 2: BASELINE_FAILED<br/>Invariant: Mutation Blocked]
    
    Baseline -- All Tests Pass --> Mutate[Inject Bounded Deterministic Mutants]
    Mutate -- Any Mutant Survives --> Exit1[Exit 1: FINDINGS_DETECTED<br/>AI Test Verified Mock Only]
    Mutate -- 100% Mutants Killed --> Exit0[Exit 0: SUCCESS<br/>Behavioral Contracts Protected]
```

### Exit Code Reference Table

| Exit Code | Constant Name | Cause & Meaning | Recommended Action |
|:---:|---|---|---|
| **`0`** | `SUCCESS` | Baseline passed AND 100% of injected mutants were killed by test assertions. | Ready to merge. The test suite verifies real business logic. |
| **`1`** | `FINDINGS_DETECTED` | Baseline passed, but one or more mutants **survived** (or AST mock rule warnings triggered). | **PR Blocked**: The test suite asserts mock interactions rather than real behavior. Consult Gemini Advisory or rewrite assertions. |
| **`2`** | `BASELINE_FAILED` | The unmutated codebase has failing tests. | **Mutation Aborted**: MockGuard will never evaluate mutations on broken code. Fix existing test failures first. Mutation score is `null`. |
| **`3`** | `TIMEOUT` | A test process exceeded the bounded timeout (`--timeout`). | Inspect the test suite for runaway `while(true)` loops, unhandled Promises, or deadlock. |
| **`4`** | `CONFIG_ERROR` | Unknown CLI flag, invalid value, missing required path, or malformed `package.json`. | Check CLI syntax via `mockguard --help` and verify configuration files. |
| **`5`** | `INTERNAL_ERROR` | Unhandled runtime exception or filesystem permission error. | Check runner logs in `os.tmpdir()/mockguard-runs/`. |

---

## 5. In-Depth Step-by-Step CLI Walkthrough Scenarios

### Scenario 1: CLI Help & Version Verification

Verify the CLI binary is compiled and accessible:

```bash
# Display version
node dist/src/cli/index.js --version
# Output: mockguard 0.1.0

# Display full usage manual
node dist/src/cli/index.js --help
```

*Expected Exit Code*: `0`

---

### Scenario 2: Running Baseline Verification on Clean Projects

Execute the baseline runner to confirm existing unit tests pass before applying mutations:

```bash
# Run baseline on current workspace
node dist/src/cli/index.js baseline .
```

*Terminal Output*:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT          
======================================================
Verdict:         PASS
Commit:          9197923be1fd72753a3036b7f8e9b934d9eb4b25
Baseline:        PASS (53/53 tests passed)
------------------------------------------------------
Sandbox status:  sandboxed: false (local execution)
======================================================
```

*Expected Exit Code*: `0`

---

### Scenario 3: Testing Failure Modes — Detecting AI Mock Tests (Exit Code 1)

This scenario demonstrates the primary purpose of MockGuard: detecting when an AI-generated test passes baseline but fails mutation testing because it verifies mocks instead of code.

```bash
# Execute verification against the weak AI mock test fixture
node dist/src/cli/index.js verify fixtures/order-service --testMatch "**/*weak.test.ts"
```

*Terminal Output*:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT          
======================================================
Verdict:         VERIFICATION_FAILED
Commit:          9197923be1fd72753a3036b7f8e9b934d9eb4b25
Baseline:        PASS (1/1 tests passed)
Static Findings: 1 warning detected
  [MG-RULE-001] Mock-Only Assertion (Confidence: 0.95)
Mutation Score:  0.0% (0 killed / 3 total)
  ❌ Mutant M1 (BoundaryConditionReplacement): SURVIVED
  ❌ Mutant M2 (StateMutation): SURVIVED
  ❌ Mutant M3 (EventEmissionDeletion): SURVIVED
------------------------------------------------------
Recommendation:  Tests assert mock calls (expect(mock).toHaveBeenCalledWith)
                 without asserting observable SUT state or emitted events.
======================================================
```

*Expected Exit Code*: `1` (Verification Failed)

---

### Scenario 4: Verifying Strong Behavioral Tests (Exit Code 0)

Execute verification against strong behavioral tests that verify state, domain events, and error boundaries:

```bash
# Execute verification against the strong behavioral test fixture
node dist/src/cli/index.js verify fixtures/order-service --testMatch "**/*strong.test.ts"
```

*Terminal Output*:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT          
======================================================
Verdict:         SUCCESS
Commit:          9197923be1fd72753a3036b7f8e9b934d9eb4b25
Baseline:        PASS (1/1 tests passed)
Static Findings: 0 warnings
Mutation Score:  100.0% (3 killed / 3 total)
  ✔ Mutant M1 (BoundaryConditionReplacement): KILLED
  ✔ Mutant M2 (StateMutation): KILLED
  ✔ Mutant M3 (EventEmissionDeletion): KILLED
------------------------------------------------------
All mutants killed. Test suite verifies real business logic.
======================================================
```

*Expected Exit Code*: `0` (Success)

---

### Scenario 5: Machine-Readable JSON Output & jq Integration

MockGuard supports emitting structured JSON reports for automated CI/CD aggregation and tooling consumption:

```bash
# Emit JSON to stdout
node dist/src/cli/index.js baseline . --format json

# Or write JSON report to a file
node dist/src/cli/index.js baseline . --format json --out dist/reports/audit.json
```

*Sample JSON Output Structure*:
```json
{
  "schemaVersion": "1.0.0",
  "runId": "run-a1b2c3d4e5f6",
  "timestamp": "2026-11-14T13:00:00.000Z",
  "project": {
    "projectRoot": "C:\\Users\\adity\\OneDrive\\Desktop\\HackMatrix",
    "hasPackageJson": true,
    "isMonorepo": false,
    "commit": "9197923be1fd72753a3036b7f8e9b934d9eb4b25"
  },
  "baseline": {
    "status": "PASS",
    "testsPassed": 53,
    "testsFailed": 0,
    "testsTotal": 53,
    "durationMs": 4200
  },
  "verdict": "PASS"
}
```

*Querying with jq in CI*:
```bash
# Extract verdict
cat dist/reports/audit.json | jq -r '.verdict'

# Assert 100% baseline pass rate
cat dist/reports/audit.json | jq -e '.baseline.testsFailed == 0'
```

---

### Scenario 6: Broken Baseline Safety Invariant (Exit Code 2)

MockGuard enforces a strict safety invariant: **Never compute mutation score on a broken baseline.**

If an unmutated unit test fails, MockGuard terminates immediately and reports `BASELINE_FAILED`:

```bash
# Simulating a broken test suite
node dist/src/cli/index.js verify . --testNamePattern "NonExistentFailingPattern"
```

*Operational Characteristics*:
- Mutation testing is **never started** (saving CPU cycles and preventing false mutation attribution).
- Mutation score is explicitly set to `null` (not 0%).
- Exit code is `2`.

---

### Scenario 7: Bounded Timeouts & Process Supervision (Exit Code 4)

Protect CI environments from infinite loops or hanging async operations:

```bash
# Enforce a 5-second hard timeout
node dist/src/cli/index.js verify . --timeout 5000
```

*Behavior*:
- If a test hangs or runs an infinite loop (`while(true)`), MockGuard's `BoundedProcessSupervisor` forcibly terminates the process tree (`SIGTERM` followed by `SIGKILL` on POSIX, process termination on Windows).
- Logs are preserved up to the point of cancellation.
- Exit code is `4` (`TIMEOUT`).

---

### Scenario 8: Automated Secret Redaction in CLI Logs

To prevent accidental leak of tokens and credentials in CI stdout or report artifacts, MockGuard scans all process output with `SecretRedactor`:

```bash
# Any output containing credentials is sanitized on the fly:
# "ghp_1234567890abcdef"         --> "[REDACTED_SECRET]"
# "AKIAIOSFODNN7EXAMPLE"         --> "[REDACTED_SECRET]"
# "Bearer eyJhbGciOi..."          --> "Bearer [REDACTED_SECRET]"
```

Verify in artifacts:
```bash
# Inspect generated baseline logs in temp directory
cat $(node -e "console.log(os.tmpdir())")/mockguard-runs/*/baseline.stdout.log
```

---

## 6. Enterprise CI/CD Pipeline Recipes

### GitHub Actions Integration (`.github/workflows/mockguard.yml`)

```yaml
name: MockGuard Behavioral Gate
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Needed for --changed git tracking

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      # Run MockGuard CLI in fail-fast mode
      - name: Verify Behavioral Integrity
        run: |
          node dist/src/cli/index.js verify . \
            --format json \
            --out mockguard-report.json \
            --bail

      - name: Archive Verification Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mockguard-report
          path: mockguard-report.json
```

### Pre-Commit / Pre-Push Git Hook (`.husky/pre-push`)

```bash
#!/bin/sh
echo "🛡️ Running MockGuard Pre-Push Verification..."

# Only test files changed relative to origin/main
node dist/src/cli/index.js verify . --changed --bail

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ MockGuard rejected push: AI-generated tests contain mock-only assertions!"
  exit $EXIT_CODE
fi

echo "✅ MockGuard verified: Tests verify real behavior."
exit 0
```

---

## 7. CLI Troubleshooting & Common Pitfalls

| Issue / Symptom | Root Cause | Solution |
|---|---|---|
| `Exit Code 3: Flag --timeout requires a positive integer` | Passed a non-numeric argument (e.g. `--timeout fast`) | Pass milliseconds as an integer (e.g. `--timeout 30000`). |
| `Exit Code 3: Invalid format "xml"` | Only `terminal` and `json` are valid formats. | Use `--format terminal` or `--format json`. |
| `Exit Code 2: BASELINE_FAILED` | Existing tests fail without any mutations. | Run `npm test` directly to resolve failing tests before running `mockguard verify`. |
| Output truncated at 10 MB | Test prints massive logs or stack traces to stdout. | Normal behavior (`maxOutputBytes: 10485760`). Prevents out-of-memory crashes. |
| Redacted string `[REDACTED_SECRET]` in logs | Output contained an API key or AWS token format. | Normal security guard. MockGuard scrubs sensitive patterns from stdout and saved JSON. |

---

## 8. Summary of Commands for Live Demo

For an in-depth live evaluation or hackathon pitch, execute these commands sequentially:

```bash
# 1. Run the automated interactive CLI demo
npm run demo:cli

# 2. Inspect version & options
node dist/src/cli/index.js --help

# 3. Demonstrate clean baseline execution
node dist/src/cli/index.js baseline .

# 4. Demonstrate JSON report output
node dist/src/cli/index.js baseline . --format json
```
