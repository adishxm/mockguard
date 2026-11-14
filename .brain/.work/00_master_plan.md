# MockGuard Master Execution Plan

**Mode:** planning-first. **Project:** HackMatrix MockGuard. **Delivery:** one complete vertical slice from fixture to evidence report, followed by bounded static analysis, mutation verification, evaluation, and demo freeze.

## Goal

Deliver a CLI that shows whether an AI-style test detects a controlled production behavior change and explains the result with file/line evidence.

## Non-goals

No universal framework support, no autonomous unrestricted repair, no claim of semantic correctness, no hidden cloud execution, no package installation by the tool, and no live external repository requirement for the final demo.

## Sequence and gates

1. **Preflight:** freeze product language, scope, execution policy, and report vocabulary.
2. **Contract first:** freeze JSON report, finding, mutant, and verdict schemas.
3. **Fixture vertical slice:** baseline test → one mutant → surviving/killed classification → terminal report.
4. **Static analysis:** add mock-pattern rules with valid and weak fixtures.
5. **Correlation:** relate static findings to mutation evidence.
6. **Suggestions:** generate deterministic next-step advice; optional AI only after deterministic path works.
7. **Evaluation:** run B0/B1/B2/B3 on the labelled corpus.
8. **QA/demo freeze:** close blockers, record capabilities, rehearse fallback.

## MVP completeness rule

MVP is complete only when a clean clone can run the fixture, show a weak test surviving a meaningful mutant, show an improved test killing it, and produce a report that identifies the exact source/test locations.
