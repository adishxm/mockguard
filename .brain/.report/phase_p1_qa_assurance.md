# MockGuard Phase 1 QA Assurance & Acceptance Criteria

**Author / Assurer**: Worker 03 (Security & QA)  
**Target Recipient**: Worker 01 (Platform Foundation) & Worker 02 (Analysis Engine)  
**Status**: ACTIVE — Ready for Implementation Verification

---

## 1. Assurance Scope
Worker 03 has established independent quality and security fixtures in `.brain/.testdata/v1/` to ensure the platform foundation (P1) is bounded, robust, and safe before mutation testing begins.

---

## 2. Mandatory Acceptance Gates for Worker 01 & 02

### Gate 1: Safe Process Supervision & Timeouts (`MG-006`)
- **Fixture**: `.brain/.testdata/v1/timeout_fixture.json`
- **Requirement**: Any child process executing tests must run with a configurable wall-clock timeout (default 30s).
- **Pass Criteria**:
  - The entire child process tree must be killed cleanly (`SIGKILL`).
  - No zombie `node` or `jest` processes left running.
  - The outcome is recorded as `TIMEOUT`, never conflated with a surviving mutant.

### Gate 2: Path Traversal & Shell Safety (`Adversarial`)
- **Fixtures**:
  - `.brain/.testdata/v1/adversarial_path_traversal.json`
  - `.brain/.testdata/v1/adversarial_shell_metacharacters.json`
- **Requirement**: CLI arguments (`--config`, `--testPathPattern`, target paths) must be normalized and checked against workspace boundaries.
- **Pass Criteria**:
  - Paths resolving outside `cwd` or root must fail with exit code `2` (`BOUNDARY_REJECTED`).
  - Metacharacters (`|`, `;`, `&`, `$()`) must never be passed to a shell unescaped.

### Gate 3: Secret Redaction (`Adversarial`)
- **Fixture**: `.brain/.testdata/v1/adversarial_secret_leak.json`
- **Requirement**: Captured test output (stdout/stderr) persisted in reports or logs must scan for and mask common secret tokens.
- **Pass Criteria**:
  - Patterns like `AIza...`, `sk-...`, `ghp_...` replaced with `[REDACTED_SECRET]`.

### Gate 4: Invalid Baseline Guard (`MG-009`)
- **Fixture**: `.brain/.testdata/v1/baseline_failed.json`
- **Requirement**: The original suite must run once before any mutation occurs.
- **Pass Criteria**:
  - If baseline tests fail, MockGuard halts immediately with `BASELINE_FAILED`.
  - Mutation score is explicitly set to `null` (never 0% or fake green).

---

## 3. Worker 03 Sign-Off Status
- Security fixtures: **AUTHORED**
- CI workflow validation: **ACTIVE**
- Awaiting Worker 01 CLI runner integration for live verification.

