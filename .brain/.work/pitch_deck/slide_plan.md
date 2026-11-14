# MockGuard Deck Plan

## Slide 1 — Problem
AI-generated tests can be green while checking configured mocks instead of production behavior.

## Slide 2 — Why green is not enough
Coverage is execution evidence; mutation testing provides a behavioral counterfactual.

## Slide 3 — Product
Static mock-pattern analysis plus bounded mutation verification.

## Slide 4 — Workflow
Analyze → baseline → mutate → classify → correlate → explain.

## Slide 5 — Live proof
Weak test leaves a meaningful mutant alive.

## Slide 6 — Improvement
Behavior assertion kills the same mutant.

## Slide 7 — Production readiness
Process limits, schema reports, CI hardening, release controls, and honest boundaries.

## Slide 8 — Roadmap
Jest MVP → CI action → broader frameworks → production support.
