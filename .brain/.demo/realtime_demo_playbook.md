# MockGuard Real-Time Demo Playbook & Comprehensive Case Matrix

**Repository**: `https://github.com/adishxm/mockguard`  
**Problem Statement**: HackMatrix PS #41 — *"AI-generated tests test the mock, not the code"*  
**Tracks**: Core Developer Tooling & Security + **Build with Gemini** (Google AI Studio)  
**File Location**: `.brain/.demo/realtime_demo_playbook.md`

---

## 1. Executive Summary & Demo Rationale

The core promise of MockGuard is proving that **100% green tests and 100% code coverage can be a complete illusion** when AI assistants write tests that verify their own mock setups.

This document catalogs **every single demonstration case, failure mode, live command, edge case, and stage cue** needed to present MockGuard to hackathon judges, technical leads, and video audiences.

---

## 2. Complete Case Matrix: What MockGuard Demonstrates

| Case ID | Scenario / Feature | Input / Setup | Expected Outcome | Judge Key Takeaway |
|---|---|---|---|---|
| **CASE-01** | **The False Green Illusion** | Weak AI test (`order-service.weak.test.ts`) mocking payment gateway | Jest reports **100% GREEN, 100% Coverage** | AI tests give false confidence; green tests do not equal correct code. |
| **CASE-02** | **Static AST Mock Detection** | MockGuard AST Rule Engine scanning test file | Flags `[MG-RULE-001]` (Mock-Only Assertion) with 0.95 confidence | Static inspection identifies tests that assert mock calls without observable outcomes. |
| **CASE-03** | **Counterfactual Mutation Proof** | Injects 3 deterministic mutants into isolated sandbox copy | All 3 mutants **SURVIVE** (0% score, Exit Code 1) | Mathematical counterfactual proof: the test passes even when business logic is broken. |
| **CASE-04** | **Gemini Advisory Remediation** | Calls Google AI Studio (`gemini-2.5-flash`) with mutant context | Gemini analyzes root cause & synthesizes real behavioral assertions | Gemini assists by drafting fixes, but MockGuard never allows AI to certify verdicts. |
| **CASE-05** | **The Behavioral Fix (Mutants Killed)** | Strong test (`order-service.strong.test.ts`) asserting domain state & events | All 3 mutants **KILLED** (100% score, Exit Code 0) | Real business behavior is now protected against logic regressions. |
| **CASE-06** | **Git Revision Compare (`mockguard compare`)** | Compares `base` commit (weak test) against `HEAD` (strong test) | Generates delta report showing +3 mutants killed, +100% score | Automated CI/PR gate to prevent mock-heavy regressions before merging. |
| **CASE-07** | **Broken Baseline Safety Invariant** | Production code with failing unit test | Mutation aborted; mutation score is `null`; Exit Code 2 | **Critical Invariant**: Never calculate mutation score on an already-broken baseline. |
| **CASE-08** | **Process Supervision & Hard Timeouts** | Runaway infinite loop or hung child process | Process tree killed within timeout; classified as `TIMEOUT` | Prevents denial-of-service or CI resource hanging. |
| **CASE-09** | **Output Bounding & Memory Protection** | Test emitting megabytes of stdout garbage | Output truncated at 10MB limit; flagged `outputTruncated` | Protects CI memory and disk from log flooding attacks. |
| **CASE-10** | **Canary Secret Redaction** | Test output leaking AWS keys, GitHub tokens, Bearer JWTs | Replaced with `[REDACTED_SECRET]` in terminal & JSON | Prevents accidental credential leaks into public CI logs or reports. |
| **CASE-11** | **Enterprise Release & Supply Chain** | Clean-room tarball unpacked in temp dir | SPDX 2.3 SBOM verified; SHA-256 digests verified | Auditable, reproducible, non-repudiable packaging. |

---

## 3. Deep-Dive: The Real-Time Demo Cases

