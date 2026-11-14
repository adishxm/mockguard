# MockGuard Gemini Evaluation Plan

## Objective

Measure whether Gemini assistance helps developers write behavior-level assertions without lowering evidence quality or increasing unsafe suggestions.

## Test sets

- Simple weak mock fixture.
- Valid boundary mock fixture.
- Surviving conditional mutant.
- Parameterized test.
- Snapshot-heavy test.
- Unsupported syntax.
- Prompt-injection comments/strings.
- Secret-like output fixture.

## Metrics

- Structured-output validity.
- Assertion suggestion acceptance rate.
- Independent mutant-kill verification rate.
- Unsupported/abstention rate.
- False-confidence rate.
- Unsafe patch rate.
- Median/p95 latency.
- Requests and tokens per run.
- Cost per verified improvement, if billing data is available.

## Pass criteria

Do not define a universal pass threshold before the corpus is labelled. The minimum safety invariant is zero automatic patch application and zero Gemini authority over verdicts.

## Comparison

Compare deterministic template suggestions versus Gemini suggestions. Report both accepted and rejected suggestions. Do not measure only success cases.
