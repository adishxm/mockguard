# MockGuard Team Execution Model

## Members

- **Builder 1 — Platform:** runtime, process supervision, configuration, reports, package and performance.
- **Builder 2 — Analysis:** AST rules, mutation adapter, attribution, corpus and measurements.
- **Builder 3 — Assurance:** security, QA, CI/CD, supply chain, release and operations.
- **Member 4 — Narrative:** pitch, deck, demo, judge Q&A, evidence ledger and submission lock.

## Weekly/phase cadence

1. Monday or phase start: contract and dependency review.
2. During work: short handoff notes for every integration boundary.
3. Mid-phase: reviewer runs the receiving worker’s acceptance command.
4. Phase close: evidence artifact, known limitations, and updated claims.
5. Release: no last-minute feature addition after demo freeze.

## RACI rule

The builder who implements a feature is not the sole approver of its security or public claim. Worker 03 reviews execution and release risk. Member 4 can use only approved evidence.

## Work-in-progress limit

Each builder may have one active integration task and one queued task. New features cannot displace a blocker without a decision-log entry.
