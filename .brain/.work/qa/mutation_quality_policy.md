# MockGuard Mutation Quality Policy

- Use a small, explainable v1 operator set.
- Record every generated mutant, including excluded cases.
- Never equate a survived mutant with a complete test failure without context.
- Mark equivalent candidates and flaky outcomes.
- Require baseline pass before interpreting mutation score.
- Support replay of any reported mutant.
- Prefer changed-file or explicit scope for CI.
