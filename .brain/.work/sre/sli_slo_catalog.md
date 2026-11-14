# MockGuard SLI/SLO Catalog

OpenTelemetry describes observability as the ability to understand a system from emitted signals such as logs, metrics, and traces. MockGuard is primarily a local CLI, so the MVP uses structured run diagnostics rather than mandatory remote telemetry.

## Candidate SLIs

- Run completion rate by terminal state.
- Baseline classification correctness on controlled fixtures.
- Report schema validity.
- Orphaned child-process count after cancellation.
- Reproducibility rate excluding timestamps.
- p50/p95 duration by project class.
- Diagnostic completeness.

## Candidate SLOs

Targets must be calibrated after measurement. No target is an achieved result.
