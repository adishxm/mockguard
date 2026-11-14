# MockGuard Capacity Model

## Dimensions

- number of source files in selected scope;
- number of tests and test projects;
- number of generated mutants;
- median test duration;
- memory consumed by runner and mutation tool;
- parallel workers;
- cache hit/miss state.

## Policy

The tool should prefer explicit scope over full-repository mutation. It must surface when limits cause sampling or truncation. A partial run must never look like a complete score.
