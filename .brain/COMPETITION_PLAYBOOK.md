# MockGuard — HackMatrix Competition Playbook

## Track fit

MockGuard belongs in **Developer Tools, CI/CD & Open Source** because it is a local-first CLI for automated testing and CI quality verification. The track asks for intuitive CLI/SDK interfaces, clear documentation, modular architecture, and easy local or automated setup. MockGuard demonstrates each of those through a narrow, reproducible workflow.

## Judge-facing story

AI generated a test. The test passed. The test did not protect the production behavior. MockGuard changes that behavior in a controlled way and proves whether the test notices.

## Three-minute demo

1. Show the weak AI-style test.
2. Run the normal test command and show green output.
3. Run `mockguard verify`.
4. Show the mock-centered finding and surviving conditional mutant.
5. Show the suggested behavior-level assertion.
6. Re-run and show the mutant killed.
7. End with the JSON evidence report and repository structure.

## Best claim

> MockGuard turns “AI-generated tests” into “behavior verified” by combining mock-pattern analysis with mutation evidence.

## Do not say

- “All mocks are bad.”
- “Mutation score proves correctness.”
- “MockGuard supports every language and test framework.”
- “Our accuracy is X%” unless the benchmark, labels, split, and result file are public.
- “AI fixed the test” unless the patch was run and verified by the independent mutation loop.

## Likely judge questions

**Why not use coverage?** Coverage shows execution, while mutation testing checks whether controlled behavior changes are detected.

**Are mocks bad?** No. Mocking an external boundary can be correct. MockGuard flags suspicious patterns and correlates them with dynamic evidence.

**Why not just use Stryker?** Stryker provides mutation analysis. MockGuard adds AI-test-specific static analysis, evidence correlation, and focused repair guidance.

**Can the tool prove a test is wrong?** No. It reports evidence and uncertainty. A surviving mutant indicates that the selected suite did not detect that selected change.

**Why only Jest?** A narrow, reproducible MVP is more credible than an untested universal promise.
