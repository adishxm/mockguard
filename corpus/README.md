# MockGuard Ground-Truth Evaluation Corpus (v1)

**Phase:** P0
**Owner:** Worker 02 (Static Analysis, Mutation, Attribution, and Evaluation)
**Reviewer:** Worker 03 (Security, QA, CI/CD, and Release)
**Status:** `PENDING_REVIEW`

---

## 1. Purpose & Separation of Concerns

This directory defines the ground-truth benchmark corpus (`corpus/cases.jsonl`) for evaluating MockGuard's static analysis and dynamic mutation correlation engines.

**Critical Policy:** Ground-truth corpus definitions are strictly decoupled from MockGuard's runtime output schemas (`.brain/.work/contracts/v1/finding.schema.json` and `report.schema.json`). The corpus records:
1. Ground-truth expected behaviors and static rule classifications.
2. Confidence ceilings (the maximum confidence allowed statically before dynamic evidence is collected).
3. Planned fixture mappings and specific planned mutant fingerprints (file, operator, original, replacement) where defined.
4. Measured outcomes, which remain `NOT_RUN` until explicitly executed and verified by automated harnesses.

MockGuard's analyzer and mutation runner must never label or calibrate against their own generated outputs. This corpus is an **annotation draft** awaiting Worker 03 sign-off, not yet an executed benchmark.

---

## 2. Rule Classification & Contract Vocabulary

Rule IDs correspond strictly to `.brain/.work/contracts/v1/finding.schema.json`:
- `MOCKED_SUT`: The system under test or its internal decision function is mocked or replaced by a test double.
- `MOCK_ASSERTION`: The assertion validates a value that was configured on a mock and forwarded without business transformation.
- `CALL_ONLY_ASSERTION`: The test asserts only that mock interactions occurred (e.g. `toHaveBeenCalled`), without asserting observable business results, returned states, or emitted events.
- `NO_ASSERTION`: The test invokes code without assertions or thrown-error expectations.
- `UNSUPPORTED_PATTERN`: Dynamic, reflective, or ambiguous syntax that the analyzer cannot resolve safely.

---

## 3. Confidence Ceilings & Abstention Policy

Static analysis alone operates under bounded confidence ceilings to avoid false accusations:
- **`high` ceiling**: Allowed statically only when unambiguous structural proof exists (e.g. `MOCKED_SUT` where the primary target is replaced by a mock, or an aliased SUT mock via its module binding).
- **`medium` ceiling**: Applied to interaction-only assertions (`CALL_ONLY_ASSERTION`) and missing assertions (`NO_ASSERTION`).
- **`low` ceiling**: Applied to ambiguous pass-through / mock echo cases (`MOCK_ASSERTION`). Must remain advisory.
- **`unverified` (Abstention)**: Mandatory for dynamic dispatch, computed properties, variable-path dynamic imports, and reflection (`UNSUPPORTED_PATTERN`). MockGuard must abstain rather than emit speculative failures on syntax it cannot model.

---

## 4. Careful Correlation Policy

Dynamic mutation outcomes are treated with strict evidentiary standards:
- **Corroborating Evidence, Not Standalone Proof:** A surviving mutant does **not** by itself prove that a static mock-integrity finding was correct. It provides *corroborating dynamic evidence*.
- **Mandatory Preconditions for Correlation:** Correlation may only be drawn when:
  1. The specific test is an explicit member of the mutant's `coveredBy` set.
  2. The mutant resides within the relevant executable SUT call path exercised by the test.
- Findings are never automatically upgraded to `high` confidence unless both preconditions are strictly satisfied. Unmatched findings remain at their static confidence ceilings.

---

## 5. Legitimate Boundary Mocks

Mocks isolating true external system boundaries (network clients, payment gateways, clocks, filesystems) are legitimate engineering practice. When a test mocks an external boundary, executes the real SUT, and asserts business state or negative side-effects (e.g. `expect(deps.fulfillment.publish).not.toHaveBeenCalled()`), MockGuard must allow it (`expected_static.verdict = PASS`).

---

## 6. Review & Adjudication Protocol

Every case in this corpus has an initial `review_status: "PENDING_REVIEW"`.
- Review is owned by Worker 03 prior to benchmark execution.
- Disagreements between annotators are adjudicated and recorded in `.brain/.work/qa/benchmark_protocol.md`.
- No measured results (`NOT_RUN`) may be replaced with numbers until the benchmark harness executes against a tagged commit.
