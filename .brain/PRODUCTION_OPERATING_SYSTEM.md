# MockGuard Production Operating System

**Purpose:** turn the `.brain` from a project plan into a repeatable product-development and release-control system.

## Operating principles

1. **Evidence before confidence.** Every public claim must point to a source or generated artifact.
2. **Independent verification.** The model or generator that creates a test must not be the authority that approves it.
3. **Bounded execution.** Tests and mutants run inside explicit time, process, output, file, and concurrency limits.
4. **Schema-first collaboration.** Workers integrate through versioned contracts, not informal assumptions.
5. **Reproducible results.** A report includes commit, tool versions, configuration hash, corpus version, and command.
6. **Safe failure.** Unknown, unsupported, timed-out, and baseline-failed states remain visible.
7. **Release discipline.** The package, workflow, documentation, and claims are frozen together.

## System of record

- Product decisions: `.brain/.work/decisions/`
- Contracts: `.brain/.work/contracts/v1/`
- Threats and controls: `.brain/.work/security/`
- SRE and operations: `.brain/.work/sre/`
- QA and benchmarks: `.brain/.work/qa/`
- Worker plans: `.brain/.work/workstreams/`
- Pitch evidence: `.brain/.work/pitch_deck/`
- Original research: `.brain/.ORG_research/`

## State vocabulary

`DESIGNED`, `PLANNED`, `IMPLEMENTED`, `TESTED`, `MEASURED`, `RELEASED`, `DEPRECATED`, `BLOCKED`, `UNKNOWN`.

A file existing in the repository is not evidence that its capability is implemented.
