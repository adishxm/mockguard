# ADR-009 — AI is advisory

**Decision:** Optional AI repair/explanation can propose a next step, but deterministic runner and mutation evidence remain the verification authority.

**Reason:** The project must not trust the model that generated the test to certify its own output.
