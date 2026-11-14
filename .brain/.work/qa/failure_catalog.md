# MockGuard Diagnostic Failure Catalog

This catalog documents all exit codes, failure IDs, diagnostic indicators, and remediation steps for operators and developers.

---

## Exit Codes & Failure Taxonomy

| Exit Code | Constant | Meaning | Trigger Condition | Operator Action |
|---|---|---|---|---|
| `0` | `SUCCESS` | Normal completion | Suite analyzed; findings clean or expected | None required |
| `1` | `FINDINGS_DETECTED` | Test weakness or surviving mutant found | Suspicious mock assertions (`MOCK_ASSERTION`, `MOCKED_SUT`) or mutant survived | Inspect report for surviving mutants; add behavioral assertions |
| `2` | `BASELINE_FAILED` | Original test suite failed | Pre-existing broken test before mutation began | Fix failing tests in baseline suite before running mutation verification |
| `3` | `TIMEOUT` | Execution duration exceeded | Single test or overall run exceeded `timeoutMs` (default 60s) | Increase `--timeout <ms>` or investigate infinite loops / deadlocks |
| `4` | `CONFIG_ERROR` | Configuration error | Unparseable Jest config, invalid CLI flags, or invalid paths | Check `--config` path and syntax; verify valid CLI flags |
| `5` | `INTERNAL_ERROR` | Internal / unhandled exception | Parser crash, out of memory, or unexpected filesystem failure | Run with `--verbose` or check diagnostic bundle in `.mockguard/` |

---

## Security Boundary Rejection Codes

| Error Identifier | Category | Behavior | Remediation |
|---|---|---|---|
| `ERR_BOUNDARY_PATH` | Path Traversal | CLI rejects target or config paths outside workspace root | Ensure paths resolve within working repository |
| `ERR_OUTPUT_TRUNCATED` | Memory Defense | Runaway test stdout/stderr exceeds `maxOutputBytes` (10MB) | Reduce excessive logging in tests or increase `--max-output-bytes` |
| `ERR_ENV_ISOLATION` | Secret Defense | Child process runs inside sanitized `safeEnv` whitelist | Pass necessary custom env vars explicitly via config |
| `ERR_PROCESS_KILLED` | Tree Escalation | Process failed to exit on `SIGTERM` within grace period; `SIGKILL` sent | Investigate non-cooperative subprocesses |

