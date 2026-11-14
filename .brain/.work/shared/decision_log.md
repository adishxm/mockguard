# MockGuard Architecture Decision Log

## ADR-001 — Final name

**Decision:** Use MockGuard.  
**Reason:** Clear association with mock-integrity auditing and a concise repository identity.

## ADR-002 — Narrow first ecosystem

**Decision:** TypeScript/JavaScript with Jest.  
**Reason:** Short setup path, strong fixture story, and direct fit with the existing developer-tooling experience.

## ADR-003 — Dynamic evidence is required for strong claims

**Decision:** Static findings are advisory unless correlated with mutation or other independent evidence.  
**Reason:** Valid dependency mocks exist and syntax alone cannot prove intent.

## ADR-004 — Deterministic suggestions before LLM repair

**Decision:** Templates and evidence cards ship before optional model assistance.  
**Reason:** The verification authority must be independent of the model that generated the test.

## ADR-005 — Local-first execution

**Decision:** No required cloud service for the final demo.  
**Reason:** Reproducibility, privacy, and hackathon reliability.
