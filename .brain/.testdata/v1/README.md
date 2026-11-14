# MockGuard Test Data v1

These are planning fixtures. Replace placeholder expectations with generated result files after implementation.

Cases:

- `weak_mock_result.json`: mock configured and asserted instead of invoking/asserting the system under test.
- `valid_boundary_mock.json`: dependency mock used while the real service behavior is asserted.
- `surviving_mutant.json`: meaningful conditional mutant remains alive.
- `unsupported_syntax.json`: analyzer abstains.
- `baseline_failed.json`: mutation score is not produced.
