# ADR-008 — Cache correctness before speed

**Decision:** Caching is disabled until cache keys include source commit, configuration, dependency state, runner version, mutation adapter version, and scope.

**Reason:** A stale mutation result is worse than a slow run because it creates false evidence.
