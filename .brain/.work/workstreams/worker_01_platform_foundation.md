# Worker 01 — Platform, Runner, Reports, and Runtime Reliability

**Role:** Builder 1  
**Primary outcome:** a reliable local/CI execution platform that can discover configuration, run bounded test commands, persist evidence, and produce reproducible reports.

## Production phases

### P0 — Contract and execution boundary

- Freeze report schema, verdicts, exit codes, and command input rules.
- Define supported Node/package-manager versions.
- Define working-directory and source-scope rules.
- Define timeout, output, process-tree, and cancellation behavior.
- Exit gate: process supervisor contract reviewed by Workers 02 and 03.

### P1 — Project discovery and configuration

- Discover Jest config files and package scripts without executing arbitrary install hooks.
- Resolve explicit config over inferred config.
- Record the resolved command and config hash.
- Support monorepo project selection as an explicit option, not a guess.
- Exit gate: fixtures for default, explicit, multi-project, and malformed configuration.

### P2 — Baseline runner

- Run the original suite once before mutation.
- Capture exit code, signal, duration, stdout/stderr, test counts, and baseline status.
- Distinguish baseline failure from test-quality findings.
- Exit gate: no mutation score is emitted when the baseline is invalid.

### P3 — Mutation orchestration platform

- Provide adapter interface for StrykerJS and a narrow fixture fallback.
- Materialize a run directory with manifest, command, environment policy, and outcomes.
- Enforce per-mutant, total-run, worker, and disk limits.
- Support cancellation and cleanup of child processes.
- Exit gate: killed, survived, timeout, compile-error, and cancelled cases replay correctly.

### P4 — Report and artifact layer

- Emit terminal, JSON, and optional SARIF reports.
- Include schema version, tool version, project commit, config hash, corpus version, and source locations.
- Hash report inputs and artifacts for reproducibility; do not call local files immutable.
- Redact known secret patterns from captured output where practical.
- Exit gate: report validates and can be explained from a clean run directory.

### P5 — Performance and scalability

- Add changed-file scope and test-selection controls.
- Measure median and p95 run time on the fixture and a small multi-project sample.
- Add cache policy only after correctness; cache keys must include config and dependency state.
- Document worker parallelism and memory behavior.
- Exit gate: performance numbers are measurements, not targets.

### P6 — Production operations

- Define log levels, diagnostic bundle, support version, and failure IDs.
- Add stable exit-code documentation.
- Add backward-compatible report schema policy.
- Define deprecation and migration behavior.
- Exit gate: an operator can diagnose a failed run without reading source code.

## Handoffs

- Worker 02 receives runner API, source scope, and baseline semantics.
- Worker 03 receives process limits, artifact paths, and CI security requirements.
- Worker 04 receives stable screenshots, command timings, and only verified numbers.

## Primary risks

- A Jest config or monorepo assumption silently runs the wrong tests.
- A child process survives cancellation.
- A timeout is misclassified as a surviving mutant.
- Reports include secrets or machine-specific paths.

## Definition of done

A clean clone can run a bounded fixture, produce a versioned report, and explain every process outcome without hidden state.
