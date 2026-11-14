# MockGuard production research notes

## Production implications from the supplied archive

The supplied research is unusually detailed about the difference between a static warning and an independent proof. The production design should keep that separation. Static analysis identifies candidate mock-vacuity patterns. The mutation engine supplies a counterfactual. The correlation layer explains why the two pieces of evidence are related. The report must preserve uncertainty rather than collapse all findings into a single score.

The supplied engineering material also identifies three production risks that must be treated as first-class work: test-runner process safety, attribution of a mutant to a generated test, and the possibility that a repair workflow overwrites hand-tuned tests. These become production phases, not optional documentation.

## External production research

- StrykerJS officially supports most JavaScript projects, including TypeScript and common frontend/backend ecosystems. This supports a TypeScript-first adapter but does not justify claiming universal compatibility.
- Jest discovers configuration through dedicated config files or package configuration and exposes many execution controls. MockGuard must preserve the project’s actual configuration rather than assume a single command shape.
- OpenSSF Scorecard treats testing, dependency pinning, workflow safety, code review, token permissions, release signing, and packaging as separate security dimensions. MockGuard should adopt those as repository-release controls.
- GitHub recommends least-privilege workflow permissions, careful secret handling, avoiding privileged workflows on untrusted pull-request content, and pinning third-party actions. These are mandatory release concerns for a public developer tool.

## Production boundary

The hackathon MVP can be local-first and fixture-led. A production release needs a stable configuration contract, process/resource caps, reproducible reports, CI hardening, package provenance, upgrade policy, support policy, telemetry defaults, and an incident response path.

## What remains unverified

- Real-world precision/recall of mock-vacuity rules.
- Cost and runtime of mutation verification on large repositories.
- Quality of mutant-to-test attribution in parameterized or indirect tests.
- Equivalent-mutant rate for the selected operator set.
- Reliability of automated repair suggestions.
- Performance and memory behavior under monorepos and multi-project Jest configurations.