### Case 1: The False Green Illusion (Weak AI Mock Test)
- **File**: [`fixtures/order-service/order-service.weak.test.ts`](file:///c:/Users/adity/OneDrive/Desktop/HackMatrix/fixtures/order-service/order-service.weak.test.ts)
- **The Code**:
  ```typescript
  const mockCharge = jest.fn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
  await service.processOrder('order-123', 50);
  expect(mockCharge).toHaveBeenCalledWith(50); // ⚠️ ONLY asserts mock call!
  ```
- **What Happens**: The test passes 100% green. The developer merges the PR thinking everything is tested.

---

### Case 2: Static AST Mock Pattern Detection
- **Detection**: Runs conservative TypeScript AST rules on the test file.
- **Rules Evaluated**:
  1. `RULE_MOCK_ONLY_ASSERTION`: Only asserts `expect(mock).toHaveBeenCalled()`.
  2. `RULE_ASSERTION_ON_MOCK_RETURN_VALUE`: Asserts exact value configured in `mockReturnValue`.
  3. `RULE_MOCKED_SUT`: System Under Test itself is mocked.
- **Terminal Output**:
  ```text
  ⚠️  STATIC FINDING [MG-RULE-001] (Confidence: 0.95): Mock-Only Assertion Detected
     File: fixtures/order-service/order-service.weak.test.ts:24
     Target: expect(mockCharge).toHaveBeenCalledWith(50)
  ```

---

### Case 3: Counterfactual Mutation Proof
- **Sandbox**: Spins up an isolated temporary copy of the code (original source is never modified).
- **Mutants Injected**:
  - **Mutant 1 (Boundary)**: `if (amount <= 0)` $\to$ `if (amount < 0)`.
  - **Mutant 2 (State)**: `this.status = 'PAID';` $\to$ `/* deleted */`.
  - **Mutant 3 (Event)**: `this.events.emit('ORDER_FULFILLED', ...)` $\to$ `/* deleted */`.
- **Outcome**: The weak test passes against all 3 mutants.
- **Verdict**:
  ```text
  ❌ Mutant M1: SURVIVED (Test still passed!)
  ❌ Mutant M2: SURVIVED (Test still passed!)
  ❌ Mutant M3: SURVIVED (Test still passed!)
  MOCKGUARD VERIFICATION FAILED: 3 MUTANTS SURVIVED (Exit Code 1)
  Mutation Score: 0.0% (0 killed / 3 total)
  ```

---

### Case 4: Google Gemini Advisory Remediation (`Build with Gemini`)
- **Transport**: Native zero-dependency HTTP call to Google AI Studio with automated fallback (`gemini-2.5-flash` $\to$ `gemini-2.5-flash-lite` $\to$ `gemini-flash-latest`).
- **Prompt Sent**: AST context, surviving mutant specification, and source excerpts.
- **Gemini Diagnostic**:
  > *"The test directly mocks 'gateway.charge' and asserts that it was invoked. This bypasses OrderService's internal state machine and event emitter, masking critical regressions in state transitions and event notifications."*
- **Gemini Suggested Assertion**:
  ```typescript
  expect(service.status).toBe('PAID');
  expect(service.transactionId).toBe('txn-999');
  expect(emittedEvents).toContainEqual({ event: 'ORDER_FULFILLED', payload: expect.any(Object) });
  await expect(service.processOrder('ord-1', 0)).rejects.toThrow('Invalid order amount');
  ```
- **Governance**: Output includes `verified: false`, `needsHumanReview: true`.

---

### Case 5: The Behavioral Fix (Mutants Killed)
- **File**: [`fixtures/order-service/order-service.strong.test.ts`](file:///c:/Users/adity/OneDrive/Desktop/HackMatrix/fixtures/order-service/order-service.strong.test.ts)
- **Assertions Made**:
  1. Post-condition state: `expect(service.status).toBe('PAID')`.
  2. Emitted side-effects: `expect(emittedEvents).toContainEqual(...)`.
  3. Boundary contracts: Rejection of zero amount, negative amount, duplicate payments.
- **Re-run Verdict**:
  ```text
  ✔ Mutant M1: KILLED by boundary rejection test
  ✔ Mutant M2: KILLED by state transition assertion
  ✔ Mutant M3: KILLED by domain event queue assertion
  🎉 MOCKGUARD VERIFICATION PASSED: 100% MUTANTS KILLED (Exit Code 0)
  Mutation Score: 100.0% (3 killed / 3 total)
  ```

---

### Case 6: Edge Cases & Defensive Invariants

#### Case 6A: Baseline Failure Safety Guard
- **Condition**: Unmutated baseline code has a broken test.
- **MockGuard Rule**: Mutation testing is immediately aborted.
- **Invariant**: **Mutation score is `null`** (never show a score when baseline fails). Exit code: `2`.

#### Case 6B: Runaway Process & Infinite Loop Defense
- **Condition**: A test hangs in an infinite `while(true)` loop.
- **MockGuard Rule**: `BoundedProcessSupervisor` forcibly kills the entire process tree after the configured timeout (e.g. 10000ms). Classified as `TIMEOUT`. Exit code: `4`.

#### Case 6C: Output Flooding Defense
- **Condition**: A malicious or runaway test prints gigabytes of logs to stdout.
- **MockGuard Rule**: Stream buffer caps at 10MB default, truncates cleanly, and preserves process stability.

#### Case 6D: Secret Leakage Redaction
- **Condition**: A test or error stack trace prints tokens into the logs:
  - AWS Key: `AKIAIOSFODNN7EXAMPLE`
  - GitHub Token: `ghp_1234567890abcdef...`
  - Bearer Token: `Authorization: Bearer eyJhbGci...`
- **MockGuard Rule**: `SecretRedactor` automatically replaces all detected secret signatures with `[REDACTED_SECRET]` before outputting to terminal or saving to `dist/reports/run.json`.

---

## 4. Real-Time Stage Commands (Quick-Reference)

### Option A: The Full Automated 6-Act Showcase (Best for 3-minute pitch)
```bash
npm run demo
```
*Executes the complete interactive demonstration with colored output and timing in ~15 seconds.*

### Option B: The Live Gemini API Bridge
```powershell
$env:GEMINI_API_KEY = "your-google-ai-studio-key"
npm run gemini:advisory
```
*Queries Google AI Studio live, demonstrates model fallback, and outputs root-cause diagnosis and suggested assertions.*

### Option C: The Pre-Release & Packaging Audit
```bash
npm run release:check
```
*Executes all 8 release gates: build, 53 tests, packaging allowlist, SPDX 2.3 SBOM, SHA-256 digests, and clean-room tarball smoke test.*

---

## 5. Offline & Contingency Plan (What if Stage Wi-Fi Fails?)

| Stage Incident | Automatic Mitigation |
|---|---|
| **No Internet / Wi-Fi Drops** | MockGuard core verification is **100% local-first**. Baseline, AST rules, and mutation testing execute completely offline without network. |
| **Gemini API 503 / High Demand** | `GoogleGeminiProvider` has an automatic 3-model fallback chain (`gemini-2.5-flash` $\to$ `gemini-2.5-flash-lite` $\to$ `gemini-flash-latest`). If all fail, MockGuard falls back to the deterministic local advisory. |
| **Node.js Platform Variations** | Tested and validated across Node 18.x, 20.x, 22.x on Windows, macOS, and Linux via GitHub Actions matrix. |

---

## 6. Judge Q&A Defense Sheet

### Q1: "Why not just use StrykerJS?"
> **Answer**:  
> *"StrykerJS is a general mutation testing tool that tests whether tests kill arbitrary mutations across an entire codebase. It is slow and does not distinguish between missing assertions and mock-polluted assertions.  
> MockGuard specifically solves **PS #41**: it detects when a test mocks a dependency and only asserts the mock. MockGuard combines static AST pattern inspection with targeted, bounded mutations on the System Under Test, giving actionable attribution and immediate advisory fixes."*

### Q2: "Can't developers just ask Gemini/ChatGPT to write their tests in the first place?"
> **Answer**:  
> *"That's exactly how this problem started! Developers asked AI to write unit tests, and the AI generated weak tests that verify mocks because mocks are easy to make green.  
> MockGuard provides the counter-balance: **mathematical counterfactual verification**. Gemini proposes the candidate assertion, but MockGuard's deterministic mutation engine must independently prove that the assertion kills the mutant before it can be trusted."*

### Q3: "Is MockGuard safe for enterprise CI/CD?"
> **Answer**:  
> *"Yes. MockGuard is built with enterprise security controls: bounded child process execution, strict environment whitelisting, automatic secret redaction, 10MB output truncation, SPDX 2.3 SBOM generation, cryptographic SHA-256 release provenance, and an OpenSSF Scorecard GitHub Actions pipeline."*
