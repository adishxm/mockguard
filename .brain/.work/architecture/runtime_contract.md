# MockGuard Runtime Contract

## Process lifecycle

`DISCOVERING → BASELINING → ANALYZING → MUTATING → EXECUTING → CLASSIFYING → REPORTING → COMPLETE`

Terminal states: `COMPLETE`, `BASELINE_FAILED`, `TIMEOUT`, `CANCELLED`, `UNSUPPORTED`, `INTERNAL_ERROR`.

## Required invariants

- A run ID is generated before any subprocess starts.
- Every subprocess has a parent run ID.
- A timeout produces a terminal record.
- Cleanup is attempted before the run directory is closed.
- A report is not marked complete until the artifact hash is written.
