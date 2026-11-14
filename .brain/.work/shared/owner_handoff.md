# MockGuard Handoff Protocol

Every worker handoff must include:

1. What changed.
2. Files changed.
3. Contract or decision impacted.
4. Tests run and exact command.
5. Known limitations.
6. Next owner and blocking dependency.
7. Evidence artifact path.

No workstream is complete because a file exists. It is complete only when the receiving owner can reproduce the result.

---

## Active Handoff Log

| Handoff ID | From | To | Subject / File | Status | Handoff Artifact |
|---|---|---|---|---|---|
| `HANDOFF-W01-W02-MUTATION-ORCHESTRATOR-V1` | Worker 01 | Worker 02 | `src/mutation/orchestrator.ts` concurrency, timeout, cancellation & containment | **RESOLVED — IMPLEMENTED & TESTED** | [handoff_worker_01_to_worker_02.md](./handoff_worker_01_to_worker_02.md) |

