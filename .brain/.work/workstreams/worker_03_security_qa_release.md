# Worker 03 — Security, QA, CI/CD, Packaging, and Operations

**Role:** Builder 3  
**Primary outcome:** a secure-by-declared-boundary production release process and independent assurance that findings are trustworthy.

## Production phases

### P0 — Threat model and repository controls

- Freeze the local execution boundary.
- Add license, security policy, support policy, CODEOWNERS, and contribution rules.
- Establish protected branches and required review.
- Choose dependency update and vulnerability-monitoring policy.
- Exit gate: threat model and claims register approved.

### P1 — Functional and adversarial test plan

- Turn the shared test matrix into executable cases.
- Test malformed configs, shell metacharacters, path traversal, symlinks, huge outputs, timeouts, process trees, and interrupted runs.
- Test parser ambiguity, dynamic imports, custom matchers, snapshots, fake timers, parameterized tests, and multi-project configs.
- Exit gate: all high-risk cases have expected states.

### P2 — CI hardening

- Use least-privilege workflow permissions.
- Pin third-party actions to full commit SHAs or a reviewed lock mechanism.
- Avoid privileged workflows that check out untrusted pull-request content.
- Keep secrets out of fixture and mutation jobs; review logs for leakage.
- Add dependency lockfile, audit, CodeQL/appropriate SAST, and OpenSSF Scorecard review.
- Exit gate: CI security checklist passes.

### P3 — Supply-chain and package security

- Pin runtime and action dependencies.
- Generate SBOM/provenance if the release path supports it.
- Define npm package contents and prepublish checks.
- Sign releases or document why signing is not yet available.
- Run package tests from a clean tarball, not only from the workspace.
- Exit gate: published artifact contains only intended files.

### P4 — Reliability and observability

- Define failure IDs and structured diagnostic output.
- Add run duration, mutant counts, process terminations, and report-write failures to diagnostics.
- Define local log retention and privacy policy.
- Add regression tests for resource limits and cleanup.
- Exit gate: a failed run can be triaged from its diagnostic bundle.

### P5 — Release candidate and compatibility

- Test supported Node versions and operating systems in CI.
- Maintain a compatibility table for Jest, TypeScript, StrykerJS, and package manager versions.
- Freeze report schema v1 and define migration behavior.
- Validate README, CLI help, package metadata, and release notes.
- Exit gate: release candidate passes clean-clone, package, security, and demo gates.

### P6 — Post-release operations

- Define vulnerability response SLA, issue templates, and responsible disclosure channel.
- Define semantic versioning and rollback strategy.
- Track opt-in anonymous usage only if explicitly approved; default to no telemetry.
- Define deprecation policy and support window.
- Exit gate: maintainers can handle a broken dependency, security report, or regression.

## Handoffs

- Worker 01 receives process and package security requirements.
- Worker 02 receives adversarial and quality corpus requirements.
- Worker 04 receives only release-approved metrics and security claims.

## Primary risks

- The tool executes untrusted repository tests without a real sandbox.
- CI workflow privileges expose tokens or secrets.
- A package release includes research files or untracked artifacts.
- Security language overstates the protection offered by a local CLI.

## Definition of done

A release candidate is reproducible, reviewable, bounded by an explicit execution policy, tested against adversarial cases, and packaged without secrets or accidental research inputs.
