# MockGuard — PS #41 Engineering and Research Document

**Problem statement:** PS #41 — *AI-generated tests test the mock, not the code*
**Track:** Developer Tools, CI/CD & Open Source
**Document date:** 14 November 2026
**Team:** HEXARK (as in the first draft; edit as needed)
**Status:** Consolidated, corrected blueprint. It merges the two earlier drafts (MockGuard and MockGuard), applies every accepted fix from the review rounds, and adds a full technical stack, workflow, evaluation design and roadmap. **No MockGuard measurement exists yet.** Every result must come from the finished repository.

> **Core thesis.** A green AI-generated test suite is not evidence. A test earns trust only if it **fails when the production behavior it claims to protect is changed**, and that has to be shown by execution, not asserted by a model.

---

## Table of contents

0. How to read this document (claim labels, verification log, assumptions)
1. Executive summary and decisions
2. Problem analysis (what PS #41 actually describes)
3. Research evidence base and its limits
4. Competitive landscape and honest novelty claim
5. Product definition (users, commands, exit codes, config, outputs)
6. System architecture (pipeline, components, interfaces, repo layout, report schema)
7. Detection design (vacuity taxonomy, provenance, probe, echo, correlation)
8. Mutation engine (Stryker setup, statuses, scoring, scope, anti-gaming, kill matrix, certificates)
9. Merge engine (non-destructive insertion, provenance, idempotence)
10. Repair, optional LLM layer, and the agent-in-the-loop gate
11. Technology stack (every tool, why, and how it is used)
12. Reference fixture (full code, configs, expected behavior)
13. Evaluation design (hypotheses, corpus, conditions, metrics, statistics, validity)
14. Security and threat model
15. Production engineering
16. Research-grade engineering workflow, spikes, roadmap and schedules
17. Demo script and submission package
18. Risk register
19. Claim ledger, final checklist, open questions
20. Reading list with verification status
21. Appendices (change log, glossary, command cheat sheet, prompts)

---

## 0. How to read this document

### 0.1 Claim labels

Every non-trivial statement carries one of these labels so a plan is never mistaken for a result.

| Label | Meaning |
|---|---|
| **VERIFIED-14NOV** | Checked on 14 November 2026 against a primary or near-primary page (paper abstract or full text, official docs, repository page). |
| **REPORTED** | Taken from earlier research notes or the review rounds. Plausible, but **not rechecked**. Open the source and confirm before citing. |
| **DESIGN** | A MockGuard proposal. Not tested. |
| **TARGET** | A number or outcome we intend to measure. Not a result. |
| **ASSUMPTION** | A planning dependency that a spike must confirm. |
| **UNKNOWN** | Not established. |
| **MEASURED** | A result produced by a committed command on a tagged commit. **None exist yet.** |

### 0.2 Verification log (what was actually checked on 14 November 2026)

| Item | Result | Source type |
|---|---|---|
| Hora and Robbes, *Are Coding Agents Generating Over-Mocked Tests? An Empirical Study*, arXiv 2602.00409, MSR '26 (13–14 April 2026, Rio de Janeiro) | Real. Analyzed over 1.2 million commits from 2025 across 2,168 TypeScript, JavaScript and Python repositories: 48,563 agent commits, 169,361 commits that modify tests, 44,900 commits that add mocks. 23% of agent commits add or change test files versus 13% for non-agents. The abstract states 36% of agent test commits add mocks versus 26% for non-agents; the body also reports 36% versus 28% in repositories with higher agent activity. Agents overwhelmingly use the plain `mock` type (95%). The authors call for mocking guidance in agent configuration files. | arXiv abstract and full text |
| Jain, Synnaeve, Rozière, *TestGenEval*, arXiv 2410.00752, ICLR 2025 | Real. 68,647 tests from 1,210 code-test file pairs across **11 Python repositories**. Best model (GPT-4o): average coverage **35.2%**, mutation score **18.8%**. States that prior benchmarks reported pass@k and none reported mutation score. **Python, not JavaScript.** | arXiv, alphaxiv summaries |
| StrykerJS Jest runner: `disableBail` | Confirmed. Stryker's docs state Jest always runs without `--bail` inside Stryker, but reports only the first failing test when `disableBail=false` and all failing tests when `disableBail=true`. The docs' own example shows a small runtime difference (2m33s with bail versus 2m45s without, on one project). | StrykerJS configuration docs |
| StrykerJS `coverageAnalysis: perTest` and `killedBy` / `coveredBy` | Confirmed. `perTest` is the default since v5; the report schema records per mutant `coveredBy` and `killedBy` test ids. | Stryker docs, mutation-testing-report-schema |
| Mutant statuses | Confirmed set: Killed, Survived, NoCoverage, CompileError, RuntimeError, Timeout, Ignored, Pending. | mutation-testing-report-schema |
| Stryker incremental mode | Confirmed: `--incremental`, results stored in `reports/stryker-incremental.json`, `--force` reruns everything in scope, `--mutate src/app.js:5-7` can target line ranges. Available since Stryker 6.2. Change detection for tests depends on the runner plugin (Jest supported). Full runs are still recommended periodically. | Stryker docs and blog |
| Jest runner plugin version line | Documentation indexes show the 9.x line (peer dependency `@stryker-mutator/core ~9.1.0`). **Pin whatever `npm view` shows at install time.** | Package registry mirrors |
| Mutahunter | Real. Open-source LLM mutation testing and test generation, **AGPL-3.0**, Python 3.11+, language-agnostic via coverage reports. About 264 stars and last push in March 2025 on the snapshot I saw. Do not copy code. | GitHub, PyPI |

### 0.3 Not rechecked (treat as REPORTED)

The following came from earlier notes. They may be right; verify each before it appears in a slide.

MutGen (100% coverage, 4% mutation score), Mathews and Nagappan, Ouédraogo et al. test smells, Inozemtseva and Holmes, Gopinath et al., Just et al., Petrović et al. (Google), Meta ACH and TestGen-LLM figures, MuTAP, LLMorpheus percentages, Spadini et al., Papadakis et al. (trivial compiler equivalence), Uber AutoCover details, the AdverTest, GEM-LLM, NSEV, NeuroTestGen, LLMutantKiller, Lacuna, MDT-TSO, MutantGate, Agent-CoEvo and PIT-related claims, and the "22 min → 3–5 min" CI figure. One earlier note already found AdverTest's headline number was misquoted. Do not trust any of these without reading the abstract.

### 0.3b Known corrections already applied

- The weak test in the first draft never called `createOrder`, so Stryker would report **NoCoverage**, not a survivor. The demo test is now the one that *calls* `createOrder` but asserts only the mock interaction (Section 12).
- "Two baselines" was followed by four listed. The evaluation now has **five named conditions** (B0–B4).
- Terminal output examples no longer contain invented numbers. Placeholders appear instead.
- The `disableBail` cost was overstated in one draft. Stryker's own docs show a small difference on one project; the actual cost on our fixtures is a spike measurement.
- The "50 tests × 20 mutants = 1,000 executions" arithmetic ignored per-test coverage analysis. With `perTest`, only tests that cover a mutant run for it.
- The hollow-body probe has a real flaw: a test that **expects a rejection passes against a throwing stub**. Section 7.5 now uses two stub variants and keeps the probe advisory.
- Reference-identity echo detection has high precision and low recall; switching to deep equality adds false positives. Section 7.4 uses confidence tiers instead of replacing one with the other.
- Merge hashing raw text would make a Prettier run look like a hand edit. Section 9 hashes a normalized AST and reconciles imports without removing any.

### 0.4 Assumptions about the event (UNKNOWN until you fill them in)

I do not know: the event length, your team size, the judging rubric, or which languages each member knows best. Section 16 gives three schedule templates (sprint of about two days, standard of about one week, extended of three to four weeks) and role splits for one, two and three-to-four people. **Pick the template that matches, then cut using the rules in 16.8.** Ask the organizers for the judging rubric before freezing scope.

---

## 1. Executive summary and decisions

### 1.1 What MockGuard is

**DESIGN.** A local-first TypeScript/JavaScript CLI (and optional CI action) that audits AI-generated Jest tests. It does four things:

1. **Audit:** statically detects mock-centered vacuity patterns, with file and line evidence and a confidence level.
2. **Prove:** runs controlled mutation testing on the production code, builds a per-test **kill matrix**, and issues each test a **proof certificate** listing the mutants only that test kills.
3. **Correlate:** joins static suspicion with dynamic proof, so a warning becomes high confidence only when a related mutant survives.
4. **Merge:** inserts accepted tests into existing files by AST-located text splice, never overwriting hand-written tests or tuned mocks.

### 1.2 The one-sentence pitch

> **MockGuard verifies whether AI-generated tests protect real behavior: it detects mock-centered assertions, mutates the production code, and shows exactly which behavior changes the tests fail to notice.**

### 1.3 Why this wedge

- **Problem is measured.** Agents add mocks more often than non-agents in real repositories (VERIFIED-14NOV, Section 0.2), and the authors recommend guidance rather than enforcement. MockGuard is the enforcement-side tool.
- **LLM-written tests are weak at detecting faults** under mutation score on a real-world benchmark (VERIFIED-14NOV: TestGenEval, Python).
- **Mutation-guided generation is studied and partly productized** (REPORTED: Meta ACH, TestGen-LLM, MuTAP). The open space is a **deterministic gate** that does not trust the model that wrote the tests.
- **Stryker already measures.** We do not compete on the engine. We add provenance, mock-vacuity evidence, per-test proof and safe merging.

### 1.4 Decisions (architecture decision records, short form)

| ID | Decision | Reason | Revisit if |
|---|---|---|---|
| ADR-01 | Product name **MockGuard**, binary `mockguard` (alias `mt`) | "MockGuard" is generic and likely collides with existing products. Do a name search before registering npm and GitHub names. | A trademark or package-name conflict appears |
| ADR-02 | One ecosystem: **TypeScript/JavaScript with Jest** | Narrow scope, deep evidence. Jest is the most common runner for this pattern and Stryker supports it. | Spike 1 fails |
| ADR-03 | **StrykerJS is the primary mutation engine**; a small in-house `MiniMutator` is the fallback and the replay engine | Stryker gives per-test `killedBy`, `coveredBy`, incremental mode and a standard report schema. MiniMutator covers the fixture and makes replay possible if Stryker internals are awkward. | Stryker setup exceeds its time-box |
| ADR-04 | Parse with the **TypeScript Compiler API** | Type-aware symbol resolution is needed to know whether a test calls a production binding. | Parsing speed or API pain becomes a blocker (then evaluate ts-morph as a wrapper) |
| ADR-05 | Merge by **AST-located text splice**, never reprint the file | Guarantees untouched bytes stay byte-identical. | A formatter requirement forces reprinting |
| ADR-06 | The gate is **deterministic**. LLMs may explain or propose, never decide | The model that wrote the tests must not verify them. | Never |
| ADR-07 | Two mutation scores are shown: **Stryker-compatible** (timeouts count as detected) and **strict** (timeouts reported separately) | Comparability with Stryker output without hiding timeouts | Team prefers one |
| ADR-08 | Kills are classified **assertion kill** versus **crash kill**; certificates use assertion kills by default | Crash-only kills are weak evidence | Spike shows failure messages are unavailable |
| ADR-09 | Real-package evaluation and the clean-clone test are **never cut** | They make every number believable | Never |

### 1.5 MVP freeze (the thing you must ship)

**Tier 0, must ship:** one realistic fixture with a *true surviving mutant*; Stryker adapter producing a kill matrix; static rules V1 and V3 (plus V4 and V6 if cheap); terminal and JSON reports; clean-clone setup; README with limitations.

**Tier 1, credibility (pick what fits the schedule):** proof certificates; hollow-body probe; `merge` command; a CI action showing score delta on changed code; a small real-package evaluation; related-work and competitor slide; security notes; claim ledger.

**Tier 2, differentiators (at most one or two):** runtime echo detection; agent MCP loop; sampling intervals; equivalence filter.

**Tier 3, roadmap only, mention in the README but do not build:** second language, IDE plugin, dashboards, Z3-based equivalence, ML mutant prediction, distributed cloud runs, LLM-generated mutants as the primary engine.

---

## 2. Problem analysis

### 2.1 What PS #41 describes

The supplied catalogue describes four related patterns (cited by name: *PS catalogue, PS #41*):

1. A generator mocks the result of the unit under test and then asserts the mocked result.
2. A test configures mock behavior and asserts that behavior rather than the real observable outcome.
3. A generator copies test-shaped code without proving the production behavior it claims to cover.
4. A later generation pass overwrites carefully prepared mocks or cases.

The catalogue rates the problem 25/25 (5/5 for pain, frequency, feasibility, demo potential and novelty). That is a prioritization signal from the catalogue, **not independent market validation**. Our own evidence has to be generated.

### 2.2 Three formulations

- **Technical:** An AI-generated suite can exercise test doubles or mock configuration without establishing that the system under test produces correct observable behavior under relevant inputs and failure conditions.
- **Developer:** A reviewer needs a fast way to distinguish tests that reproduce configured mock outputs from tests that detect production behavior changes, without reading every generated test and every dependency interaction.
- **Judge-facing:** MockGuard turns "AI generated tests" into "behavior verified" by mutating production code and showing whether the tests notice.

### 2.3 Mapping the four patterns to features

| PS pattern | Feature that addresses it |
|---|---|
| Mocks the unit under test, asserts the mock | V1 static rule, hollow-body probe, surviving-mutant correlation |
| Asserts configured mock behavior | V2 echo and V3 interaction-only rules, echo tiers |
| Copies test-shaped code, proves nothing | V5 copied-logic, proof certificates (tests that kill nothing are flagged) |
| Overwrites hand-tuned mocks | Merge engine with provenance and normalized-AST hash |

### 2.4 What the product must not claim

- That all mocks are bad. Mocks at true external boundaries (network, clock, payment provider, filesystem) are legitimate. We flag **mocking the thing under test** or **asserting only the mock**.
- That mutation score is a complete measure of quality.
- That a surviving mutant always proves a test is wrong (it may be equivalent, or the behavior may be covered by another test).
- That coverage is useless.
- That a static rule understands every semantic defect.
- That MockGuard can repair arbitrary suites automatically.
- Anything universal about frameworks beyond Jest.

---

## 3. Research evidence base and its limits

### 3.1 Evidence we can stand on (VERIFIED-14NOV)

| Finding | Source | Applicability to MockGuard |
|---|---|---|
| Coding agents modify tests more often (23% vs 13% of commits) and add mocks more often (36% vs 26% of test commits in the abstract; 36% vs 28% in high-agent-activity repositories). 95% of agent mocks use the plain `mock` type. | Hora and Robbes, MSR '26, arXiv 2602.00409. Dataset: 1.2M+ commits, 2,168 TS/JS/Python repos. | Direct: same ecosystem (TS/JS). Descriptive only. The authors recommend mocking guidance in agent config files, which is advice, not enforcement. |
| Best LLM (GPT-4o) reached 35.2% average coverage and an 18.8% mutation score generating whole test files for real-world code; earlier benchmarks reported pass@k and none reported mutation score. | Jain et al., TestGenEval, ICLR 2025, arXiv 2410.00752 | **Python** (11 SWE-bench repos). Supports the claim "LLM tests are weak under mutation", but must be described as a Python result. |
| Stryker exposes per-test `killedBy` and `coveredBy`; per-test coverage distinguishes Survived from NoCoverage; Jest runs without bail inside Stryker and `disableBail` controls whether all failing tests are reported. | Stryker docs, report schema | Design foundation for kill matrix and certificates. |

### 3.2 Evidence from earlier notes (REPORTED; verify before citing)

- MutGen reports suites with 100% coverage but only a 4% mutation score (arXiv 2506.02954).
- Mathews and Nagappan: LLM generators often derive tests from the implementation and filter or "fix" failing tests, which can validate bugs (arXiv 2412.14137).
- Ouédraogo et al.: across 20,500 LLM-generated suites common smells include Assertion Roulette and Magic Number Test (arXiv 2410.10628).
- Inozemtseva and Holmes (ICSE 2014): coverage correlates weakly to moderately with suite effectiveness once suite size is controlled. Counterpoint: Gopinath, Jensen and Groce (ICSE 2014). **Cite both.**
- Just et al. (FSE 2014): most real faults are coupled to mutants from common operators; some are not coupled to any.
- Petrović et al. (Google): mutants shown as test goals during code review improved testing; arid-node suppression raised the share of productive mutants; mutation adequacy at scale is neither practical nor desirable, so scope to diffs.
- Meta ACH (FSE Companion 2025) and TestGen-LLM (FSE 2024): industrial mutation-guided generation with a build/pass/improve filter pipeline.
- MuTAP (IST 2024): feeding surviving mutants back into the prompt improves fault detection.
- LLMorpheus: share of behavioral versus equivalent surviving LLM mutants.
- Spadini et al. (MSR 2017, EMSE 2019): mocks increase test-to-production coupling and are hard to keep compatible with real classes.
- Papadakis et al. (ICSE 2015): trivial compiler equivalence detects a meaningful share of equivalent and duplicate mutants.

### 3.3 Where the literature does not reach (UNKNOWN, treat as hypotheses we test)

- No published evaluation of a **guard-and-merge workflow** for AI-generated tests.
- No known false-positive rates for **mock-vacuity static rules** on TS/JS.
- Effectiveness of the **hollow-body probe**, **assertion provenance** and **proof certificates** is unmeasured. They are our designs.
- Most mutation-for-LLM-test papers use **Java or Python**; we are on **TypeScript with Jest and mocks**. Say "reported on Java/Python" in the pitch, never "proven".
- LLM-generated mutants have been evaluated against held-out oracles on small benchmarks. A user repository has no such oracle, so an LLM mutant that survives could be equivalent. This is why LLM mutants are advisory only (Section 10.4).

### 3.4 What we claim from this evidence

Safe: "Agents add mocks more often than humans in real TS/JS repositories. LLM test suites score poorly under mutation on a real-world Python benchmark. Coverage alone does not tell you whether tests would detect a change. MockGuard measures the second question directly."

Unsafe: "Studies prove AI tests are bad." "Our approach reduces escaped bugs." (No evidence yet.)

---

## 4. Competitive landscape and honest novelty claim

| Tool or category | What it does | Gap MockGuard targets |
|---|---|---|
| **StrykerJS** | JS/TS mutation engine, per-test coverage, incremental mode, JSON and HTML reports | No notion of mock vacuity, AI-test provenance, per-test proof or safe merge. It measures; we correlate and enforce. |
| **Mutahunter** (AGPL-3.0, Python) | LLM-based mutation testing and test generation, language agnostic | Generates and scores. Does not audit mock-centered tests or merge safely. AGPL: do not copy code. |
| **qodo-cover and similar generators** | AI test generation and coverage enhancement | Coverage oriented; the model is its own verifier |
| **Agent "skills" for mutation testing** | Instructions the agent may or may not follow | Not a deterministic gate |
| **Istanbul/nyc, Jest coverage** | Execution coverage | Answers "was it executed", not "would it fail" |
| **ESLint testing plugins (jest/valid-expect, no-focused-tests)** | Syntax-level hygiene | No dynamic proof, little mock-vacuity reasoning |
| **Meta ACH and TestGen-LLM, Uber AutoCover** (REPORTED) | Internal industrial systems that validate generated tests | Not available; they confirm that a build/pass/improve filter and mutation guidance work |

**Procedure before claiming "first":** rerun a GitHub, npm and arXiv search the day before submission. Record the queries and dates in `docs/related-work.md`.

**Safe novelty claim:**

> "MockGuard combines mock-vacuity analysis, per-test mutation proof and non-destructive merging into a deterministic gate for AI-generated tests."

**Never say:** "we invented mutation testing", "first", "proves tests correct", "a security scanner".

---

## 5. Product definition

### 5.1 Users and jobs

**Users:** developers using AI assistants, reviewers of AI-generated pull requests, maintainers of TS/JS repositories, CI owners, educators teaching reliable AI-assisted development.

**Jobs to be done:**

1. Know whether generated tests assert real behavior.
2. Find tests that configure a mock and assert only the configured value or the call.
3. See which production changes the suite would not detect.
4. Get a repair direction grounded in the code and test output.
5. Keep a machine-readable result for CI and review.
6. Merge accepted tests without losing hand-tuned mocks.

### 5.2 Commands (DESIGN)

| Command | Purpose | Executes repo code? |
|---|---|---|
| `mockguard init` | Writes a starter config, detects Jest config and test command | No |
| `mockguard scan` | Static audit (rules V1–V6), no mutant execution | No (parse only) |
| `mockguard prove` | Baseline, optional probe, mutation run, kill matrix, certificates, correlation | **Yes** (runs tests and mutants) |
| `mockguard merge` | Insert accepted generated tests into target files by AST splice | No |
| `mockguard report` | Render terminal, JSON, HTML (stretch) or SARIF (stretch) from a run | No |
| `mockguard explain <id>` | Print one evidence card and its replay command | No |
| `mockguard gen` (stretch) | Generate candidate tests with an LLM, then gate them | Yes |
| `mockguard mcp` (stretch) | Serve the gate to AI agents | Yes |

Common flags: `--source <glob>`, `--tests <glob>`, `--runner jest`, `--test-command "<cmd>"` (explicit; never inferred from untrusted text), `--diff <base-ref>` (scope to changed files and lines), `--out <dir>`, `--format terminal|json|sarif|html`, `--timeout <ms>`, `--max-mutants <n>`, `--seed <int>`, `--dry-run`, `--config <file>`.

### 5.3 Exit codes (DESIGN)

| Code | Meaning |
|---|---|
| 0 | Pass: no policy violation |
| 1 | Policy failure: vacuous tests found, ratchet violated, or required kill missing |
| 2 | Infrastructure failure: baseline red, tool error, timeout of the whole run, unsupported setup |

**Rule:** infrastructure failures never appear as surviving mutants, and a red baseline stops the run with `BASELINE_FAILED`.

### 5.4 Configuration

One schema-validated file, `mockguard.config.json` (validated with zod). Suppressions require a reason and an expiry date.

```json
{
  "$schema": "./node_modules/mockguard/schema/config.schema.json",
  "runner": "jest",
  "testCommand": "npx jest --runInBand",
  "source": ["src/**/*.ts"],
  "tests": ["tests/**/*.test.ts"],
  "mutation": {
    "engine": "stryker",
    "operators": ["ConditionalExpression", "EqualityOperator", "LogicalOperator", "BooleanLiteral", "BlockStatement"],
    "oneMutantPerLine": true,
    "aridPatterns": ["console\\.", "logger\\."],
    "maxMutants": 200,
    "seed": 1,
    "timeoutMs": 10000
  },
  "policy": {
    "ratchet": { "scope": "changed-lines", "mode": "no-decrease" },
    "forbidKinds": ["MOCKED_SUT"],
    "failOn": ["high"]
  },
  "suppressions": [
    {
      "rule": "V3",
      "file": "tests/payments.test.ts",
      "line": 42,
      "reason": "Interaction contract with provider is the specified behavior",
      "expires": "2027-03-01"
    }
  ]
}
```

### 5.5 Outputs

- **Terminal summary** (Section 5.6)
- **Versioned JSON** (`schemaVersion` field; Section 6.5)
- **Evidence cards** for each finding with a replay command
- **HTML report** with kill matrix and mutant diffs (stretch)
- **SARIF** (stretch; promise only after it validates)
- **PR comment** with score delta on changed code (stretch)

### 5.6 Terminal output (illustrative format only; `<n>` are placeholders, not measurements)

```text
MockGuard <version>
Repository : <path>@<commit>
Runner     : jest <jest-version> | engine: stryker <stryker-version>

Baseline
  Tests passed : <n>/<n>
  Line coverage: <pct>%         (execution signal only, not a quality score)

Static findings (heuristic)
  V3 interaction-only   tests/order-weak-b.test.ts:<line>      confidence: medium
      asserts paymentClient.charge was called; no assertion on createOrder() result

Mutation proof
  Denominator : killed + timeout + survived + noCoverage = <n>   (excluded: compileError=<n>, runtimeError=<n>, ignored=<n>)
  Killed <n> | Survived <n> | NoCoverage <n> | Timeout <n>
  Score (Stryker-compatible) : <pct>%     Score (strict, timeouts excluded): <pct>%

Top survivor (ranked)
  src/order-service.ts:<line>  ConditionalExpression
    original : payment.status === 'failed'
    mutant   : payment.status !== 'failed'
    status   : SURVIVED  (covered by: <test ids>)

Correlation
  MT-001  V3 + surviving mutant on the same branch  -> confidence: HIGH

Suggested next step (unverified suggestion)
  Call createOrder() with a failed payment; assert status === 'cancelled' and that
  fulfillment.publish was not called. Verify: mockguard prove --tests <file>

Report: reports/mockguard.json   Replay: mockguard explain MT-001
```

---

## 6. System architecture

### 6.1 Pipeline (layers)

| Layer | Name | Purpose | Cost |
|---|---|---|---|
| L0 | Baseline | Run the suite once on the original code. If red, stop with `BASELINE_FAILED`. Record versions and a coverage signal. | One suite run |
| L1 | Static vacuity | AST rules V1–V6 with provenance. Milliseconds. | Negligible |
| L2 | Hollow-body probe (Tier 1, advisory) | One run per target function with a stubbed body, only covering tests | One run per function |
| L3 | Mutation proof | Stryker with per-test coverage and `disableBail`; build kill matrix | Dominant cost |
| L3b | Kill verification replay (optional) | Re-run killing tests N times on original and mutant to reject flaky or crash-only kills | Bounded to certified kills |
| L4 | Correlate, report, merge | Join static and dynamic evidence, rank, emit evidence cards, optional merge | Negligible |

### 6.2 Component diagram

```text
                    CLI  /  GitHub Action  /  (stretch) MCP server
                                   |
                     Config resolver (zod schema, suppressions)
                                   |
        +--------------------------+---------------------------+
        |                          |                           |
 Project discovery          Scope selector              Policy engine
 (jest config, tests)    (diff / imports / globs)     (ratchet, exit codes)
        |                          |                           |
        v                          v                           |
 Baseline runner  <----  Process supervisor (timeouts, capture, redaction)
        |                          ^
        v                          |
 Static analyzer (TS Compiler API)-+---> Mutation orchestrator
  - test model                              |        |
  - mock model                  StrykerEngine     MiniMutator
  - SUT resolution               (primary)        (fallback / replay)
  - provenance (taint)                      \        /
        |                                    v      v
        |                              Result normalizer
        |                              (statuses, killedBy, coveredBy)
        |                                        |
        +--------------> Correlation engine <----+
                                |
        +-----------------------+------------------------+
        v                       v                        v
 Evidence cards            Reporters             Merge engine
 (JSON schema v1)   (terminal, JSON, SARIF, HTML)  (AST splice, hashes)
```

### 6.3 Data flow

```text
repo + config
  -> resolve config, select source scope and test scope
  -> L0 baseline (record exit code, versions, lockfile hash)
  -> L1 parse tests and production code, build models, run rules
  -> L2 optional probe (stub body variants, covering tests only)
  -> L3 Stryker run (perTest coverage, disableBail) -> mutation.json
  -> normalize results into KillMatrix {mutants x tests}
  -> L3b optional replay of certified kills (N runs, original vs mutant)
  -> correlate static findings with mutants by file/line/branch
  -> rank survivors, compute certificates and minimal proving set
  -> write run report (content hash, inputs, versions) + evidence cards
```

"Immutable per run" means the report carries a content hash and exact input metadata. It does not make a local filesystem tamper-proof.

### 6.4 Repository layout

```text
mockguard/
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsup.config.ts
├── LICENSE
├── README.md
├── CHANGELOG.md
├── .github/workflows/ci.yml
├── schema/
│   ├── config.schema.json
│   └── report.schema.json
├── src/
│   ├── cli.ts
│   ├── config/            # load.ts, schema.ts (zod), suppressions.ts
│   ├── discovery/         # jestConfig.ts, scope.ts, diff.ts
│   ├── exec/              # supervisor.ts (timeouts, capture), redact.ts, worktree.ts
│   ├── analysis/          # program.ts (ts.Program), testModel.ts, mockModel.ts,
│   │                      # sut.ts, taint.ts, rules/{v1..v6}.ts, confidence.ts
│   ├── probe/             # hollow.ts (stub generation and interpretation)
│   ├── mutation/          # adapter.ts, stryker.ts, mini/ (operators, apply.ts),
│   │                      # normalize.ts, arid.ts, equivalence.ts
│   ├── proof/             # matrix.ts, certificates.ts, setcover.ts, replay.ts, antigaming.ts
│   ├── correlate/         # correlate.ts, rank.ts
│   ├── merge/             # provenance.ts, hash.ts, splice.ts, imports.ts, conflicts.ts
│   ├── improve/           # suggestions.ts (deterministic), llm/ (stretch, advisory)
│   ├── report/            # evidence.ts, json.ts, terminal.ts, sarif.ts, html.ts
│   ├── policy/            # ratchet.ts, exitcodes.ts
│   └── stats/             # wilson.ts, bootstrap.ts
├── fixtures/
│   └── order-service/    # src/, tests/ (variants A–G), jest.config.*.js, stryker configs
├── corpus/
│   ├── cases.jsonl       # labeled synthetic cases
│   └── real-packages.md  # pre-registered package list and selection criteria
├── eval/
│   ├── run.ts            # runs B0–B4 over corpus and packages
│   ├── prompts/          # frozen LLM prompts used to generate AI suites
│   └── results/          # committed JSON and markdown results
├── test/
│   ├── unit/  integration/  adversarial/  golden/  property/
└── docs/
    ├── architecture.md  threat-model.md  capability-ledger.md  related-work.md  decisions.md
```

### 6.5 Core interfaces (DESIGN, TypeScript)

```ts
// Normalized across engines
export type MutantStatus =
  | 'Killed' | 'Survived' | 'NoCoverage' | 'Timeout'
  | 'CompileError' | 'RuntimeError' | 'Ignored' | 'Pending';

export interface Mutant {
  id: string;
  file: string;
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
  operator: string;          // e.g. 'ConditionalExpression'
  original: string;
  replacement: string;
  status: MutantStatus;
  coveredBy: string[];       // test ids
  killedBy: string[];        // test ids (requires disableBail for completeness)
  killKind?: Record<string, 'assertion' | 'crash' | 'unknown'>; // per killing test
}

export interface MutationEngine {
  name: 'stryker' | 'mini';
  run(opts: {
    sourceScope: string[];
    testCommand?: string;
    timeoutMs: number;
    seed: number;
    workDir: string;      // temp copy; never the user's working tree
  }): Promise<{ mutants: Mutant[]; tests: TestInfo[]; engineVersion: string }>;
}

export interface KillMatrix {
  mutants: string[];
  tests: string[];
  kills: Record<string /*mutantId*/, string[] /*testIds*/>;
}

export interface Finding {
  id: string;                         // MT-001...
  kind: 'MOCKED_SUT' | 'ECHO' | 'INTERACTION_ONLY' | 'NO_ASSERTION'
      | 'COPIED_LOGIC' | 'TRIVIAL_ASSERTION' | 'SURVIVING_MUTANT'
      | 'UNSUPPORTED_PATTERN' | 'BASELINE_FAILED';
  rule?: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
  severity: 'info' | 'low' | 'medium' | 'high';
  confidence: 'unverified' | 'low' | 'medium' | 'high';
  test?: { file: string; line: number; name: string };
  production?: { file: string; lines: number[] };
  evidence: { mockSetup?: string; assertion?: string; missingObservable?: string };
  mutant?: Pick<Mutant, 'id' | 'operator' | 'original' | 'replacement' | 'status' | 'killedBy'>;
  probe?: { p1Throw: 'pass' | 'fail' | 'n/a'; p2Return: 'pass' | 'fail' | 'n/a' };
  suggestion?: string;                // advisory; untrusted until re-proven
  replay: string;                     // exact command
}
```

### 6.6 Report schema essentials (`report.schema.json`, versioned)

Top level: `schemaVersion`, `tool` (name, version, commit), `environment` (node, os, jest, stryker, typescript, lockfileHash), `inputs` (repo commit, config hash, scope, seed), `baseline` (exit code, test counts, duration), `mutation` (engine, denominator definition, counts per status, scores, sampled flag, interval), `matrix`, `certificates`, `findings`, `excluded` (equivalent or ignored mutants), `contentHash`.

**Wording rule for findings:** describe observations ("the test asserts the value configured on a mock"), never verdicts ("the test is wrong").

---

## 7. Detection design

### 7.1 Goal of static analysis

Static analysis does not prove a test wrong. It surfaces patterns worth checking, supplies file and line evidence, and prioritizes which survivors to show. **Static plus dynamic evidence together** produce high-confidence findings.

### 7.2 Building the models (DESIGN)

Using the TypeScript Compiler API with a `ts.Program` and its type checker:

1. **Test model.** Find `describe`, `it`, `test`, `it.each`, `beforeEach`, `afterEach` call expressions. Record nesting, names and body ranges. Treat hooks as part of every test body in their scope.
2. **Production scope.** From `--source` or the diff, build the set of production declarations (functions, methods, exported bindings). Resolve each test file's imports with `checker.getSymbolAtLocation` and `getAliasedSymbol` to find which imported bindings point into the production scope.
3. **SUT invocation set.** For each test, collect calls whose callee resolves to a production binding (including through local aliases and destructuring). If the set is empty, the test never invokes production code directly. Helper functions are followed one level deep (configurable).
4. **Mock model.** Recognize:
   - `jest.fn()`, `jest.spyOn(obj, 'method')`, `jest.mock('<path>')` (module-level), `jest.mocked(x)`;
   - configuration calls: `mockReturnValue`, `mockResolvedValue`, `mockRejectedValue`, `mockImplementation`, `mockReturnValueOnce` and their `Once` forms;
   - for each mock, record the declaration, the configured value expression, and whether the mocked target resolves into the production scope (a mock **of production code**) or outside it (a mock **of a boundary**).
5. **Assertion model.** Find `expect(<actual>)` chains. Classify the matcher: value matchers (`toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toThrow`, `rejects`, `resolves`), interaction matchers (`toHaveBeenCalled*`, `toHaveBeenNthCalledWith`, `lastCalledWith`), snapshot matchers, and trivial matchers (`toBeDefined`, `toBeTruthy` on non-boolean expressions).
6. **Light taint analysis** (intra-function, flow-insensitive): track values originating from (a) a SUT call return or rejection, (b) a mock's configured value, (c) literals, (d) fixtures declared outside the test. Follow `const x = await sut()`, property access, destructuring and spreads.

### 7.3 Vacuity taxonomy and rules

| ID | Name | Trigger | Default confidence | Upgrade condition | Known false-positive risk |
|---|---|---|---|---|---|
| **V1** | Mocked unit under test | A production binding is mocked (`jest.mock` of a production module without `requireActual`, or `spyOn(...).mockX` on a production function) **and** the test then calls that same binding and asserts its result | **High** | n/a | A test that deliberately mocks a *sibling* production module to isolate a unit is legitimate; V1 requires the mocked binding to be the one being asserted. |
| **V2** | Echo | The asserted expected value is (or deep-equals) the value configured on a mock and the actual value flows from that mock via pass-through | **Low** statically; **Medium** with runtime identity; **High** only if a related mutant survives | Related surviving mutant, or runtime identity (7.4) | A mock returns `"approved"` and real code correctly returns `"approved"`. |
| **V3** | Interaction-only | Every assertion targets mock calls or mock results; none targets a value derived from a SUT call, state, event, or error behavior | **Medium** | Related surviving mutant on the covered branch → High | A test whose *specified behavior* is the interaction (e.g. "retries 3 times") |
| **V4** | No assertion | No `expect`, no `.resolves/.rejects` chain, no `expect.assertions(n)`, and no thrown-error contract | **Low** | SUT not invoked → Medium | Framework conventions that assert via thrown errors |
| **V5** | Copied logic | Expected value is computed by re-implementing the production expression (normalized AST similarity above a threshold with the production body) | **Low** | Related surviving mutant | Simple arithmetic that legitimately restates a spec |
| **V6** | Trivially true | `expect(true).toBe(true)`, comparing an identifier with itself, `toBeDefined()` as the only check on a value that cannot be undefined, `toBeInstanceOf(Promise)` only | **Medium** | n/a | Smoke tests that intentionally only check existence |
| **U** | Unverified | Parser ambiguity: dynamic property access, computed mock names, `eval`, unsupported syntax, `jest.requireActual` tricks | **Unverified** | n/a | Always abstain rather than guess |

**Do not collapse these into one risk score.** Calibration and explanation are harder with a scalar.

**Boundary mocks are legitimate.** A mock whose target resolves outside the production scope (network client, clock, payment provider, filesystem) is not flagged when the test invokes the SUT and asserts a derived outcome. The negative interaction `expect(publish).not.toHaveBeenCalled()` **after the SUT was invoked** is an observable side-effect assertion and lowers V3 severity.

### 7.4 Echo detection tiers

**Tier S (static).** Taint shows the expected value derives from a mock configuration and the actual value derives from the same mock through the SUT. Confidence low.

**Tier R1 (runtime reference identity, Tier 2 feature).** If the asserted `actual` is the very same object (or a property chain of the same object) that a mock returned, the SUT only passed it through. **High precision, low recall**: primitives have no identity and spread or clone copies defeat it.

**Why not deep equality as the fix.** It raises recall but adds false positives, because a legitimate expected value can equal a mocked value. Therefore:

> An echo finding becomes **high confidence only when a related mutant survives** (the dynamic evidence), regardless of which tier fired.

**How to capture mock returns (spike 4, ASSUMPTION).** Jest records `mock.results` on each mock function, but there is no public API listing all mocks. Candidate approaches, in order of preference:

1. A **custom test environment** extending `jest-environment-node` that wraps `this.moduleMocker.fn` and `spyOn` to register created mocks (the `jest` object is injected per module, so patching it in a setup file will not propagate; patching the environment's `moduleMocker` is more reliable).
2. A **setup file (`setupFilesAfterEnv`)** that wraps `global.expect` to record actual values, combined with a registry fed by (1).
3. Fall back to static Tier S only.

If spike 4 fails, demote the feature; it does not affect Tier 0 or Tier 1.

### 7.5 Hollow-body probe (Tier 1, advisory)

**Idea (DESIGN, unverified in literature; describe as our technique and test it).** For one production function, replace its body with a stub and run only the tests that cover it. Tests that still pass never executed meaningful real behavior. This costs one run per function instead of one per mutant.

**Known flaw and fix.** A test that **expects a rejection** (`await expect(fn()).rejects.toThrow()`) passes against a throwing stub. Therefore two variants:

| Variant | Stub | Test should... | Interpretation |
|---|---|---|---|
| **P1 sentinel throw** | `throw new MockGuardHollowError('<id>')` | fail unless it expects an error | A pass means: not executed, **or** expects an error without checking its identity, **or** swallows errors |
| **P2 sentinel return** | `return __MT_SENTINEL__` (a unique frozen object; async-aware) | fail if it asserts any real result | A pass means: asserts nothing about the return value (interaction-only or not executed) |

**Decision table:**

| P1 | P2 | Meaning | Action |
|---|---|---|---|
| pass | pass | Strong hollow candidate | Flag; confirm with mutation |
| pass | fail | Error-path test or expects a throw | Do not flag; note only |
| fail | pass | Asserts only the thrown/absent path | Look at V3/V4 |
| fail | fail | Executes real code and asserts results | Healthy |

Also: tests that call the function in `beforeEach` fail or crash against a throwing stub; that shows execution, not hollowness.

**Status:** advisory. Mutation confirms or clears it. If spike 3 shows too many ambiguous outcomes, demote to Tier 2.

### 7.6 Correlation layer

Static suspicion plus surviving mutants on the same branch is the product's core value.

```text
Static finding  : V3 on test T (asserts only paymentClient.charge was called)
Dynamic finding : mutant M on `payment.status === 'failed'` SURVIVED; T is among its coveredBy
Correlation     : M lies in the production function T invokes, on a branch whose behavior T does not assert
Result          : confidence raised from medium to HIGH; evidence card links T, M and a replay command
```

Mapping rules: (1) match by production file and line range of the mutant inside a function in T's SUT invocation set; (2) require T ∈ coveredBy(M); (3) prefer mutants on branch conditions and return statements; (4) if no related mutant exists, keep the static confidence and say so.

Static analysis alone over-reports; mutation alone is slow and does not explain why a test is weak. Together they are actionable.

---

## 8. Mutation engine

### 8.1 Primary path: StrykerJS (VERIFIED-14NOV for the options named; confirm exact names in the docs for your installed version)

Packages: `@stryker-mutator/core`, `@stryker-mutator/jest-runner`, `@stryker-mutator/typescript-checker` (type-checks mutants so type-invalid ones become `CompileError` instead of polluting the score). Pin the versions `npm view` returns at install time; documentation currently shows the 9.x line.

Key options we rely on:

| Option | Value | Why |
|---|---|---|
| `testRunner` | `"jest"` | Runner plugin |
| `coverageAnalysis` | `"perTest"` | Which tests cover which mutant; separates Survived from NoCoverage; runs only covering tests per mutant (this is what makes runtime tractable) |
| `disableBail` | `true` for the **proof run** | Jest reports only the first failing test otherwise, so `killedBy` would be incomplete and certificates unreliable. Docs show a small runtime cost on one project; **measure it on our fixture (spike 1)**. |
| `mutate` | explicit files, or `file:startLine-endLine` ranges | Diff-scoped runs; line ranges are supported (shown in the incremental docs) |
| `incremental` / `--incremental` | on in CI, off for the proof run on fixtures | Reuses previous results; run a full pass periodically |
| `checkers` | `["typescript"]` | Filters type-invalid mutants as CompileError |
| `timeoutMS`, `timeoutFactor` | e.g. 10000, 1.5 | Bounds infinite-loop mutants |
| `concurrency` | small (1–4) | Deterministic and resource-safe on laptops |
| reporters | `json` (and `clear-text` for humans) | JSON report is our input |

Stryker runs mutants in its own sandbox copy of the project (`.stryker-tmp`), so the user's working tree is not modified by the mutation run itself. **MockGuard must still state this explicitly and never mutate the working tree in its own components.**

Fixture Stryker config (see Section 12 for the full set; confirm option names against current docs):

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "jest",
  "jest": { "configFile": "jest.config.weak-b.js" },
  "coverageAnalysis": "perTest",
  "disableBail": true,
  "mutate": ["src/order-service.ts"],
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json",
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": "reports/mutation/mutation.json" },
  "timeoutMS": 10000,
  "timeoutFactor": 1.5,
  "concurrency": 2
}
```

### 8.2 Status taxonomy (VERIFIED-14NOV set) and how we treat each

| Status | Meaning | Treatment |
|---|---|---|
| Killed | A test failed with the mutant active | Counts as detected |
| Survived | Covered by tests, all passed | Counts as undetected; candidate weakness |
| NoCoverage | No test covers the mutant | Undetected; **reported separately** (a coverage gap, not a weak assertion) |
| Timeout | Tests exceeded the time limit (often an infinite loop the mutant caused) | Stryker-compatible score counts it as detected; **strict score excludes and reports it** |
| CompileError | Mutant does not type-check or compile | Excluded from the denominator; listed |
| RuntimeError | Test run crashed for reasons unrelated to test results | Excluded; reported as infrastructure noise |
| Ignored | Excluded by config, comments or rules | Excluded; listed |
| Pending | Not yet run | Should never appear in a final report |

Infrastructure failures (tool crash, missing runner, killed process) are reported as `TOOL_ERROR`, **never** as Survived.

### 8.3 Scoring (ADR-07)

Definitions (confirm against the Stryker metrics page for your version):

```text
detected          = Killed + Timeout                       (Stryker-compatible)
valid             = Killed + Timeout + Survived + NoCoverage
score_compatible  = detected / valid
covered_score     = detected / (detected + Survived)       (ignores NoCoverage)
score_strict      = Killed / (Killed + Survived + NoCoverage)   (Timeouts reported separately)
excluded          = CompileError + RuntimeError + Ignored
```

Every printed score shows its numerator, denominator and exclusions. Never compare scores across runs with different mutant sets without saying so. If equivalent mutants are not removed, say they may depress the score.

### 8.4 Scope control

Never mutate the whole repository by default. Priority order:

1. Files and **changed line ranges** in the pull request (`--diff <base>`), via `git diff --unified=0` → Stryker `file:start-end` ranges.
2. Files imported by the target tests (from the static model).
3. An explicit `--source` list.
4. The fixture module when running the demo.

**Gate scope (accepted fix).** A gate that only checks *changed tests* misses mutants in *changed production code*. Run two scopes and report both:

| Scope | Question it answers |
|---|---|
| A: mutants in changed production lines, tests = all covering tests | "Did this change reduce protection of behavior?" |
| B: mutants in all lines covered by the *new or changed tests* | "Do the new tests prove anything?" |

### 8.5 Reducing noise (arid-node suppression, one mutant per line)

Inspired by Google's reported practice (REPORTED, verify numbers): suppress mutants unlikely to be productive and limit the number surfaced.

- **Arid patterns** (configurable): logging calls (`console.*`, `logger.*`), metrics and telemetry calls, type-only syntax, string literals used only in log messages, and lines with `// Stryker disable` comments.
- **Stryker-side:** exclude noisy mutators (for example string literals) via the mutator configuration, and use `// Stryker disable next-line <mutator>` for justified exceptions (verify syntax in docs).
- **One mutant per line:** after the run, when reporting, keep the highest-priority survivor per source line (priority: conditional/boolean/equality operators on branch conditions > return values > arithmetic > string). With MiniMutator, enforce it at generation time.
- Always report counts before and after suppression so nothing is hidden.

### 8.6 Kill matrix, proof certificates and minimal proving set

From the normalized results build `KillMatrix` (mutants × tests) using `killedBy` (requires `disableBail: true`).

**Proof certificate for a test `t`:**

```text
unique(t)   = { m | killedBy(m) == {t} }          # mutants only t kills
shared(t)   = { m | t in killedBy(m), |killedBy(m)| > 1 }
status(t)   = PROVEN     if |unique(t)| >= 1
              REDUNDANT  if unique(t) empty and shared(t) non-empty
              VACUOUS    if t kills nothing
```

A test with an empty certificate is flagged as redundant or vacuous. "Redundant" is not "bad" (overlap is normal), so wording must be careful.

**Minimal proving set (greedy set cover):**

```text
uncovered = set of killed mutants
chosen = []
while uncovered not empty:
    t* = argmax over tests of |kills(t) ∩ uncovered|     # ties broken by test id for determinism
    chosen.append(t*); uncovered -= kills(t*)
return chosen
```

Greedy is the standard approximation; it is not guaranteed minimal. State that.

**Mutant ranking (show the top 3, not hundreds):** score each survivor by (a) operator on a branch condition or return value, (b) location in business logic (not logging), (c) covered only by tests flagged by static rules, (d) not an equivalence candidate, (e) not duplicated by another survivor on the same line.

### 8.7 Anti-gaming rules (accepted fix; the gate must not trust the model that wrote the tests)

LLMs optimizing for "kills mutants" can cheat. Rules (DESIGN):

| Cheat | Detection and policy |
|---|---|
| **Change-detector tests:** read source text, call `.toString()` on functions, or snapshot internals so any edit "kills" a mutant | Static rule: forbid `fs.readFileSync` on production paths, `Function.prototype.toString`, and snapshot matchers on non-serializable internals when the policy says so. Report as `GAMING_SUSPECT`. (Google's work warns that tests written to kill mutants can become change-detector tests; REPORTED.) |
| **Inspecting instrumentation:** tests that look at Stryker globals or environment to know a mutant is active | Static rule: forbid references to Stryker instrumentation globals/env (verify names in docs for the installed version). |
| **Flaky or crash-based kills:** random or time-dependent failures, or crashes unrelated to assertions | L3b replay: a certified kill must fail **N times on the mutant** (default 3) and **pass N times on the original**. Fake timers and seeded randomness are required by policy; flaky tests are quarantined and excluded from certificates. |
| **Assertion versus crash kills** | Classify each kill from the Jest failure output (assertion-matcher failure vs thrown non-assertion error). Certificates count assertion kills by default; crash kills are listed separately (ADR-08). If Stryker's report does not expose failure messages, replay the killing test under Jest JSON output (spike item). |
| **Unbounded retry loops** in agent-in-the-loop mode | Hard cap on iterations, tokens and wall-clock; record every attempt. |
| **Editing production code to make tests pass** | The gate operates on a fixed commit; a diff that touches production files outside the declared scope fails policy. |

### 8.8 Sampling and statistics

When the mutant set is capped, sample with a **fixed seed** and report uncertainty. For observed proportion p̂ = k/n and z = 1.96 (95%), the Wilson interval:

```text
center    = (p̂ + z²/(2n)) / (1 + z²/n)
halfwidth = z * sqrt( p̂(1−p̂)/n + z²/(4n²) ) / (1 + z²/n)
interval  = [center − halfwidth, center + halfwidth]
```

If the sample is a large fraction of the population, apply a finite-population correction or simply run everything. Always print the sample size and seed. Never compare a sampled score with a full-run score without saying so.

### 8.9 Equivalent mutants

Some mutants are behaviorally identical and cannot be killed. Policy:

- **Trivial compiler equivalence (practical for JS/TS):** transpile or minify original and mutant; identical output means equivalent, exclude it and list it. (Adapts Papadakis et al.; REPORTED, verify before citing.) Do not claim it catches all cases.
- **Possibly equivalent:** label `EQUIVALENCE_CANDIDATE`; keep the raw mutant visible.
- **Advisory LLM judge:** may add a label, never decides.
- **Z3 or SMT-based equivalence:** roadmap only. The published work targets Java; dynamic typing, async code, closures and mocks make encoding hard for JS/TS.
- **Differential-execution witness search (idea, untested, Tier 3):** fuzz inputs with fast-check, run original and mutant, report either a concrete distinguishing input or "possibly equivalent after N inputs".

### 8.10 Flakiness control

Run the baseline suite K times (default 2–3) during `prove` setup; tests that disagree across runs are quarantined and excluded from certificates. Require fake timers, seeded randomness and `--runInBand` for fixtures. Record any quarantine in the report.

### 8.11 MiniMutator (fallback and replay engine, DESIGN)

A deterministic mutator built on the TypeScript AST, used for the fixture, for replay and as the fallback if Stryker setup overruns its time-box.

- **Operators (start small):** `===`↔`!==`, `==`↔`!=`, `<`↔`<=`, `>`↔`>=`, `&&`↔`||`, boolean literal inversion, conditional replaced by `true`/`false`, block emptied (`{}`), return-value replacement for selected expressions, and removal of a side-effect call statement only when the fixture can observe it.
- **Mechanics:** parse file → enumerate candidate nodes with source ranges → for each, produce a mutant by **text splice** (replace the node's text range), never by reprinting → write to a temp copy of the project → run the test command → classify by exit code and Jest JSON.
- **Determinism:** nodes in source order, ids derived from `file:start:operator`, seeded sampling.
- **Honesty:** if MiniMutator is the engine, the report states "engine: mini; operator set: <list>" and the scope claim shrinks accordingly.

### 8.12 Cost model (no invented numbers)

With `perTest` coverage, runs per mutant = number of tests that cover it, not the full suite. Approximate cost:

```text
T_total ≈ Σ over mutants m ( |coveredBy(m)| × t_test_avg ) + M × t_overhead_per_mutant
```

Measure `t_test_avg` and `t_overhead` in spike 1 on the fixture and on one real package. Use the measured values to set `maxMutants`, concurrency and what you demo live. Always keep a precomputed run and a recording as fallback.

---

## 9. Merge engine (PS pattern 4: overwriting hand-tuned mocks)

### 9.1 Goals and properties

- Insert accepted generated tests **without touching** hand-written tests or tuned mocks.
- **Idempotence:** merging the same set twice yields no diff.
- **Byte preservation:** all unmarked content stays byte-identical.
- **Determinism:** stable ordering.
- **Conflicts report, never overwrite.**

### 9.2 Mechanism: AST-located text splice (ADR-05)

1. Parse the target test file with the TypeScript compiler.
2. Locate insertion points from the AST: end of the target `describe` block's statement list, or end of file.
3. Compute the exact character offset, splice in the formatted new test text (format only the inserted fragment with Prettier), and leave every other byte alone.
4. Never regenerate the whole file.

### 9.3 Provenance marker and hashing

Each generated test node carries a comment immediately above it:

```ts
// @mockguard generated id=mt-7f3a hash=sha256:9c1e... proof=killed:m12,m15 v=1
it('cancels the order after failed payment', async () => { ... });
```

- **Ownership rule:** unmarked node → never modified. Marked node with matching hash → tool-owned (may be updated). Marked node whose hash changed → **treated as hand-edited and left alone.**
- **Normalized AST hash (accepted fix):** hash a preorder traversal of the node's syntax kinds plus normalized token text (identifier names, literal *values* rather than quote style), ignoring trivia (whitespace, comments, trailing commas). A Prettier run then does not make a generated test look hand-edited. Hashing raw text would.

### 9.4 Import reconciliation (accepted fix)

- Parse the file's imports. For each import the inserted test needs, add the missing named specifier to an existing import from the same module by minimal text edit, or add a new import line.
- **Never remove or reorder** existing imports. Leave unused imports alone (a separate linter job).
- Merge `jest.mock(...)` and setup statements only if absent; never replace an existing mock configuration. A mock setup conflict becomes a report entry.

### 9.5 Conflicts

Same test name, overlapping setup, or a name collision with a marked node whose hash changed → write a conflict entry (`file`, `test name`, `reason`, `suggested rename`) and do not write.

### 9.6 Properties to test (property-based, fast-check)

```text
merge(merge(F, S), S) == merge(F, S)                    # idempotence
unmarked_bytes(merge(F, S)) == unmarked_bytes(F)         # hand-written content preserved
merge(F, S1 ∪ S2) == merge(merge(F, S1), S2)             # order independence up to deterministic sort
prettier(F) then merge == merge then prettier on marked nodes' hashes   # hash stability
```

Plus golden-file tests and a fuzzed parser corpus.

---

## 10. Repair, optional LLM layer, and the agent-in-the-loop gate

### 10.1 Principle

MockGuard recommends a test strategy; it does not blindly rewrite tests. **Any suggested test goes back through the same gate. Suggestions are untrusted until proven.**

### 10.2 Deterministic suggestion templates (first, always available)

```text
Surviving behavior : <mutant description, file:line>
Input to exercise  : <condition that reaches the branch, derived from the mutated expression>
Observable to assert: <return value / status / emitted event / thrown error>
Relevant files     : <production file:line>, <test file>
Verification       : mockguard prove --tests <file> --source <file>
Caveat             : requires domain knowledge to choose the correct expected value
```

Templates never invent the expected business value; they name what to assert, not what the right answer is.

### 10.3 Independent oracles

Prefer **property-based tests** (fast-check) and **metamorphic relations** over example assertions copied from the implementation. Example property for the fixture: for any positive total, a failed payment never publishes fulfillment. **Spec-first generation:** give the model signatures, types, docs and caller usage, not only the function body, and measure it as an ablation against implementation-visible prompting (Section 13).

### 10.4 Optional LLM assistance (Tier 2/3, strictly advisory)

- Input: only the relevant source, test, mutant and failing output, passed as **quoted data**; the model gets **no tools**.
- Output: structured JSON validated by schema, with file and line citations; abstention allowed.
- **Record and replay** every LLM call for reproducibility; cache by content hash.
- The deterministic gate is the only authority. The model never verifies itself.
- **LLM "red-team" mutants:** an optional advisory mode where an LLM proposes extra, context-aware mutants. Reported research on LLM mutants uses oracles we will not have on user repos (REPORTED); a surviving LLM mutant may be equivalent. Label them `ADVISORY` and keep Stryker as the deterministic base.

### 10.5 Agent-in-the-loop gate (high impact, high risk; spike 6 first)

Expose the gate as an MCP server plus a pre-commit/CI hook.

```text
agent writes tests
  -> gate (scan + prove, scoped) rejects vacuous ones with structured evidence
  -> agent revises
  -> gate accepts only tests with proof certificates
  -> merge engine inserts accepted tests
```

MCP tools (DESIGN): `verify_tests` (returns findings and certificates), `explain_finding` (evidence card), `suggest_probe` (which function to stub and why). Metrics: iterations to pass, tokens per accepted test, **proof yield** (accepted ÷ generated), wall-clock. Hard caps on iterations and tokens. This is the enforcement version of the recommendation in Hora and Robbes. If integration is flaky, demote it to the roadmap and keep the CLI demo.

---

## 11. Technology stack

All version numbers are placeholders to be **pinned from `npm view` at install time** and recorded in the lockfile and the report.

### 11.1 Runtime and language

| Layer | Choice | Why / notes |
|---|---|---|
| Language | **TypeScript** | Same ecosystem as the target; compiler API for analysis |
| Runtime | **Node.js, current LTS** (CI matrix may add the previous LTS) | Stryker and Jest run on it; declare supported versions in `engines` |
| Package manager | **npm** with committed `package-lock.json` | Lockfile hash goes into reports |
| Build | **tsup** (esbuild) → `dist/` with CJS+ESM and a `bin` entry | Fast, simple; verify `npx` works from a clean clone |
| Repo hygiene | ESLint, Prettier, `typescript-eslint` | Prettier also formats inserted merge fragments |

### 11.2 Analysis and mutation

| Need | Tool | Role |
|---|---|---|
| Parsing and types | **TypeScript Compiler API** (`typescript`) | Programs, type checker, symbol resolution, AST ranges. Evaluate **ts-morph** only if the raw API becomes a time sink. |
| Mutation engine | **StrykerJS** (`@stryker-mutator/core`, `jest-runner`, `typescript-checker`) | Mutant generation, per-test coverage, `killedBy` |
| Mutation report types | **mutation-testing-report-schema** (npm) | Typed and schema-validated parsing of Stryker's JSON |
| Fallback mutator | In-house **MiniMutator** | Fixture, replay, resilience |
| Test runner (target) | **Jest** (+ **ts-jest**) | Target ecosystem. (Alternative transforms: `@swc/jest` or babel-jest; stay with one for the fixture.) |
| Property testing | **fast-check** | Property tests in fixtures; merge-engine property tests |
| Coverage signal | Jest's built-in coverage (Istanbul) | Baseline execution signal only |

### 11.3 CLI, process control, config and reporting

| Need | Tool | Role |
|---|---|---|
| CLI framework | **commander** (or cac) | Subcommands and flags |
| Config validation | **zod** (+ JSON Schema export) | Validated config, suppressions with expiry |
| Subprocesses | **execa** | Timeouts, output capture, exit codes, killing process trees |
| Concurrency | **p-limit** | Bounded parallelism |
| Git operations | `git` via execa | `diff --unified=0`, temp copies or worktrees |
| Glob | **fast-glob** | File selection |
| Terminal color | **picocolors** | Readable output |
| SARIF (stretch) | `sarif` types + ajv validation against the official schema | Only claim SARIF once the output validates |
| HTML report (stretch) | Static HTML generator, optionally Stryker's `mutation-testing-elements` | Kill matrix, mutant diffs |
| Hashing | Node `crypto` (sha256) | Content hashes, AST hashes |

### 11.4 Quality tooling for the tool itself ("test the tester")

- **Unit and integration tests:** Vitest or Jest for MockGuard's own code (Vitest is fine for the tool; Jest is the *target*). Run **its own suite through its own gate** where possible.
- **Property tests (fast-check):** merge engine, hash stability, set cover determinism.
- **Golden-file tests:** reports and evidence cards.
- **Adversarial fixture folder:** dynamic property access, computed mock names, nested tests, `it.each`, decorators, `jest.requireActual`, snapshot-heavy tests, ESM/CJS mixes.
- **Fuzzing:** feed malformed TypeScript to the parser; expect `UNSUPPORTED_PATTERN`, never a crash or a confident verdict.

### 11.5 CI, release and packaging

| Area | Choice |
|---|---|
| CI | **GitHub Actions**: `npm ci`, lint, unit tests, build, fixture proof, evaluation subset |
| Caching | Cache npm and `reports/stryker-incremental.json` (restore-keys); full run on a schedule |
| Sharding (stretch) | Matrix per changed module (mostly YAML) |
| Release | **semantic versioning**, **changesets** or conventional commits, CHANGELOG, **npm provenance** |
| Distribution | `npx mockguard` zero-install, optional Docker image |
| Docs | README with a 60-second quickstart; `docs/` for architecture, threat model, capability ledger, related work |

### 11.6 Optional AI layer (stretch)

| Need | Choice |
|---|---|
| LLM client | Any provider behind an interface; **record/replay cache keyed by prompt hash**; temperature fixed; model id recorded |
| Structured output | JSON schema validated with zod; reject and abstain on invalid output |
| Agent integration | **MCP server** (official TypeScript SDK) exposing `verify_tests`, `explain_finding`, `suggest_probe` |
| Orchestration | Plain TypeScript state machine (no LangGraph, no extra framework) |

### 11.7 What we deliberately do **not** use (and why)

| Not used | Reason |
|---|---|
| Z3 / SMT equivalence | Java-focused research; poor fit for dynamic JS/TS; days of work |
| LangGraph or agent frameworks | A state machine is enough; fewer failure modes |
| OpenTelemetry + Grafana | Overkill for a hackathon CLI; structured logs suffice |
| Custom cache/call-graph test selection | Stryker's incremental mode already exists |
| Cloud distribution, ML test selection | Roadmap slides, not build items |
| LLM mutants as the primary engine | Non-deterministic, no oracle on user repos |
| Copying code from AGPL tools | License risk |

---

## 12. Reference fixture (full code)

**Domain.** A small order and payment service with observable business outcomes: payment approved, declined, invalid total, fulfillment emitted only after successful payment, consistent returned status.

### 12.1 Layout

```text
fixtures/order-service/
├── package.json
├── tsconfig.json
├── src/
│   └── order-service.ts
├── tests/
│   ├── helpers.ts
│   ├── a-weak-sut-not-called.test.ts      # Weak A: NoCoverage trap
│   ├── b-weak-interaction-only.test.ts    # Weak B: TRUE SURVIVOR (the demo test)
│   ├── c-weak-mocked-sut.test.ts          # Weak C: mocks the unit under test
│   ├── d-echo.test.ts                     # Echo: pass-through
│   ├── e-valid-boundary-mock.test.ts      # Must NOT be flagged
│   ├── f-strong.test.ts                   # Strong: kills the survivor
│   └── g-property.test.ts                 # fast-check property
├── jest.config.base.js
├── jest.config.weak-a.js … jest.config.property.js   # one config per variant (testMatch)
└── stryker.<variant>.config.json
```

One Jest config per variant is deliberate: NoCoverage only appears when *no* test in the selected suite covers a mutant, so Weak A must be run as its own suite.

### 12.2 Production code

```ts
// src/order-service.ts
export interface PaymentResult { status: 'approved' | 'failed' }

export interface Dependencies {
  paymentClient: { charge(amount: number): Promise<PaymentResult> };
  fulfillment: { publish(event: { orderId: string }): Promise<void> };
}

export interface OrderInput { id: string; total: number }

export interface OrderOutcome {
  status: 'confirmed' | 'cancelled';
  fulfillmentPublished: boolean;
}

export async function createOrder(input: OrderInput, deps: Dependencies): Promise<OrderOutcome> {
  if (input.total <= 0) {
    throw new Error('INVALID_TOTAL');
  }

  const payment = await deps.paymentClient.charge(input.total);

  if (payment.status === 'failed') {
    return { status: 'cancelled', fulfillmentPublished: false };
  }

  await deps.fulfillment.publish({ orderId: input.id });
  return { status: 'confirmed', fulfillmentPublished: true };
}

// Deliberate pass-through used by the echo case
export async function getPaymentResult(total: number, deps: Dependencies): Promise<PaymentResult> {
  return deps.paymentClient.charge(total);
}
```

Mutants this produces include: `<=` → `<` (boundary), `<=` → `>` , `=== 'failed'` → `!==`, condition → `true`/`false`, `'failed'` → `""`, emptied blocks, and `&&`/`||`-free arithmetic-free logic (so the mutant list stays small and readable on screen).

### 12.3 Helpers

```ts
// tests/helpers.ts
import type { Dependencies } from '../src/order-service';

export function makeDeps(): jest.Mocked<Dependencies> {
  return {
    paymentClient: { charge: jest.fn() },
    fulfillment: { publish: jest.fn().mockResolvedValue(undefined) },
  } as unknown as jest.Mocked<Dependencies>;
}
```

### 12.4 Test variants

**Weak A — SUT never called (NoCoverage trap).** Do **not** use it to demonstrate survivors.

```ts
// tests/a-weak-sut-not-called.test.ts
import { makeDeps } from './helpers';

it('handles failed payment', async () => {
  const deps = makeDeps();
  deps.paymentClient.charge.mockResolvedValue({ status: 'failed' });

  await deps.paymentClient.charge(100);

  expect(deps.paymentClient.charge).toHaveBeenCalledWith(100);
});
```
Expected: passes; mutants in `createOrder` are **NoCoverage**; static: SUT invocation set empty (V1/V4-family, "SUT not invoked").

**Weak B — true survivor (the demo test).** Calls `createOrder`, asserts only the mock interaction.

```ts
// tests/b-weak-interaction-only.test.ts
import { createOrder } from '../src/order-service';
import { makeDeps } from './helpers';

it('charges the payment client when creating an order', async () => {
  const deps = makeDeps();
  deps.paymentClient.charge.mockResolvedValue({ status: 'failed' });

  await createOrder({ id: 'o-1', total: 100 }, deps);

  expect(deps.paymentClient.charge).toHaveBeenCalledWith(100);
});
```
Expected: passes on the original. Mutant `payment.status !== 'failed'` flips the branch; the test still passes (publish is a resolved mock), so the mutant **Survived**. The `<=` boundary mutants also survive. Static: **V3 interaction-only**, medium → **high** after correlation with the surviving conditional mutant.

**Weak C — mocked unit under test.**

```ts
// tests/c-weak-mocked-sut.test.ts
import * as orderService from '../src/order-service';
import { makeDeps } from './helpers';

it('returns cancelled for failed payment', async () => {
  const deps = makeDeps();
  jest.spyOn(orderService, 'createOrder').mockResolvedValue({
    status: 'cancelled', fulfillmentPublished: false,
  });

  const result = await orderService.createOrder({ id: 'o-2', total: 50 }, deps);

  expect(result).toEqual({ status: 'cancelled', fulfillmentPublished: false });
});
```
Expected: passes. Static: **V1 mocked SUT, high.** Hollow probe: P1 and P2 both pass (the real body is never executed). Mutants in `createOrder` are NoCoverage or covered-but-never-killed, depending on spy placement.

*Note:* `spyOn` on an ES module namespace can fail depending on transpilation (CommonJS via ts-jest works; native ESM may not). Verify in spike 2; if it fails, use `jest.mock('../src/order-service')` with an automock instead.

**Echo — pass-through.**

```ts
// tests/d-echo.test.ts
import { getPaymentResult } from '../src/order-service';
import { makeDeps } from './helpers';

it('returns the payment result', async () => {
  const deps = makeDeps();
  const expected = { status: 'approved' as const };
  deps.paymentClient.charge.mockResolvedValue(expected);

  expect(await getPaymentResult(10, deps)).toBe(expected);
});
```
Expected: V2 echo candidate, **stays low/medium**, because the function is a literal pass-through and no meaningful survivor exists. This case exists to show the product **does not over-claim**.

**Valid boundary mock (must not be flagged).**

```ts
// tests/e-valid-boundary-mock.test.ts
import { createOrder } from '../src/order-service';
import { makeDeps } from './helpers';

it('cancels and does not publish when payment fails', async () => {
  const deps = makeDeps();
  deps.paymentClient.charge.mockResolvedValue({ status: 'failed' });

  const result = await createOrder({ id: 'o-3', total: 100 }, deps);

  expect(result.status).toBe('cancelled');
  expect(deps.fulfillment.publish).not.toHaveBeenCalled();
});
```
Expected: the payment client is a boundary mock (outside production scope); the test invokes the SUT and asserts a derived outcome and a negative side effect. **No finding above info.** This is the negative case that protects credibility.

**Strong test — kills the survivor.**

```ts
// tests/f-strong.test.ts
import { createOrder } from '../src/order-service';
import { makeDeps } from './helpers';

describe('createOrder', () => {
  it('cancels the order and does not publish fulfillment after failed payment', async () => {
    const deps = makeDeps();
    deps.paymentClient.charge.mockResolvedValue({ status: 'failed' });

    const result = await createOrder({ id: 'o-1', total: 100 }, deps);

    expect(result).toEqual({ status: 'cancelled', fulfillmentPublished: false });
    expect(deps.fulfillment.publish).not.toHaveBeenCalled();
  });

  it('confirms and publishes fulfillment after approved payment', async () => {
    const deps = makeDeps();
    deps.paymentClient.charge.mockResolvedValue({ status: 'approved' });

    const result = await createOrder({ id: 'o-4', total: 100 }, deps);

    expect(result).toEqual({ status: 'confirmed', fulfillmentPublished: true });
    expect(deps.fulfillment.publish).toHaveBeenCalledWith({ orderId: 'o-4' });
  });

  it('rejects a non-positive total before charging', async () => {
    const deps = makeDeps();

    await expect(createOrder({ id: 'o-5', total: 0 }, deps)).rejects.toThrow('INVALID_TOTAL');
    expect(deps.paymentClient.charge).not.toHaveBeenCalled();
  });
});
```
Expected: passes on the original; kills the `!==` mutant, the condition-replaced mutants and the `<=` → `<` boundary mutant (via total 0). This is the "after" in the before/after demo. **Anti-gaming note:** the third test uses `rejects.toThrow('INVALID_TOTAL')` with an identity check; under probe P1 it fails because the sentinel error is not `INVALID_TOTAL`, which shows why the message check matters.

**Property test.**

```ts
// tests/g-property.test.ts
import fc from 'fast-check';
import { createOrder } from '../src/order-service';
import { makeDeps } from './helpers';

it('never publishes fulfillment after a failed payment, for any positive total', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 1_000_000 }), async (total) => {
      const deps = makeDeps();
      deps.paymentClient.charge.mockResolvedValue({ status: 'failed' });

      const result = await createOrder({ id: 'p', total }, deps);

      expect(result.fulfillmentPublished).toBe(false);
      expect(deps.fulfillment.publish).not.toHaveBeenCalled();
    }),
    { numRuns: 50, seed: 1 }
  );
});
```
Use a fixed seed for determinism.

### 12.5 Jest configs (base and variant)

```js
// jest.config.base.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  clearMocks: true,
};
```

```js
// jest.config.weak-b.js
const base = require('./jest.config.base');
module.exports = { ...base, testMatch: ['**/tests/b-weak-interaction-only.test.ts'] };
```
Create the other variants the same way (`a`, `c`, `d`, `e`, `f`, `g`, and `all`). `clearMocks: true` avoids cross-test state; keep fake timers and seeded randomness where relevant.

### 12.6 Expected behavior (DESIGN expectations, **not measurements**)

| Suite variant | Baseline | Static (L1) | Mutation (L3) expectation |
|---|---|---|---|
| A weak, SUT not called | green | SUT not invoked → flagged | Mutants in `createOrder` are **NoCoverage** |
| B weak, interaction-only | green | V3 medium | Conditional and boundary mutants **Survived** → V3 becomes **high** |
| C weak, mocked SUT | green | V1 **high**; probe P1+P2 pass | Mutants not killed (body never runs) |
| D echo | green | V2 low/medium (stays) | No meaningful survivor; finding stays low |
| E valid boundary mock | green | **no finding above info** | Conditional mutants **Killed** |
| F strong | green | none | Kills the survivor and the boundary mutant |
| G property | green | none | Kills the failed-payment branch mutants |

The measured table replaces this one only after the repository produces it.

### 12.7 Fixture acceptance (all must pass before building more)

- Fresh clone, `npm ci`, one command per variant runs and finishes with documented exit codes.
- Baseline passes for every variant.
- Variant B yields a true **Survived** mutant, not NoCoverage (**spike 2**).
- Variant F kills that same mutant.
- Variant E is not flagged.
- No hidden files or undocumented environment variables.

---

## 13. Evaluation design

### 13.1 Hypotheses (each is falsifiable and its result will be published even if negative)

| ID | Hypothesis | Prediction |
|---|---|---|
| H1 | Static rules V1/V3 flag seeded mock-centered tests with high precision on a labeled corpus that also contains valid boundary mocks | High-confidence findings: precision ≥ the target set in advance (TARGET) |
| H2 | Static rules alone **miss weaknesses** that mutation exposes, and mutation alone does not explain why | B3 (mutation only) and B2 (static only) each miss cases B4 catches |
| H3 | Correlating static and dynamic evidence **reduces false positives** versus static alone | Fewer high-confidence false positives in B4 than B2 |
| H4 | Tests that pass the proof gate (non-empty assertion-kill certificate) detect more injected faults than plain LLM suites of equal size | Higher kill rate of held-out faults |
| H5 | Spec-first prompting yields tests with higher mutation score than implementation-visible prompting | Higher score for spec-first (ablation) |
| H6 | The merge engine preserves hand-edited content and is idempotent | Property tests pass on a fuzzed corpus |

### 13.2 Subjects

| Subject set | Purpose | Notes |
|---|---|---|
| **S1: synthetic labeled corpus** (`corpus/cases.jsonl`) | Precision, recall, false positives for static rules | About 40–60 cases across V1–V6 **plus valid mocks and unsupported-syntax cases**. A scanner evaluated only on bad examples looks accurate while having unacceptable false positives. |
| **S2: real npm packages** | Realistic numbers | **3–5 packages** (more if time): TS/JS, Jest, permissive license (MIT/Apache-2.0), logic-heavy modules, test run fast, no network or database needed. **Pre-register the list** before running. |
| **S3: real-fault check** | Faults that are not synthetic | Option 1: historical fix reversion (find bug-fix commits with test changes in the package, build the pre-fix source, check whether the AI suite detects it). Option 2: BugsJS-style benchmark (note: many BugsJS projects use Mocha, so check runner compatibility first; REPORTED). |

Corpus case format:

```json
{"id":"b-weak-interaction","kind":"weak","framework":"jest","expectedStatic":"V3","expectedMutation":"SURVIVED"}
{"id":"e-valid-boundary","kind":"valid","framework":"jest","expectedStatic":"NONE","expectedMutation":"KILLED"}
{"id":"c-mocked-sut","kind":"weak","framework":"jest","expectedStatic":"V1","expectedMutation":"SURVIVED"}
{"id":"unsupported-dynamic","kind":"unsupported","framework":"jest","expectedStatic":"UNVERIFIED"}
```

### 13.3 Generating the AI suites reproducibly

- Freeze the prompt templates in `eval/prompts/` (Appendix D has the two baselines: implementation-visible and spec-first).
- Record the **model id**, date, temperature (set low or zero), and seed if the provider supports it. Save raw outputs verbatim.
- Generate **3 independent suites per target file**; do not cherry-pick.
- If an LLM call is part of the pipeline, record and replay.
- Do not edit generated tests before measurement; edits invalidate the comparison.

### 13.4 Conditions

| Condition | Description |
|---|---|
| **B0** | Test runner and coverage only (pass/fail, line coverage) |
| **B1** | Plain LLM generation, no gate (the status quo) |
| **B2** | Static rules only (L1) |
| **B3** | Mutation only (L3, no static findings) |
| **B4** | Full MockGuard (static + mutation + correlation + certificates + merge) |

Ablations of B4: without the hollow-body probe, without spec-first prompting, without the merge step, without anti-gaming replay. (Earlier drafts said "two baselines" while listing four; there are five named conditions.)

### 13.5 Metrics

| Group | Metrics |
|---|---|
| Static | precision and recall per rule and confidence tier; false-positive rate on valid mocks; abstention (UNVERIFIED) rate; line-citation accuracy |
| Mutation | valid mutant count; Killed/Survived/NoCoverage/Timeout/CompileError counts; both scores with denominators; interval if sampled; median time per mutant; total time |
| Gate | proof yield (accepted ÷ generated); unique kills per test; share of tests with empty certificates; share of crash kills; flaky-quarantine rate |
| Fault detection | share of held-out/real faults detected by kept tests versus B1 |
| Workflow | fresh-clone setup time; commands on the happy path; reproducibility of the fixture run; share of findings with a working replay command |
| Cost | wall-clock and, if an LLM is used, tokens per accepted test |

### 13.6 Statistics

- Report intervals, not just point estimates: **Wilson** for proportions (Section 8.8); **bootstrap** confidence intervals (for example 10,000 resamples) for differences in scores across files.
- Paired comparisons per target file (same file, different condition) with the **Wilcoxon signed-rank test** and an effect size; do not rely on p-values alone with few packages.
- Multiple independent runs per condition; fixed seeds; publish run-to-run variation.
- **Pre-register** subjects, metrics, hypotheses and the analysis plan in the repository (a committed `eval/PREREGISTRATION.md`) **before** running evaluations.
- Publish negative results and cases where the tool does nothing.

### 13.7 Threats to validity (write these in the README)

| Type | Threat | Mitigation |
|---|---|---|
| Construct | Mutation score is a proxy for fault detection | Add S3 real-fault check; say it is a proxy |
| Internal | Equivalent mutants depress scores; Stryker's operator set biases what is measured | Equivalence filter, list excluded mutants, report operator mix |
| Internal | Flaky tests create false kills | Replay N times; quarantine |
| External | Few packages and one model family | State plainly; invite replication; keep the harness reproducible |
| External | Results come from TS/Jest only | Scope claims to Jest |
| Conclusion | Small sample size | Intervals, effect sizes, no over-claiming |

### 13.8 Reporting rule

Every number in the README, slides and video must come from a **committed command on the tagged commit**, with tool versions, corpus version and result file recorded. `evaluation.json` includes: repository commit, Node version, lockfile hash, Jest and Stryker versions, corpus version, command, duration, per-condition counts, seeds.

```text
eval/results/
├── evaluation.json
├── evaluation.md
├── b0-baseline.json
├── b1-llm-only.json
├── b2-static-only.json
├── b3-mutation-only.json
├── b4-mockguard.json
└── screenshots/
```

### 13.9 Optional extras (cut first)

- A small **open dataset** of vacuous versus sound tests mined from agent-authored commits in permissively licensed repositories, labeled independently by two people with an agreement score (Cohen's kappa).
- A **five-developer review-time study** with and without the report.

---

## 14. Security and threat model

MockGuard executes tests and mutated project code. That is materially different from a static scanner, so the execution boundary must be visible.

### 14.1 Rules

1. **Local-first.** No upload of private code by default.
2. **Explicit test command.** The user supplies `--test-command` or accepts a discovered Jest command; no inferred shell commands from file contents.
3. **No automatic installs.** Never run `npm install` or equivalents on the user's behalf.
4. **No `eval` of model output.** Never execute code from LLM responses directly; model-proposed tests only enter the repo through the merge engine after the gate.
5. **Mutants run in temp copies** (Stryker's sandbox or our own copy/worktree), **never in the user's working tree**. State this in the README and docs.
6. **Bounds:** per-mutant and whole-run timeouts, memory and process-count limits where the OS allows, output size caps.
7. **Capture** stdout, stderr, exit code and termination reason; **redact** secret-like strings (tokens, keys, URLs with credentials) before writing logs or reports.
8. **No network for mutant runs** where possible (container or OS-level), and **say so honestly** when it is not enforced.
9. **A subprocess with a timeout is not a sandbox.** If a real isolation layer (container, VM, OS sandbox) is not provided, the docs say "no security isolation" in plain words.
10. **Prompt-injection hygiene** for the optional LLM layer: code and logs are passed as quoted data, the model has no tools, output is schema-validated, and the deterministic gate decides.
11. **Dependency hygiene:** pinned versions, lockfile, `npm audit` in CI, npm provenance on release; add a version-age rule for new dependencies (avoid adopting releases from the last two weeks unless needed).
12. **License hygiene:** respect benchmark and package licenses; no code copied from AGPL tools; choose an OSI license for MockGuard (MIT or Apache-2.0).
13. **`--dry-run`** shows planned mutations and commands without executing.

### 14.2 Assets, actors, threats

| Asset | Threat | Control |
|---|---|---|
| User repository and secrets | Malicious dependency or test reads env or files | Local-only, redaction, no network, documented limits, recommend container for untrusted repos |
| Report integrity | Tampering with local report | Content hash is for reproducibility, not tamper-proofing; say so |
| Gate integrity | An LLM writes tests to game the gate | Anti-gaming rules (8.7), replay, fixed scope, deterministic verifier |
| Supply chain | Compromised dependency | Lockfile, provenance, audit |
| Availability | Infinite-loop mutants, huge outputs | Timeouts, caps |

---

## 15. Production engineering

| Area | Practice |
|---|---|
| **Architecture** | Core library free of Jest and Stryker specifics; adapters for runner and engine; reporters and rule plugins; **versioned JSON schemas** for config and report. A tiny second adapter (Vitest) proves modularity better than a diagram, but it is Tier 2. |
| **Policy** | **Ratchet:** mutation score on changed code may not decrease; defined exit codes; suppressions need reason and expiry; no global threshold imposed by default. **Policy-as-code** YAML for min score and forbidden patterns. |
| **Performance** | Diff-scoped mutation, incremental mode (cache `reports/stryker-incremental.json`), content-hash cache, small worker pool, per-mutant and whole-run timeouts, sampling with intervals when capped. Do not build a custom cache; Stryker already has one. |
| **Determinism** | Pinned versions, lockfile hash in reports, seeded sampling, fixed property-test seeds, record/replay for any LLM call. |
| **Errors** | Closed taxonomy: `BASELINE_FAILED`, `TIMEOUT`, `TOOL_ERROR`, `UNSUPPORTED_PATTERN`, `CONFIG_INVALID`. Tooling failures never masquerade as test results. |
| **Observability** | Structured logs, `--debug`, telemetry **off by default** (and ideally absent). |
| **Testing the tester** | Own suite through own gate; property-test and fuzz the merge engine and parser; golden-file tests; adversarial folder; CI runs the fixture end to end. |
| **Release hygiene** | SemVer, CHANGELOG, `npx` zero-install, optional Docker image, npm provenance, license, CONTRIBUTING, 60-second quickstart in the README. |
| **CI example** | See below. |

```yaml
# .github/workflows/ci.yml (illustrative; pin action versions by SHA in the real file)
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm run fixture:verify         # runs variants A..G and checks expected statuses
      - uses: actions/cache@v4
        with:
          path: reports/stryker-incremental.json
          key: stryker-incremental-${{ github.run_id }}
          restore-keys: stryker-incremental-
      - run: npx mockguard prove . --diff origin/main --format json --out reports/pr.json
        continue-on-error: false
      - uses: actions/upload-artifact@v4
        with: { name: mockguard-report, path: reports/ }
```

Package checklist before publishing: clean clone builds `dist/`; `files` allowlist set; `bin` entry exists; Node version declared; README commands work; lockfile consistent; no screenshots, credentials or internal research files in the package.

---

## 16. Research-grade engineering workflow, spikes, roadmap and schedules

### 16.1 What "how strong research teams build this" means in practice

I cannot describe how any particular university's students work, and "MIT-level" is not a measurable standard. What *is* known to separate strong research prototypes from weak ones is process. This is the process to follow.

1. **Claim first.** Write the testable claims (Section 13.1) before building. Every feature exists to support a claim or a demo moment; otherwise it is cut.
2. **Spike before commit.** Each risky idea gets a one-hour (or at most half-day) time-boxed experiment with a written pass/fail criterion. A failed spike **demotes the feature**; you do not push through.
3. **Thin vertical slice first.** Get one fixture through the *entire* pipeline (baseline → static → mutation → report) with crude components before polishing any component.
4. **Harness before intelligence.** The fixture, the clean-clone script and the evaluation runner come before the clever analysis.
5. **Evaluation-driven development.** Corpus cases and expected outputs are written *with* each rule. A rule without a positive case and a negative case does not merge.
6. **Reproducibility as a feature.** Pinned versions, seeds, lockfile hashes, record/replay, one command per result.
7. **Honesty discipline.** Claim ledger and labels; negative results published; no number without a command.
8. **Freeze.** A feature freeze at a fixed time; afterwards only fixes, docs and rehearsal.
9. **Rehearse the demo** on a fresh clone and a second machine, with a recorded fallback.

### 16.2 Day-0 spikes (time-boxed; failing a spike demotes the feature)

| # | Spike | Pass criterion | If it fails |
|---|---|---|---|
| 1 | Stryker + Jest produce `killedBy` per test with `disableBail: true` on the fixture; measure runtime with and without bail | JSON report contains `killedBy` and `coveredBy`; runtime cost recorded | Use MiniMutator as the engine; narrow scope claims |
| 2 | Variant B yields a **Survived** mutant, not NoCoverage; variant A yields NoCoverage | Statuses match expectations in 12.6 | Fix the fixture before anything else |
| 3 | Hollow-body probe: flags Weak C (P1 and P2 pass), passes valid boundary mock E, and the `rejects.toThrow('INVALID_TOTAL')` test behaves as in 12.4 | Decision table (7.5) gives expected outcomes on A–G | Demote the probe to Tier 2/3 |
| 4 | Runtime echo detection (custom test environment wrapping `moduleMocker`, or setup-file approach) works without breaking normal tests | Identity check fires on D (object pass-through) and does not break other variants | Drop runtime echo; keep static Tier S |
| 5 | AST-splice merge preserves a hand-edited mock byte for byte and is idempotent; a Prettier run does not change a marked node's normalized hash | Property tests pass on the fixture | Reduce merge to "insert at end of file, report conflicts" |
| 6 | MCP loop: an agent can call `verify_tests` and read structured feedback | One round trip returns findings JSON | Demote to roadmap |
| 7 (add) | Kill-kind classification: can assertion kills be distinguished from crash kills using Jest JSON output on a replayed killing test? | Classification correct on A–G | Treat all kills as "unknown", disable certificate strictness, and say so |

**Run spikes 1, 2 and 5 first.** They gate the Tier 0 and Tier 1 plan.

### 16.3 Phases, deliverables and definitions of done

| Phase | Goal | Build | Definition of done |
|---|---|---|---|
| **P0 Scope and harness** | Prove the happy path before building intelligence | Repo scaffold, TS config, fixture variants A–G, per-variant Jest configs, clean-clone script, report directory | `npm ci` and one command run every variant; baseline green; commit `feat(core): add replayable order-service fixture` |
| **P1 Discovery and baseline** | Know exactly what ran | Config loader (zod), runner discovery, explicit `--test-command`, supervisor with timeout/capture/redaction, baseline result schema | Failing baseline, missing runner, timeout, malformed config and secret-looking output all covered by tests |
| **P2 Static analysis** | Evidence, not vibes | `ts.Program`, test/mock/assertion models, SUT resolution, light taint, rules V1, V3 (then V4, V6, V2, V5), confidence, citations | Positive and negative corpus cases for each rule; valid boundary mock not flagged; unsupported syntax → UNVERIFIED |
| **P3 Mutation adapter** | Bounded, replayable behavior changes | Stryker adapter (or MiniMutator), scope selection, normalized results, mutant manifest, original/mutated excerpts, timeouts | Variant B survives, F kills; compile-error, timeout and no-mutant cases handled |
| **P4 Proof and correlation** | Combine suspicion with dynamic proof | Kill matrix, certificates, greedy set cover, mutant ranking, correlation, evidence cards, terminal and JSON reports | Finding↔mutant mapping works; stale line numbers and multi-test cases handled |
| **P5 Merge and suggestions** | Safe next action | Provenance markers, normalized AST hash, import reconciliation, conflict reports, deterministic suggestion templates | Property tests for idempotence and byte preservation pass |
| **P6 CI and packaging** | Production feel | GitHub Action, incremental cache, ratchet policy, SARIF (only if time), README quickstart | CI green from a fresh clone; `npx` path works |
| **P7 Evaluation and freeze** | Never present a number the tagged commit cannot reproduce | Corpus runner, B0–B4 results, real-package runs, benchmark README, capability ledger | Pre-registration committed; results committed; no target presented as a measurement |

### 16.4 Task breakdown by area (checklist form)

**Analysis**
- [ ] Build `ts.Program` for a project root; handle path aliases and `tsconfig` resolution
- [ ] Test model: describe/it/test/it.each/hooks with nesting
- [ ] Mock model: `jest.fn`, `spyOn`, `jest.mock`, `mockResolvedValue` family; boundary vs production classification
- [ ] SUT invocation set via symbol resolution (follow imports and aliases; one-level helper following)
- [ ] Taint: SUT result, mock config, literals, fixtures
- [ ] Rules V1, V3 first; then V4, V6; then V2, V5
- [ ] Confidence assignment and upgrade logic from correlation
- [ ] Unsupported-pattern abstention

**Mutation and proof**
- [ ] Stryker config generator from `mockguard.config.json`
- [ ] JSON report parser validated against `mutation-testing-report-schema`
- [ ] Status normalization and denominator printing
- [ ] Diff-to-line-range scoping
- [ ] Arid suppression and one-mutant-per-line reporting
- [ ] Kill matrix, certificates, greedy cover, ranking
- [ ] Replay (N runs) and kill-kind classification
- [ ] MiniMutator operators and splice-based application
- [ ] Sampling with Wilson interval

**Merge and suggestions**
- [ ] Provenance comment format and parser
- [ ] Normalized AST hash
- [ ] Splice insertion, import reconciliation, conflict report
- [ ] Property tests (idempotence, byte preservation, order independence)
- [ ] Deterministic suggestion templates

**DX, CI and docs**
- [ ] CLI skeleton, `--help`, error messages with next steps
- [ ] Exit codes wired end to end
- [ ] Terminal reporter, JSON reporter, evidence cards, replay command
- [ ] GitHub Action, README, `docs/` pages, capability ledger
- [ ] SARIF and HTML report (stretch)

**Evaluation**
- [ ] Corpus cases (≥ 2 negative per positive rule)
- [ ] Prompt templates frozen; suites generated and stored
- [ ] Runner for B0–B4, results committed
- [ ] Real-package selection written down before running
- [ ] Statistics module (Wilson, bootstrap, Wilcoxon) with tests

### 16.5 Roles (adapt to team size)

| Team size | Split |
|---|---|
| **1 person** | Tier 0 + one Tier 1 item (proof certificates *or* merge). Fixture first, evaluation second, demo third. No stretch items. |
| **2 people** | A: analysis + correlation + merge. B: mutation adapter + infrastructure + CI + evaluation/demo. Share README. |
| **3–4 people** | Analysis lead (AST rules, provenance, probe); mutation and infrastructure lead (Stryker, supervisor, sandboxing, caching); developer-experience lead (CLI, config, CI, docs, report UI); evaluation and demo lead (corpus, benchmarks, statistics, video). |

### 16.6 Schedule templates (pick one; fractions apply to whatever time you have)

**Template S: sprint (about 36–48 hours of work)**

| Window | Focus |
|---|---|
| First 15% | Fixture, spikes 1, 2, 5, name search, pre-register evaluation |
| Next 35% | Static rules V1/V3, Stryker adapter, kill matrix, CLI skeleton, JSON + terminal report |
| Next 25% | Certificates, correlation, merge (or probe), start evaluation in the background |
| Next 15% | Results, README, GitHub Action, demo script |
| Final 10% | Rehearsal, recording, freeze |

**Template W: standard (about one week)**

| Days | Focus |
|---|---|
| 1 | P0 harness + all day-0 spikes |
| 2 | P1 baseline + P2 rules V1, V3 with corpus |
| 3 | P3 Stryker adapter + P4 kill matrix and correlation |
| 4 | Certificates, merge engine, probe (if spike 3 passed), suggestions |
| 5 | CI action, ratchet, packaging, 2–3 real packages evaluated |
| 6 | Evaluation completion, statistics, README, docs, threat model |
| 7 | Rehearsal on a fresh machine, video, freeze, submission |

**Template X: extended (three to four weeks)**

| Week | Focus |
|---|---|
| 1 | P0–P2, spikes, corpus |
| 2 | P3–P4, certificates, probe, replay and anti-gaming |
| 3 | P5–P6: merge, CI, SARIF/HTML, optional MCP or runtime echo (pick one) |
| 4 | P7: real packages, real-fault check, statistics, write-up, rehearsal, freeze |

### 16.7 Working agreements

- **Branching:** trunk with short-lived branches; each merge keeps CI green; conventional commit messages; one logical change per commit.
- **Definition of done for any rule:** positive case, negative case, adversarial case, documented false-positive risk, evidence-card wording reviewed.
- **Daily check:** run the clean-clone script every day; a broken clean clone is the top-priority bug.
- **Decision log:** one line per decision in `docs/decisions.md` (ADR-style).
- **Time-boxes:** any task that exceeds 2× its estimate triggers a demote-or-cut decision, not a longer slog.

### 16.8 Cut order if behind (and what you never cut)

Cut in this order: human study → dataset → equivalence filter → MCP loop → second adapter → SARIF/HTML → runtime echo → hollow-body probe → merge → certificates.

**Never cut:** the true-survivor fixture, the clean-clone test, real-package numbers (even 2 packages), and the claim ledger.

### 16.9 Verified stretch ideas worth stealing (and their cost)

| Idea | Effort | Why it helps |
|---|---|---|
| Diff-scoped mutation with one mutant per line and a small arid-rule set | Small | Fast PR gate; evidence of effect is reported by Google (REPORTED) |
| Flakiness quarantine (rerun new tests N times), fake timers, seeded randomness | Small | A flaky "proof" would undermine every claim |
| Policy-as-code YAML (min score, forbidden mock patterns) | Small | Fits the ratchet and exit-code design |
| GitHub Actions matrix with one shard per changed module | Small–medium | Mostly YAML, reads as production-grade |
| AST-level merge with freeze zones | Medium | Already in the plan; provenance hashes are the primary rule, mock-pattern freezes a secondary heuristic |
| LLM red-team mutants (advisory) | Medium | Strong "wow", clearly labeled advisory |
| Differential-execution witness search | Medium | JS-friendly alternative to Z3 (untested) |
| Adversarial test-versus-mutant co-evolution | Large | Ablation only, after everything else |

---

## 17. Demo script and submission package

### 17.1 Three-minute demo (script the story; show whatever the tool actually outputs)

1. **Problem (10 s):** "AI wrote tests. They are green. Do they protect anything?" Show variant B and its green run and coverage.
2. **Prove (40 s):** run `mockguard prove` on variant B. Show the surviving conditional mutant with original vs mutated line, and the denominator line.
3. **Audit (25 s):** show the V3 finding with citations, then the correlation that raises it to high confidence.
4. **Contrast (20 s):** run on variant E (valid boundary mock): **no finding.** Say why mocks at boundaries are fine.
5. **Fix (40 s):** show the suggestion; apply the strong test (variant F); re-run; show the same mutant now **Killed**, with its proof certificate.
6. **Safe merge (25 s):** hand-edit a mock, run `merge`, show the hand edit preserved and a second merge producing no diff.
7. **Evidence (20 s):** show the benchmark table from the committed results and the repository link.

Do not invent numbers in the script. Do not add a live adversarial-loop scene; too many moving parts fail on stage.

**Fallbacks:** precomputed run plus a small live scope; record/replay for any LLM call; a full recorded video; a second machine with a fresh clone.

### 17.2 Likely judge questions and honest answers

| Question | Answer |
|---|---|
| How is this different from Stryker? | Stryker measures. We correlate mock-vacuity evidence with surviving mutants, give each test a proof certificate and merge safely. Stryker is our engine. |
| Why not ban mocks? | Boundary mocks are legitimate. We flag mocking the thing under test or asserting only the mock, with confidence levels. |
| False positives? | We publish precision and false-positive rates on a corpus that includes valid mocks. |
| Doesn't mutation testing take forever? | Diff scoping, per-test coverage, incremental mode, sampling with intervals. We report measured time. |
| Can the LLM cheat the gate? | The gate is deterministic, replays kills, classifies assertion vs crash kills and bans change-detector tests. The model never verifies itself. |
| Equivalent mutants? | Compiler-equivalence filter, listed separately, never hidden. Z3 is roadmap. |
| Does it work beyond Jest? | Not in this version. We say so. |
| Is it a security tool? | No. It is a test-quality gate with a threat model. |

### 17.3 README outline

1. One-line pitch  2. Demo GIF  3. Problem  4. Quickstart (three commands)  5. Example output  6. How it works  7. Evaluation method and results  8. Limitations and unsupported cases  9. CI integration  10. Security notes  11. Development  12. License

### 17.4 Submission assets

```text
submission/
├── README.md
├── demo-video.mp4
├── architecture.png
├── demo-before-after.png
├── evaluation-summary.md
├── capability-ledger.md
├── threat-model.md
├── related-work.md
├── fixture-report.json
└── screenshots/
    ├── 01-baseline-green.png
    ├── 02-static-finding.png
    ├── 03-surviving-mutant.png
    ├── 04-suggestion.png
    └── 05-mutant-killed-certificate.png
```

Video: lead with the product working; keep architecture under 20 seconds; end with the repository link.

### 17.5 Judge-facing narrative (four sentences)

AI coding assistants can generate tests that pass while only testing configured mocks. Coverage tells you code ran, not whether the tests would notice a change. MockGuard mutates production code and shows which behavior changes the tests miss, then proves each kept test by the mutants it uniquely kills. The result is measurable evidence instead of trust in a green check.

---

## 18. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Trigger to act |
|---|---|---|---|---|---|
| 1 | Static rules flag legitimate mocks | Medium | High | Confidence tiers, boundary-mock classification, negative corpus | FP rate on valid cases above the pre-set target |
| 2 | Mutation runtime too long | Medium | High | Diff scope, per-test coverage, incremental, sampling with intervals, small fixtures | Live demo exceeds its slot in rehearsal |
| 3 | Stryker/Jest configuration consumes the schedule | Medium | High | Adapter boundary, MiniMutator fallback, time-box spike 1 | Spike 1 not passed within its box |
| 4 | Equivalent mutants distort scores | High | Medium | Compiler-equivalence filter, list exclusions, show denominators | Scores look implausibly low on trivial code |
| 5 | Hollow-body probe ambiguity | Medium | Medium | Two variants, advisory only, mutation confirms | Spike 3 outcomes mixed |
| 6 | Runtime echo breaks Jest setups | Medium | Low | Spike 4, optional feature | Any normal test breaks under the environment wrapper |
| 7 | LLM gaming of the gate | Medium | High | Anti-gaming rules, replay, fixed scope | Certificates dominated by crash kills |
| 8 | Merge engine corrupts a file | Low | High | Splice-only, property tests, conflict reports, dry run | Any property test fails |
| 9 | Looks like a Stryker wrapper | Medium | High | Make provenance, probe, certificates, merge first-class and evaluate them | Reviewer feedback |
| 10 | Weak results on real packages | Medium | Medium | Report honestly with explanations; choose packages in advance | Results disappoint after pre-registration (do not re-pick) |
| 11 | Claims exceed the repository | Medium | High | Claim ledger, numbers from the tagged commit only | Any README number lacking a command |
| 12 | Clean clone fails on a judge's machine | Medium | High | Daily clean-clone test, pinned versions, Docker image as backup | Any failure on a second machine |
| 13 | Name collision (MockGuard / MockGuard) | Low–Medium | Low | Name search before registering | Existing package or trademark found |
| 14 | Unverified citations in slides | Medium | High | Read each abstract before citing; REPORTED label in this doc | Any REPORTED item still in slides at freeze |
| 15 | Scope creep | High | High | Tiers, cut order, freeze | Any new feature after freeze |

---

## 19. Claim ledger, final checklist and open questions

### 19.1 Capability ledger (update only from the final commit)

| Capability | Status | Evidence required |
|---|---|---|
| TypeScript CLI | DESIGNED / IMPLEMENTED / TESTED | Clean-clone command and CI run |
| Jest project discovery | DESIGNED / IMPLEMENTED / TESTED | Fixture and discovery tests |
| Baseline runner with timeout and capture | DESIGNED / IMPLEMENTED / TESTED | Captured exit code and output |
| Static rules V1, V3 | DESIGNED / IMPLEMENTED / TESTED | Positive and negative corpus |
| Static rules V2, V4, V5, V6 | DESIGNED / IMPLEMENTED / TESTED | Corpus cases |
| Source line citations | DESIGNED / IMPLEMENTED / TESTED | Golden report fixtures |
| Stryker adapter and kill matrix | DESIGNED / IMPLEMENTED / TESTED | `mutation.json` and matrix test |
| MiniMutator | DESIGNED / IMPLEMENTED / TESTED | Replayed mutant manifest |
| Proof certificates and set cover | DESIGNED / IMPLEMENTED / TESTED | Fixture certificates |
| Hollow-body probe | OUT OF SCOPE / EXPERIMENTAL / TESTED | Decision-table fixture |
| Runtime echo detection | OUT OF SCOPE / EXPERIMENTAL / TESTED | Identity fixture |
| Anti-gaming replay | OUT OF SCOPE / EXPERIMENTAL / TESTED | Gaming fixtures |
| Merge engine | DESIGNED / IMPLEMENTED / TESTED | Property tests |
| Ratchet policy and exit codes | DESIGNED / IMPLEMENTED / TESTED | Policy tests |
| JSON report (versioned) | DESIGNED / IMPLEMENTED / TESTED | Schema validation test |
| SARIF output | OUT OF SCOPE / EXPERIMENTAL / TESTED | Validator result |
| GitHub Action | DESIGNED / IMPLEMENTED / TESTED | CI run link |
| MCP server | OUT OF SCOPE / EXPERIMENTAL / TESTED | Round-trip transcript |
| LLM explanation | OUT OF SCOPE / EXPERIMENTAL / TESTED | Structured-output and abstention tests |
| Vitest support | OUT OF SCOPE / EXPERIMENTAL / TESTED | Separate fixture |
| Sandbox isolation | NOT PROVIDED / PARTIAL / VERIFIED | Exact mechanism documented |

### 19.2 Final acceptance checklist

**Technical**
- [ ] Fresh clone installs and runs the fixture with documented commands
- [ ] Baseline passes before mutation analysis (`BASELINE_FAILED` otherwise)
- [ ] A true **Survived** mutant exists for variant B and is **Killed** by variant F
- [ ] Kill matrix and per-test certificates generated
- [ ] Valid boundary mock (variant E) is not flagged
- [ ] Statuses distinguish Killed, Survived, NoCoverage, Timeout, CompileError, RuntimeError, Ignored
- [ ] Every statistic states denominator, exclusions and interval (if sampled)
- [ ] Unsupported syntax abstains instead of issuing a confident verdict
- [ ] Mutants never run in the user's working tree
- [ ] Reports include tool versions, lockfile hash and repository commit
- [ ] Merge preserves hand-written content and is idempotent

**Product**
- [ ] Short happy path (three commands or fewer)
- [ ] README explains the problem in plain language
- [ ] The tool does not edit files by default
- [ ] Suggestions are clearly separated from verified findings
- [ ] The README explains when a mock is valid

**Evidence**
- [ ] Pre-registration committed before evaluation
- [ ] B0–B4 results committed
- [ ] Real-package results committed (at least a small set)
- [ ] Corpus includes valid mocks and weak mocks
- [ ] No target is presented as a measurement
- [ ] Every demo number comes from the tagged commit
- [ ] Limitations and threats to validity visible in the README
- [ ] Competitor and "first" search repeated the day before submission
- [ ] Every cited paper's abstract read; no REPORTED item left unverified in slides

**Submission**
- [ ] Track selected: Developer Tools, CI/CD & Open Source
- [ ] Project description uses the one-sentence pitch
- [ ] Repository public if required; license present; no secrets or private research files
- [ ] Demo and repository links work from a fresh browser session
- [ ] No claim of universal framework support

### 19.3 Open questions (answers change the plan)

1. Event name, **judging rubric**, and deadline?
2. **Team size** and each member's strongest languages?
3. **Total time** available (picks template S, W or X)?
4. Which **real packages** (apply the criteria in 13.2 and write them down before running)?
5. Will you have access to an LLM API for generating the baseline AI suites (B1)? Which model?
6. Do you want the optional MCP loop, or is a pure CLI better for your team?
7. Final **name**: MockGuard or MockGuard (run the name search first)?

---

## 20. Reading list with verification status

**Verified on 14 November 2026 (abstract or full text read)**

- Hora, A. and Robbes, R. *Are Coding Agents Generating Over-Mocked Tests? An Empirical Study.* MSR '26, arXiv 2602.00409.
- Jain, K., Synnaeve, G., Rozière, B. *TestGenEval: A Real World Unit Test Generation and Test Completion Benchmark.* ICLR 2025, arXiv 2410.00752.
- StrykerJS documentation: configuration (`disableBail`, `coverageAnalysis`), incremental mode, Jest runner; mutation-testing-elements: mutant states and metrics; `mutation-testing-report-schema` package.
- Mutahunter repository (codeintegrity-ai/mutahunter), AGPL-3.0.
- Robbes et al., *Agentic Much? Adoption of Coding Agents on GitHub*, arXiv 2601.18341 (context for how agent commits are detected; seen as a cited companion, skim only).

**REPORTED, verify before citing**

- *Mutation-guided LLM test generation:* Foster et al., ACH at Meta (arXiv 2501.12862); Alshahwan et al., TestGen-LLM (arXiv 2402.09171); Moradi Dakhel et al., MuTAP (arXiv 2308.16557); Wang et al., MutGen (arXiv 2506.02954); Tip, Bell, Schäfer, LLMorpheus (arXiv 2404.09952); Wang et al., LLMs for mutation testing (arXiv 2406.09843); Tian et al., LLMs for equivalent mutant detection (ISSTA 2024).
- *Failure modes of LLM tests:* Mathews and Nagappan (arXiv 2412.14137); Ouédraogo et al. (arXiv 2410.10628); *Do LLMs generate test oracles that capture actual or expected behavior* (arXiv 2410.21136); *Understanding LLM-driven test oracle generation* (arXiv 2601.05542); Khandaker et al., AugmenTest (arXiv 2501.17461).
- *Foundations:* Inozemtseva and Holmes (ICSE 2014); Gopinath, Jensen and Groce (ICSE 2014); Just et al. (FSE 2014); Papadakis et al., trivial compiler equivalence (ICSE 2015); Petrović et al., *Practical Mutation Testing at Scale* (arXiv 2102.11378) and *Does mutation testing improve testing practices* (arXiv 2103.07189); Spadini et al., *To Mock or Not To Mock* (MSR 2017; EMSE 2019).
- *Benchmarks and baselines:* Schäfer et al., TestPilot (arXiv 2302.06527); Wang et al., software testing with LLMs survey (arXiv 2307.07221).
- *Industrial precedent:* Uber AutoCover (ICSE-SEIP 2026); verify the architecture and the proportion of generated tests before quoting.
- *Tools:* Jest documentation; Istanbul/nyc; fast-check; TypeScript Compiler API; qodo-cover.

---

## 21. Appendices

### Appendix A: Change log from the earlier drafts

| Item | Earlier draft | Now |
|---|---|---|
| Demo test | Never called `createOrder` → NoCoverage | Variant B calls `createOrder` and asserts only the mock interaction → true survivor; variant A kept as the NoCoverage case |
| Baselines | "At least two" then four listed | Five named conditions B0–B4 plus ablations |
| Terminal example | Contained invented numbers | Placeholders only; marked illustrative |
| Evidence card vs fixture mismatch | `toHaveBeenCalled()` vs `toHaveBeenCalledWith(100)` | Fixture is the single source of truth: `toHaveBeenCalledWith(100)` |
| Timeouts in score | Unspecified | Two scores defined; both printed (ADR-07) |
| Reference [1] | Local file path | Cited by name: *PS catalogue, PS #41* |
| Unused labels | CORROBORATED defined but unused; "Moto" in headings | Label set simplified; phases use "Goal" |
| Mutation in working tree | Contradicted "does not edit files by default" | Stated: mutants run in a sandbox copy, never in the working tree |
| `disableBail` | Cost overstated | Marked as a measurement in spike 1 |
| Echo detection | Single mechanism | Tiered; high confidence only with a related surviving mutant |
| Hollow-body probe | One throwing stub | Two variants; advisory; demoted to Tier 1/2 |
| Merge hashing | Raw text | Normalized AST hash; import reconciliation |
| Gaming | Not addressed | Anti-gaming rules (8.7) |
| Gate scope | Changed tests only | Two scopes: changed production code and new tests |
| Citations | Mixed claims | Verification log (0.2); REPORTED list (0.3) |
| Scope | 22 sections of features | Tiers, MVP freeze, cut order |

### Appendix B: Glossary

- **Mutant:** a controlled variation of production code.
- **Killed / Survived / NoCoverage / Timeout / CompileError / RuntimeError / Ignored:** mutant outcomes (Section 8.2).
- **Mutation score:** detected mutants divided by valid mutants (denominator always shown).
- **Kill matrix:** mutants by tests showing which test kills which mutant.
- **Proof certificate:** the set of mutants only a given test kills.
- **SUT:** system (or unit) under test.
- **Boundary mock:** a mock of something outside the production scope (network, clock, payment provider).
- **Echo:** the asserted expected value is the value configured on a mock.
- **Hollow-body probe:** replace one function's body with a stub and see which covering tests still pass.
- **Arid node:** code where mutants are rarely productive (logging, metrics).
- **Equivalent mutant:** a mutant behaviorally identical to the original for relevant inputs.
- **Ratchet:** a policy that a score on changed code may not decrease.

### Appendix C: Command cheat sheet

```bash
# Setup (fixture)
git clone <repo> && cd mockguard && npm ci && npm run build

# Static audit only (no mutant execution)
npx mockguard scan fixtures/order-service

# Prove variant B (the demo)
npx mockguard prove fixtures/order-service \
  --source src/order-service.ts \
  --tests tests/b-weak-interaction-only.test.ts \
  --test-command "npx jest -c jest.config.weak-b.js --runInBand" \
  --out reports/b

# Explain one finding and print its replay command
npx mockguard explain MT-001 --report reports/b/report.json

# Re-prove after adding the strong test
npx mockguard prove fixtures/order-service \
  --tests tests/f-strong.test.ts --out reports/f

# Preview a merge without writing
npx mockguard merge fixtures/order-service --accepted reports/f/accepted.json --dry-run

# Diff-scoped PR gate
npx mockguard prove . --diff origin/main --format json --out reports/pr.json
```

### Appendix D: Frozen prompt templates for generating the baseline AI suites (B1)

**D1. Implementation-visible prompt**

```text
You are writing Jest unit tests in TypeScript.
Write a complete test file for the following module. Use jest.fn mocks for external dependencies.
Cover normal behavior, error paths and boundary conditions.
Return only the test file contents.

<module path="src/order-service.ts">
{{FULL_SOURCE}}
</module>
```

**D2. Spec-first prompt (ablation for H5)**

```text
You are writing Jest unit tests in TypeScript from a specification, not from the implementation.
You are given exported signatures, types, documentation and example callers, but NOT the function bodies.
Write tests that assert observable behavior: return values, thrown errors and externally visible side effects.
Mock only external boundaries (network, clock, payment provider). Do not mock the module under test.
Return only the test file contents.

<signatures>{{SIGNATURES_AND_TYPES}}</signatures>
<docs>{{DOC_COMMENTS_AND_README_EXCERPT}}</docs>
<callers>{{CALLER_EXAMPLES}}</callers>
```

Record the model id, date and settings with each generated suite. Do not edit generated suites before measurement.

### Appendix E: Minimal evidence-card example (JSON)

```json
{
  "id": "MT-001",
  "kind": "INTERACTION_ONLY",
  "rule": "V3",
  "severity": "high",
  "confidence": "high",
  "test": { "file": "tests/b-weak-interaction-only.test.ts", "line": 5, "name": "charges the payment client when creating an order" },
  "production": { "file": "src/order-service.ts", "lines": [15, 16] },
  "evidence": {
    "mockSetup": "deps.paymentClient.charge.mockResolvedValue({ status: 'failed' })",
    "assertion": "expect(deps.paymentClient.charge).toHaveBeenCalledWith(100)",
    "missingObservable": "createOrder() result status and fulfillment event"
  },
  "mutant": {
    "id": "<mutant-id>",
    "operator": "EqualityOperator",
    "original": "payment.status === 'failed'",
    "replacement": "payment.status !== 'failed'",
    "status": "Survived",
    "killedBy": []
  },
  "probe": { "p1Throw": "n/a", "p2Return": "n/a" },
  "suggestion": "Call createOrder() with a failed payment and assert status 'cancelled' and that fulfillment.publish was not called. Unverified until re-proven.",
  "replay": "mockguard prove fixtures/order-service --tests tests/b-weak-interaction-only.test.ts"
}
```

(Line numbers and ids above are placeholders to be generated by the tool.)

### Appendix F: Open items to confirm during implementation

- Exact Stryker option names and defaults for the installed version (`disableBail`, `jsonReporter`, mutator exclusions, disable-comment syntax).
- Whether Stryker's JSON report or a custom reporter exposes the killing test's failure message (needed for assertion-vs-crash classification); otherwise use replay with Jest JSON output.
- Environment variable or global name Stryker uses for the active mutant (needed only for the anti-gaming rule that forbids tests from inspecting it).
- `spyOn` behavior on ES module namespaces under the chosen Jest transform (Weak C).
- Jest version compatibility with the installed Stryker Jest runner.
- Whether `npx` from a clean clone resolves the `bin` entry on Windows, macOS and Linux.

---

**End of document.** Nothing above is a result. The first result exists only after the fixture runs on a clean clone and its report is committed.
