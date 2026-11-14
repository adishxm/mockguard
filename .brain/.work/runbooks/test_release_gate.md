# MockGuard Test and Release Gate

No release archive is ready until:

- lint, typecheck, unit tests, fixture tests, and corpus evaluation pass;
- the report schema validates;
- the weak/strong mutation contrast is reproducible;
- generated output contains no secrets or absolute local paths that should be public;
- package files are allowlisted;
- README commands work from a clean clone.
