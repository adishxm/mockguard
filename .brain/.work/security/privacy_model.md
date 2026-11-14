# MockGuard Privacy Model

## Data classes

- Public metadata: tool versions and counts.
- Project metadata: paths, config, commit, dependency versions.
- Sensitive code: source, tests, mutation diffs.
- Sensitive runtime output: logs, URLs, environment-dependent errors.

## Defaults

All analysis is local. No telemetry is required. Optional AI repair is disabled by default and requires explicit context review.

## Share-safe report

Remove absolute paths, redact likely secrets, limit stdout/stderr excerpts, and include only necessary code ranges. State that redaction is heuristic.
