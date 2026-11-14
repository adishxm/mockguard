# MockGuard Benchmark Protocol

## Versions to record

Commit, corpus version, Node, package manager, Jest, TypeScript, parser, mutation adapter, OS, CPU/memory class, config hash, and command.

## Baselines

B0 runner-only; B1 static-only; B2 mutation-only; B3 combined.

## Required metrics

Static precision/recall/abstention; false hard-failure rate; mutation score with denominator; timeout/compile/error counts; runtime p50/p95; report validity; suggestion verification rate.

## Publication rule

Publish raw case counts and confusion matrix, not only an aggregate percentage. Separate fixture results from external repository results.
