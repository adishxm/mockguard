# MockGuard Traceability Matrix

| Requirement | Product mechanism | Artifact | Acceptance |
|---|---|---|---|
| PS #41 mock-vs-code failure | Static mock rules + mutation correlation | Finding and mutant report | Weak fixture produces actionable evidence |
| Developer-first CLI | `mockguard verify` | CLI help and README | One documented happy path works |
| Automated testing | Baseline and mutation runner | Run metadata | Original suite and mutant runs classified |
| Honest evidence | JSON report with citations | `reports/*.json` | Every high-confidence finding has file/line evidence |
| Easy local setup | Locked dependencies and fixture | README / CI | Clean clone passes setup gate |
| Open-source readiness | License, docs, tests | Root files | No private artifacts in release archive |
| Responsible claims | Claims register and capability ledger | `.brain/.work/shared/` | Public wording matches implementation |
