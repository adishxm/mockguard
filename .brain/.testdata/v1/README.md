# MockGuard Test Data v1

These are planning and QA assurance fixtures for MockGuard. They define expected static findings, mutation verdicts, and adversarial security boundary behavior.

### Functional & Quality Cases
- `weak_mock_result.json` (MG-002): Mock configured and asserted instead of asserting real SUT behavior (`SURVIVED`).
- `valid_boundary_mock.json` (MG-004): Legitimate external dependency mock where real behavior is verified (`KILLED`).
- `mocked_sut.json` (MG-005): Anti-pattern where the System Under Test is accidentally mocked (`MOCKED_SUT`).
- `strong_behavior_test.json` (MG-003): Strong behavioral assertions kill introduced mutants (`KILLED`).
- `surviving_mutant.json`: Meaningful conditional mutant remains undetected (`SURVIVED`).
- `unsupported_syntax.json` (MG-008): Parser abstains without false alarm (`UNSUPPORTED`).
- `baseline_failed.json` (MG-009): Pre-existing broken test suite stops analysis without emitting an invalid mutation score (`BASELINE_FAILED`).

### Adversarial & Security Cases (Worker 03 Assurance)
- `timeout_fixture.json` (MG-006): Runaway/infinite loop test killed by supervisor tree limit (`TIMEOUT`).
- `compile_error_fixture.json` (MG-007): Mutated syntax fails TypeScript compilation; excluded from mutation denominator (`COMPILE_ERROR`).
- `adversarial_path_traversal.json`: Attempts directory traversal outside repository boundary; safely rejected (`BOUNDARY_REJECTED`).
- `adversarial_shell_metacharacters.json`: Injected shell metacharacters in target filters; escaped or rejected safely.
- `adversarial_secret_leak.json`: Output containing API secrets/tokens; redacted before persistence (`REDACTED`).
