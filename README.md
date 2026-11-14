# MockGuard

> **Verify whether AI-generated tests protect real behavior—not just mocks.**

MockGuard is a local-first developer tool for PS #41: **AI-generated tests test the mock, not the code.** It combines static mock-pattern analysis with controlled mutation testing to show whether a green test suite can detect meaningful changes in production behavior.

## Repository status

This archive is the planning and research workspace for the HackMatrix MVP. It contains the project blueprints, `.brain` source of truth, contracts, test fixtures, demo plan, evaluation plan, and submission safeguards. It does not claim that an implementation, mutation score, accuracy result, or live demo has already been completed.

## Product thesis

A passing AI-generated test is not enough. MockGuard changes the production behavior in a controlled way and asks whether the test fails. It reports the exact test, source location, mutant, output, and next suggested action.

## MVP boundary

- TypeScript/JavaScript first.
- Jest first; Vitest is optional follow-on scope.
- Local CLI and JSON report.
- Static detection of mock-centered test patterns.
- Bounded mutation verification on selected source files.
- One realistic order/payment fixture for the final demo.
- No automatic repository edits by default.
- No claim that mutation score proves overall correctness.

## Optional Gemini integration

MockGuard can use Gemini for bounded explanations and candidate behavior-level assertions. It is disabled by default, never receives the full repository by default, never applies patches automatically, and never decides mutation verdicts. See `gemini_integration/` and `.brain/.work/ai/`.

## Team model

Three members build the product: platform/runtime, analysis/mutation, and security/QA/release. The fourth member owns pitch, deck, demo narrative, and submission lock. See `.brain/.work/workstreams/`.

## Read order

1. `.brain/README.md`
2. `.brain/.research/research_synthesis.md`
3. `.brain/.work/00_master_plan.md`
4. `.brain/.work/shared/interface_contracts.md` and `acceptance_criteria.md`
5. `.brain/.work/shared/threat_model.md` and `claims_register.md`
6. `.brain/.demo/demo_scope.md`
7. `docs/MockGuard_Complete_Research_PS41.md`
8. `docs/MockGuard_Final_Engineering_Spec_PS41.md`

## Suggested repository description

> MockGuard detects AI-generated tests that verify mocks instead of real application behavior using static analysis and mutation testing.

## Topics

`ai-testing` `mutation-testing` `test-quality` `jest` `typescript` `developer-tools` `static-analysis` `mocking` `ci-cd` `software-testing`

## License

Add the project license before publishing the implementation repository. This blueprint archive is not a production release.
