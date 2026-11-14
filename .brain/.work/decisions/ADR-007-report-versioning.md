# ADR-007 — Report versioning

**Decision:** Reports use explicit schema versions and include a tool version, project commit, config hash, corpus version, and adapter versions.

**Reason:** A mutation score without its environment is difficult to reproduce or compare.

**Consequence:** Breaking report changes require migration notes and a new schema version.
