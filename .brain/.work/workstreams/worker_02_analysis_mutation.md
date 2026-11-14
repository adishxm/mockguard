# Worker 02 — Static Analysis, Mutation, Attribution, and Evaluation

**Role:** Builder 2  
**Primary outcome:** independent evidence that connects suspicious mock-centered patterns to controlled behavioral changes.

## Production phases

### P0 — Taxonomy and labelled corpus

- Freeze rule IDs: `MOCK_ASSERTION`, `MOCKED_SUT`, `CALL_ONLY_ASSERTION`, `NO_ASSERTION`, `UNSUPPORTED_PATTERN`.
- Author positive, negative, ambiguous, and adversarial examples.
- Define annotation guidance so the corpus is not labelled by the tool itself.
- Exit gate: corpus review by Worker 03.

### P1 — AST and symbol model

- Parse supported JavaScript/TypeScript syntax.
- Resolve imports, local aliases, mock setup, test boundaries, assertions, and system-under-test candidates.
- Preserve source ranges and parser diagnostics.
- Abstain on unresolved semantics.
- Exit gate: line citations are correct across fixtures.

### P2 — Static rules and confidence

- Implement deterministic rules with evidence snippets.
- Separate dependency-boundary mocks from mocked systems under test.
- Add allowlists for legitimate interaction tests.
- Use confidence classes instead of one opaque risk score.
- Exit gate: valid mocks do not receive high-confidence failures without dynamic evidence.

### P3 — Mutation adapter and operator set

- Integrate StrykerJS for supported project shapes.
- Freeze v1 mutators for boundary conditions, booleans, conditionals, and selected return expressions.
- Record original/mutated source, operator, location, and outcome.
- Exit gate: fixture produces deterministic mutant manifests and replay commands.

### P4 — Per-test attribution and correlation

- Build a kill matrix where feasible.
- Attribute a surviving mutant to relevant tests only when evidence supports the relationship.
- Correlate static findings with dynamic outcomes; keep unmatched findings visible.
- Do not let the same model that wrote a test decide that it is correct.
- Exit gate: one weak test shows both static suspicion and a surviving mutant; one valid mock does not.

### P5 — Equivalent mutants and flakiness

- Label possible equivalent mutants.
- Repeat or quarantine unstable cases under a defined policy.
- Report exclusions and denominator changes.
- Add seeded flaky and nondeterministic fixtures.
- Exit gate: a timeout, flaky result, and equivalent candidate are not silently counted as ordinary survivors.

### P6 — Benchmark and calibration

- Run B0 runner-only, B1 static-only, B2 mutation-only, and B3 combined.
- Measure precision, recall, abstention, false hard-failure rate, mutation score, and runtime.
- Version the corpus and commit all result files.
- Exit gate: public claims match the final benchmark.

## Handoffs

- Worker 01 receives parser and mutation-runner interface requirements.
- Worker 03 receives adversarial cases, unsupported cases, and expected safety semantics.
- Worker 04 receives verified before/after evidence and approved wording only.

## Primary risks

- Static heuristics flag legitimate tests.
- Mutant attribution is weaker than file-level mutation results.
- Equivalent mutants inflate apparent weakness.
- Framework-specific transforms change source locations.

## Definition of done

The tool can explain one finding with source lines, a controlled mutant, an observed outcome, a confidence level, and a replay command.
