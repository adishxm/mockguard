# MockGuard Demo Scope

## Required story

A weak AI-style test passes because it checks a configured mock. MockGuard runs the suite against a meaningful production mutant. The mutant survives. The tool cites the weak test and suggests a behavior assertion. The improved test kills the mutant.

## Stage-safe commands

```bash
npm ci
npm run fixture:baseline
npx mockguard verify fixtures/order-service --format terminal --out reports/demo.json
npm run fixture:strong
npx mockguard verify fixtures/order-service --format terminal --out reports/demo-strong.json
```

Replace commands with the final implementation interface. Do not show placeholder results as completed results.

## Fallback

If live analysis fails, run the committed fixture-only replay and show the pre-generated manifest together with the command that produced it. Say that it is a controlled fixture.

## Demo constraints

- Three minutes after setup.
- No network dependency during the story.
- No real user repository or secrets.
- Use visible before/after evidence.
