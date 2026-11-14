# MockGuard

> **Verify whether AI-generated tests protect real behavior — not just mocks.**

[![MockGuard CI](https://github.com/adishxm/mockguard/actions/workflows/ci.yml/badge.svg)](https://github.com/adishxm/mockguard/actions/workflows/ci.yml)
[![CodeQL Security](https://github.com/adishxm/mockguard/actions/workflows/codeql.yml/badge.svg)](https://github.com/adishxm/mockguard/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/Tests-101%20passing-brightgreen.svg)](tests/)

MockGuard is a developer tool and CI guardrail built for **HackMatrix Problem Statement #41: "AI-generated tests test the mock, not the code."** It combines static AST mock-pattern analysis with controlled mutation testing to verify whether a passing (green) test suite actually detects regressions in production behavior.

---

## The Problem: The False-Green Trap

AI coding assistants (Copilot, Cursor, ChatGPT) frequently write tests that achieve 100% code coverage by mocking internal dependencies and asserting solely on mock behavior:

```typescript
// ❌ Dangerous AI Test: Achieves 100% coverage, but tests nothing!
test('processes payment and updates order', async () => {
  const paymentMock = jest.fn().mockResolvedValue({ status: 'SUCCESS' });
  const service = new OrderService(paymentMock);

  await service.checkout({ amount: 100 });

  // Only asserts the mock was called — never checks if the order was created,
  // charged the right amount, or handled business logic errors!
  expect(paymentMock).toHaveBeenCalledWith(100);
});
```

If business logic in `OrderService` breaks, this test **still passes**. MockGuard identifies these weak tests, mutates production behavior in a controlled loop, and proves whether tests can catch real faults.

---

## Quickstart

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### Installation & Build

```bash
# Clone repository
git clone https://github.com/adishxm/mockguard.git
cd mockguard

# Install dependencies (zero production runtime dependencies)
npm install

# Build TypeScript to dist/
npm run build

# Run all 40 automated tests
npm test
```

### Running the CLI

```bash
# View CLI help and options
node dist/src/cli/index.js --help

# Run baseline verification on a target project
node dist/src/cli/index.js baseline ./my-project

# Run complete mock verification with static analysis and mutation testing
node dist/src/cli/index.js verify ./my-project

# Run revision comparison between a base Git commit and current working tree
node dist/src/cli/index.js compare --base HEAD~1 ./my-project

# Export structured JSON report with secret redaction
node dist/src/cli/index.js verify ./my-project --format json --out ./mockguard-report.json

# Run the interactive in-depth CLI demo
npm run demo:cli
```

---

## CLI Options

| Flag | Default | Description |
|---|---|---|
| `command` | `verify` | Command to execute: `verify`, `baseline`, `compare`, `help`, `version` |
| `targetPath` | `.` | Target project directory containing `package.json` and Jest tests |
| `--base <git-ref>` | *None* | Base Git commit, branch, or tag to compare against current working tree (required for `compare`) |
| `-c, --config <path>` | *Auto-discovered* | Explicit path to Jest configuration file (`jest.config.js`, `.json`, `.ts`) |
| `-f, --format <format>` | `terminal` | Report format: `terminal` or `json` |
| `-o, --out <path>` | *stdout* | Output file path for generated JSON report |
| `--timeout <ms>` | `60000` | Process timeout per test execution in milliseconds |
| `--max-mutants <n>` | `20` | Maximum number of deterministic AST mutants to generate and evaluate |
| `--concurrency <n>` | `1` | Number of parallel worker processes for mutation runs |
| `--bail` | `false` | Stop immediately on first surviving mutant or baseline failure |
| `--test-match <glob>` | *All* | Filter test files matching glob pattern |
| `--include <glob>` | *All* | Source file inclusion pattern |
| `--exclude <glob>` | *None* | Source file exclusion pattern |
| `-t, --testNamePattern <p>` | *All* | Filter tests by pattern |
| `--changed` | `false` | Only analyze tests covering uncommitted Git changes |

---

## How MockGuard Works

```
                        ┌────────────────────────────────┐
                        │   AI-Generated Test Suite      │
                        └───────────────┬────────────────┘
                                        │
                         [Phase 1: Baseline Runner]
                                        │
                        ┌───────────────┴────────────────┐
                        │ Original suite must pass (100%)│
                        └───────────────┬────────────────┘
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
    [Phase 2: Static Analysis]                 [Phase 3: Mutation Verification]
   • AST mock pattern scanning                 • Controlled AST mutations
   • Detects MOCK_ASSERTION                    • Boundary & conditional flips
   • Detects MOCKED_SUT                        • Bounded Process Supervisor
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                         [Phase 4: Attribution Engine]
                   • Links surviving mutants to weak tests
                   • Generates reproducible JSON/Terminal report
                   • Suggests behavioral assertions to fix mock
```

---

## Security & Execution Guardrails

MockGuard is designed with security-first boundaries governed by [`.brain/.work/shared/threat_model.md`](.brain/.work/shared/threat_model.md) and [`SECURITY.md`](SECURITY.md):

1. **Process Supervision**: Child test runners are monitored with strict timeouts (default 60s) and memory caps (10MB output buffer). Runaway processes are terminated cleanly via `SIGTERM` with `SIGKILL` escalation.
2. **Environment Isolation**: Child test processes run inside a sanitized environment variable whitelist (`safeEnv`) preventing leakages of sensitive tokens into test environments.
3. **Secret Redaction**: Test stdout/stderr is filtered through `SecretRedactor` to strip AWS keys, GitHub tokens (`ghp_`), Bearer/JWT tokens, and private keys before persistence.
4. **Clean Packaging**: Distribution tarballs are verified via `scripts/verify-package.js` to ensure zero internal research or test files leak into npm packages.
5. **Zero Telemetry Guarantee**: MockGuard operates 100% locally by default. No source code or analysis findings are transmitted to remote servers.

---

## Verification & Test Suite

MockGuard maintains an automated test suite with **86 passing tests** executed across Node **18.x**, **20.x**, and **22.x** in GitHub Actions:

- **Platform & Runner Acceptance (27 tests)**: CLI parsing, project auto-discovery, monorepo support, process supervisor timeouts, child tree termination, baseline execution, concurrency pools, and report builders.
- **Static Analysis & Rule Engine (14 tests)**: AST symbol resolution, import alias handling, and P2 rules (`MOCKED_SUT`, `CALL_ONLY_ASSERTION`, `MOCK_ASSERTION`, `NO_ASSERTION`, `UNSUPPORTED_PATTERN`).
- **AST Mutation Engine (10 tests)**: Deterministic mutant generation across 4 operator categories (`BooleanLiteralFlip`, `ComparisonOperatorReplacement`, `NumericBoundaryMutation`, `PrimitiveReturnMutation`), bounded concurrency, total timeout, and isolated sandbox execution without touching source files.
- **Git Revision Comparator (5 tests)**: Commit resolution, dirty working tree detection, temporary worktree lifecycle, and delta report generation.
- **Security & QA Release (19 tests)**: Secret token masking, process timeouts, memory output bounds, environment variable isolation, path traversal rejection, tarball packaging allowlists, and SPDX 2.3 SBOM generation.

```bash
npm test
# ℹ tests 77 | suites 0 | pass 77 | fail 0
```

---

## Project Structure

```text
mockguard/
├── .brain/                # Single source of truth (contracts, roadmaps, research, reports)
│   ├── .work/             # Workstreams, shared contracts, threat models, and phase plans
│   ├── .report/           # Phase gate reports (P0, P1, security reviews)
│   └── .testdata/         # Functional and adversarial test fixture definitions
├── .github/               # Hardened GitHub Actions CI, CodeQL SAST, Dependabot, and CODEOWNERS
├── corpus/                # Labeled ground-truth corpus (cases.jsonl)
├── docs/                  # Full research specifications and architectural blueprints
├── scripts/               # Test runner, packaging auditor, and SPDX SBOM generator
├── src/
│   ├── cli/               # CLI entrypoint, argument parsing, and options normalization
│   ├── contracts/         # Exit codes, outcome enums, and report schemas
│   ├── platform/          # Baseline runner, process supervisor, discovery, config resolver
│   ├── mutation/          # Mutation orchestrator and adapter interfaces
│   ├── artifacts/         # Run directory manager and secret redactor
│   └── reports/           # Terminal and JSON report generators
└── tests/
    ├── platform/          # Acceptance tests for runtime and CLI
    ├── mutation/          # Mutation engine and orchestrator tests
    └── security/          # Adversarial security, packaging hygiene, and SBOM tests
```

---

## Team Execution Model

The team operates under a 4-member model governed by [`AGENTS.md`](AGENTS.md) and [`.brain/.work/team_execution_model.md`](.brain/.work/team_execution_model.md):

| Member | Focus Area | Exclusive File Boundaries |
|---|---|---|
| **Worker 01** | **Platform & Runtime** | `src/platform/`, `src/runner/`, `src/reporters/`, CLI entry points, process supervisor |
| **Worker 02** | **Analysis & Mutation** | `src/analysis/`, `src/ast/`, `src/rules/`, `src/mutation/`, attribution engine |
| **Worker 03** | **Security, QA & Release** | `.github/`, security policies, threat model, adversarial test fixtures, packaging |
| **Worker 04** | **Pitch & Narrative** | `.brain/.work/pitch_deck/`, presentation scripts, demo storyboard, judge Q&A |

> **Operational Policies**:
> - **"Ask Twice" Gate**: No agent or worker enters another worker's domain without a mandatory double confirmation.
> - **"Pull Before Push"**: Every worker fetches and rebases remote updates (`git fetch origin && git pull --rebase origin main`) before pushing.

---

## License

MockGuard is licensed under the [Apache License, Version 2.0](LICENSE).
Copyright 2026 MockGuard Project Authors.
