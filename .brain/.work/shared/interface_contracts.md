# MockGuard v1 Interface Contracts

## Verdict values

`PASS`, `WARN`, `FAIL`, `UNVERIFIED`, `BASELINE_FAILED`, `TIMEOUT`, `UNSUPPORTED`.

## Finding kinds

`MOCK_ASSERTION`, `MOCKED_SUT`, `CALL_ONLY_ASSERTION`, `NO_ASSERTION`, `SURVIVING_MUTANT`, `TIMEOUT`, `COMPILE_ERROR`, `UNSUPPORTED_PATTERN`.

## Required report fields

```json
{
  "schemaVersion": "mockguard.report.v1",
  "tool": {"name": "mockguard", "version": "0.1.0"},
  "project": {"root": "", "commit": null},
  "runner": {"name": "jest", "command": [], "exitCode": 0, "durationMs": 0},
  "baseline": {"status": "PASS", "testsPassed": 0, "testsTotal": 0},
  "analysis": {"findings": []},
  "mutation": {"valid": 0, "killed": 0, "survived": 0, "timeouts": 0, "compileErrors": 0, "score": null},
  "claims": {"equivalentMutantsDetected": false, "sandboxed": false},
  "artifacts": []
}
```

## Invariants

- A mutation score is null when the baseline fails.
- Excluded mutants are listed, not silently dropped.
- Static findings and dynamic outcomes remain separate entities.
- Suggestions are never recorded as verified findings.
