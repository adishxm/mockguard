# MockGuard Resilience Test Plan

Inject: killed runner, hung child, malformed JSON, full disk, broken config, interrupted write, corrupt cache, dependency mismatch, flaky test, and cancelled mutation.

For each injection verify terminal status, cleanup, diagnostic artifact, no misleading score, and reproducible recovery.
