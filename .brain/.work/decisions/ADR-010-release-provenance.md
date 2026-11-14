# ADR-010 — Release provenance

**Decision:** Public package releases should use a clean CI build, dependency lockfile, artifact inspection, and npm/GitHub provenance where supported.

**Reason:** Supply-chain trust is part of a production developer tool. Provenance establishes build/source linkage but does not prove package correctness.
