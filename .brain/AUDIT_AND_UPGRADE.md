# MockGuard — Audit and Upgrade Checklist

## Purpose

Use this file before the final submission to distinguish repository truth from blueprint claims.

## Identity and scope

- [ ] Every public document uses **MockGuard** consistently.
- [ ] Repository description matches the selected PS #41 wedge.
- [ ] Track is stated as Developer Tools, CI/CD & Open Source.
- [ ] MVP is limited to TypeScript/JavaScript and Jest unless additional adapters are actually tested.
- [ ] No document claims universal test correctness.

## Evidence closure

- [ ] PS #41 source is retained in the research index.
- [ ] Stryker/Jest/Istanbul references are linked to official documentation.
- [ ] Every performance or quality number is marked `TEAM MEASUREMENT` and tied to a command.
- [ ] Targets are not written as achieved results.
- [ ] Known limitations appear in README and demo narration.

## Engineering closure

- [ ] Clean clone installs and builds.
- [ ] Baseline runner captures exit code, output, and timeout.
- [ ] Static analyzer has positive and negative fixtures.
- [ ] Mutation adapter produces replayable mutant records.
- [ ] Reports distinguish killed, survived, timeout, compile error, baseline failure, and unsupported.
- [ ] JSON output validates against the versioned schema.
- [ ] No automatic file edits occur without explicit opt-in.

## Demo closure

- [ ] Weak test passes on original code.
- [ ] At least one meaningful mutant survives the weak test.
- [ ] Stronger behavior assertion kills the mutant.
- [ ] The correlation between static finding and mutant is visible.
- [ ] The full flow fits the agreed timebox.
- [ ] A fixture-only fallback works if live project execution fails.

## Release closure

- [ ] No secrets, private research, or temporary files are packaged.
- [ ] LICENSE exists.
- [ ] Package entry point is tested from a clean build.
- [ ] README commands are copy-paste verified.
- [ ] The final archive contains the `.brain` folder and all planned reports.
