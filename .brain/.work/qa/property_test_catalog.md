# MockGuard Property Test Catalog

- Normalizing equivalent CLI argument forms produces the same command plan.
- Report serialization/deserialization preserves required fields.
- A null mutation score implies baseline failure or no valid mutants.
- Every mutant status is in the controlled vocabulary.
- Every high-confidence finding has at least one source location.
- Redacted output never reintroduces a known secret token.
- Cache key changes when commit/config/dependency hash changes.
