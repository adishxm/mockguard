# Contract Gap Proposal: Mutation Status Model & Execution Scopes

**Author:** Worker 02 (Static Analysis, Mutation, Attribution, and Evaluation)
**Target Reviewers:** Worker 01 (Platform Foundation) and Worker 03 (Security, QA, and Release)
**Date:** 2026-11-14
**Impacted Schemas:** `.brain/.work/contracts/v1/mutant.schema.json`, `.brain/.work/contracts/v1/report.schema.json`, `src/contracts/outcomes.ts`, `src/contracts/report.ts`
**Status:** IMPLEMENTED IN CODE (`src/contracts/outcomes.ts`, `src/mutation/orchestrator.ts`)

---

## 1. Summary of Identified Gaps

During Worker 02 preflight analysis of the existing v1 contracts against the technical design requirements for StrykerJS integration and mutation attribution, two critical gaps were identified in `.brain/.work/contracts/v1/mutant.schema.json`:

1. **`NO_COVERAGE` is missing from the mutant status enum.**
2. **`CANCELLED` exists ambiguously at both the mutant level and the run level.**
3. **Engine-specific execution statuses (`RuntimeError`, `Ignored`) lack representation and risk being silently misclassified.**

---

## 2. Issue 1: Missing `NO_COVERAGE` Mutant Status

### Problem
In `.brain/.work/contracts/v1/mutant.schema.json` (line 13), the allowed statuses are:
```json
"status": {
  "enum": [
    "KILLED",
    "SURVIVED",
    "TIMEOUT",
    "COMPILE_ERROR",
    "CANCELLED",
    "EQUIVALENT_CANDIDATE"
  ]
}
```
StrykerJS distinguishes mutants that are covered by tests but not killed (`Survived`) from mutants that were never exercised by any test in the test suite (`NoCoverage`).

Without `NO_COVERAGE`:
* A test suite that never reaches the mutated code (e.g. Variant A in the order service fixture) would either have to be coerced into `SURVIVED` (which misrepresents a coverage gap as a weak assertion failure) or fail JSON schema validation.
* Denominators for strict vs. Stryker-compatible mutation scores cannot be calculated cleanly in the report schema (`report.schema.json`).

### Proposed Solution
Add `NO_COVERAGE` to the enum in `.brain/.work/contracts/v1/mutant.schema.json`:
```json
"status": {
  "enum": [
    "KILLED",
    "SURVIVED",
    "NO_COVERAGE",
    "TIMEOUT",
    "COMPILE_ERROR",
    "CANCELLED",
    "EQUIVALENT_CANDIDATE"
  ]
}
```
And add `noCoverage` count to the `mutation` object in `.brain/.work/contracts/v1/report.schema.json`:
```json
"mutation": {
  "type": "object",
  "required": ["valid", "killed", "survived", "timeouts", "compileErrors", "noCoverage"]
}
```

---

## 3. Issue 2: Ambiguity of `CANCELLED` & Representation of Unexecuted Mutants

### Problem
Currently:
* In `runtime_contract.md` (line 7), `CANCELLED` is a **terminal run state** (the entire CLI or mutation run was aborted by SIGINT, wall-clock timeout, or manual cancellation).
* In `mutant.schema.json` (line 13), `CANCELLED` is listed as an individual **mutant outcome status**.

This conflates overall process abortion with individual mutant evaluation. When a run is cancelled, pending mutants were never executed at all, whereas an active mutant might have been interrupted mid-test.

### Proposed Solution
Distinguish run-level cancellation from completed mutant outcomes:
1. **Run-level:** Keep `CANCELLED` as a terminal run verdict in `report.schema.json` and `runtime_contract.md`.
2. **Mutant-level:** Explicitly specify how unexecuted or interrupted mutants are represented:
   - Introduce or document `PENDING` / `CANCELLED` semantics: mutants that were queued but never executed when a run aborts must be recorded as unexecuted/cancelled rather than omitted or marked as survivors.
   - A mutant status of `CANCELLED` applies strictly to mutants that were aborted mid-flight or remained unexecuted due to a run-level abort.

---

## 4. Issue 3: Engine-Specific Statuses (`RuntimeError`, `Ignored`)

### Problem
StrykerJS emits `RuntimeError` (crash in test runner/infrastructure unrelated to assertions) and `Ignored` (arid-node comments or mutator exclusions).
If these statuses are not defined in `mutant.schema.json`, adapters risk silently coercing them into `SURVIVED`, which directly violates the core invariant that infrastructure and framework crashes must never masquerade as surviving mutants.

### Proposed Solution
Incorporate `RUNTIME_ERROR` and `IGNORED` into `mutant.schema.json` (or map `RuntimeError` to a dedicated execution failure category), ensuring that engine failures are excluded from mutation score numerators and denominators while remaining transparently visible in artifacts.

---

## 5. Implementation Resolution (Worker 02)

1. **`src/contracts/outcomes.ts`**:
   `MutantOutcome` extended to:
   ```ts
   export type MutantOutcome =
     | 'KILLED'
     | 'SURVIVED'
     | 'NO_COVERAGE'
     | 'TIMEOUT'
     | 'COMPILE_ERROR'
     | 'RUNTIME_ERROR'
     | 'IGNORED'
     | 'CANCELLED'
     | 'PENDING'
     | 'UNSUPPORTED';
   ```

2. **`src/mutation/adapter.ts`**:
   `MutantExecutionResult` extended with attribution fields:
   ```ts
   export interface MutantExecutionResult {
     mutantId: string;
     outcome: MutantOutcome;
     durationMs: number;
     testFailures?: string[];
     stdout?: string;
     stderr?: string;
     killedBy?: string[];
     testsRan?: string[];
   }
   ```

3. **`src/mutation/orchestrator.ts`**:
   - `concurrency`: Defaults strictly to `1` until workspace sandboxing is implemented.
   - `delegateConcurrency`: Supports delegating concurrency directly to StrykerJS.
   - `totalTimeoutMs`: Preserved with hard timer escalation.
   - Status partitioning: Interrupted in-flight mutants receive `CANCELLED`; unexecuted queued mutants receive `PENDING`. Both are excluded from mutation score denominators.
   - `RUNTIME_ERROR`: Unexpected adapter throws are caught and mapped to `RUNTIME_ERROR` with captured stderr.
   - Mutation Score: Calculated strictly as `killed / (killed + survived + noCoverage)`.
   - `runVerdict`: Emits `'COMPLETED' | 'CANCELLED' | 'TIMEOUT'`.

4. **Verification**:
   - 5 dedicated Worker 02 unit tests in `tests/mutation/orchestrator.test.ts`.
   - All repository tests passing.
