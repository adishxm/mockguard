# ADR-006 — Production boundary

**Decision:** MockGuard v1 is a local/CI developer tool with an explicit non-sandboxed execution boundary.

**Reason:** The tool must run a project’s tests to obtain evidence. Calling this a sandbox without a real isolation layer would be misleading.

**Consequence:** Documentation must recommend trusted workspaces, and future remote execution requires a separate isolation service.
