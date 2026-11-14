# MockGuard Research Synthesis

## Decision boundary

The product is a narrow TypeScript/Jest CLI for PS #41. The required proof is not an AI-generated test file. The required proof is a controlled behavioral mutation that the weak test fails to detect and the improved test detects.

## Evidence-backed principles

1. Coverage is an execution signal, not a complete test-effectiveness measure.
2. Mutation testing creates controlled counterfactuals and classifies tests by whether they detect them.
3. Dependency mocks can be valid; suspiciousness depends on what is asserted and what is actually executed.
4. Static analysis is useful for finding candidates but should be correlated with dynamic results.
5. The tool must abstain when parser/framework semantics are unclear.
6. All scores require a denominator, exclusions, command, version, and committed fixture/corpus.

## Product decisions

- Product name: MockGuard.
- Track: Developer Tools, CI/CD & Open Source.
- Primary stack: TypeScript/JavaScript and Jest.
- Primary report: terminal plus JSON.
- Mutation path: Stryker adapter if stable; otherwise a documented narrow fallback mutator.
- Repair: deterministic suggestions first; LLM optional and advisory.
- Execution: local-first with explicit timeouts and no automatic install/edit behavior.

## Unknowns to resolve in code

- Exact parser support for all Jest mock forms.
- Stryker configuration and runtime cost on the final fixture.
- Equivalent-mutant handling.
- Precision and recall of static rules on a labelled corpus.
- Whether SARIF is worth the time after the core demo is stable.
