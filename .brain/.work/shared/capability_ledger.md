# MockGuard Capability Ledger

| Capability | Status | Evidence Location & Verification |
|---|---|---|
| **CLI scaffold** | **IMPLEMENTED & VERIFIED** | `src/cli/index.ts`, `src/cli/args.ts` (Clean build, exit codes 0/1/2/3/4/5 verified) |
| **Jest discovery** | **IMPLEMENTED & VERIFIED** | `src/platform/project-discovery.ts` (Auto-discovers config, monorepo, and package scripts) |
| **Baseline runner** | **IMPLEMENTED & VERIFIED** | `src/platform/baseline-runner.ts` (Captures exit codes, timeouts, stdout/stderr, test counts) |
| **AST mock analysis** | **IMPLEMENTED & VERIFIED** | `src/analysis/rules/` (`MOCKED_SUT`, `NO_ASSERTION`, `CALL_ONLY_ASSERTION`, `MOCK_ASSERTION`) |
| **Mutation adapter** | **IMPLEMENTED & VERIFIED** | `src/mutation/ast-mutation-adapter.ts` (4 deterministic AST operators, isolated sandbox execution) |
| **Git comparator** | **IMPLEMENTED & VERIFIED** | `src/platform/git-comparator.ts` (`mockguard compare --base <ref>`, isolated worktree deltas) |
| **Correlation & attribution** | **IMPLEMENTED & VERIFIED** | `src/mutation/correlation-engine.ts` (Attributes surviving mutants to weak test blocks) |
| **JSON report** | **IMPLEMENTED & VERIFIED** | `src/reports/report-builder.ts` (Conforms to `docs/schemas/finding.schema.json`) |
| **AI advisory bridge** | **IMPLEMENTED & VERIFIED** | `gemini_integration/run_advisory.ts` (Google Gemini 2.5 Flash with `needsHumanReview: true` gate) |
| **Supply-chain provenance** | **IMPLEMENTED & VERIFIED** | SPDX 2.3 SBOM (`dist/mockguard.spdx.json`) and SHA-256 digests (`dist/SHA256SUMS.txt`) |
| **Process supervision** | **IMPLEMENTED & VERIFIED** | `src/platform/process-supervisor.ts` (Timeouts, output truncation, safe env whitelist) |
| **Sandbox isolation** | **CONTAINED (NOT OS SANDBOX)** | Child-process working directory and temp worktree isolation (accurately disclosed) |
