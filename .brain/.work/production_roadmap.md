# MockGuard Production Roadmap

**Team shape:** three members build the product; the fourth member owns pitch, deck, demo narrative, and submission readiness.

## Production phases

| Phase | Name | Exit gate | Builders | Pitch/deck owner |
|---|---|---|---|---|
| P0 | Contract and threat freeze | Schema, scope, safety, claims approved | All three | Narrative brief |
| P1 | Reproducible foundation | Clean clone, config discovery, bounded runner | Worker 01 | Problem slide |
| P2 | Static inspection | Positive/negative AST corpus and citations | Worker 02 | Solution slide |
| P3 | Mutation proof | Reproducible killed/survived mutant loop | Worker 02 + 01 | Demo storyboard |
| P4 | Evidence product | Correlation, JSON schema, terminal report | Worker 01 + 02 | Evidence slide |
| P5 | Production hardening | Security, CI, package, resource and failure gates | Worker 03 | Trust/production slide |
| P6 | Evaluation | Versioned benchmark and honest metrics | All three | Metrics slide |
| P7 | Integration freeze | Demo and fallback pass twice | All three | Full rehearsal |
| P8 | Release candidate | Tagged artifact, docs, license, provenance | Worker 03 | Submission lock |
| P9 | Post-hackathon production | Support, observability, release cadence, adapters | Three builders | Roadmap slide |

## Dependency rule

No worker may silently change the report schema, verdict vocabulary, or public claim language. Changes go through `.brain/.work/shared/decision_log.md` and the traceability matrix.

## Production definition

Production-ready means reproducible, bounded, observable, secure enough for its declared execution boundary, upgradeable, documented, and honest about unsupported cases. It does not mean that MockGuard proves software correctness.
