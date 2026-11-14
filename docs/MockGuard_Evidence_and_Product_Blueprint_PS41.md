# MockGuard — PS #41 Engineering and Research Document

*AI-generated tests test the mock, not the code.* Developer Tools, CI/CD & Open Source track. Compiled 14 November 2026. Working name MockGuard (MockGuard is an acceptable alternative).

Labels used throughout: **\[VERIFIED\]** checked against a source during research; **\[DESIGN\]** our proposal, not yet tested; **\[TARGET\]** a number to measure, not a result; **\[UNVERIFIED\]** from memory or not checked. No plan can guarantee a win. The event’s judging rubric is unknown, so ask the organizers for it before finalizing scope.

## 1. Executive summary

**Thesis.** A green AI-written test suite is not evidence. MockGuard accepts a test only if it can show, by execution, that it fails when the production code is wrong.

**Three verbs.** *Audit* generated tests for mock-centered vacuity. *Prove* each kept test by showing which code mutants it uniquely kills. *Merge* accepted tests into existing files without overwriting hand-written tests or tuned mocks.

**Why this wedge.** Mutation-guided test generation is already studied and partly productized. Enforcement is the open space: a deterministic gate that rejects vacuous AI tests, proves the rest, and merges safely. The gate does not trust the model that wrote the tests.

**Scope discipline.** One ecosystem (TypeScript/JavaScript, Jest first, Stryker as the mutation engine), one realistic fixture, real-package evaluation, and a clean one-command setup. Everything else is roadmap.

## 2. Evidence base

### 2.1 The problem is measured, not anecdotal

- Hora and Robbes (MSR 2026, arXiv 2602.00409) analyzed over 1.2 million commits from 2025 across 2,168 TypeScript, JavaScript and Python repositories. About 36% of coding-agent commits add mocks to tests versus 26% for non-agents. They recommend putting mocking guidance in agent configuration files. \[VERIFIED\] This is descriptive; it does not build an enforcement tool.
- Practitioner write-ups describe the exact pattern: a test mocks a dependency to return a payload, then asserts the function returned that payload; or spies on the function under test and asserts the mocked value. \[VERIFIED as anecdotes, not studies\]

### 2.2 LLM-written tests are weak at finding bugs

- TestGenEval (ICLR 2025, arXiv 2410.00752): on real-world files the best model, GPT-4o, reached 35.2% coverage and an 18.8% mutation score. It notes most benchmarks report pass@k and none previously reported mutation score. \[VERIFIED\]
- MutGen (arXiv 2506.02954) reports test suites with 100% coverage but only a 4% mutation score. \[VERIFIED\]
- Mathews and Nagappan (arXiv 2412.14137): LLM test generators often derive tests from the existing implementation and filter or “fix” failing tests, which can validate bugs instead of revealing them. \[VERIFIED\]
- Ouédraogo et al. (arXiv 2410.10628): across 20,500 LLM-generated suites, common smells include Assertion Roulette and Magic Number Test. \[VERIFIED\]

### 2.3 Coverage is a weak proxy

- Inozemtseva and Holmes (ICSE 2014): across 31,000 generated suites, correlation between coverage and effectiveness is low to moderate once suite size is controlled. \[VERIFIED\]
- Counterpoint: Gopinath, Jensen and Groce (ICSE 2014) found coverage predicts mutant killing better than that paper suggests. Cite both. \[UNVERIFIED details\]

### 2.4 Mutants are a defensible target

- Just et al. (FSE 2014): of 357 real faults, 73% were coupled to mutants from common operators and 17% were not coupled to any. \[VERIFIED\]
- Petrović et al. (Google): showing mutants to developers as test goals led to more and better tests, and mutation adequacy is neither practical nor desirable at scale. \[VERIFIED\]

### 2.5 Mutation-guided generation works

- Meta ACH (FSE Companion 2025): 571 tests from 10,795 classes; 277 would have been discarded under a line-coverage criterion; engineers accepted 73%. \[VERIFIED\]
- Meta TestGen-LLM (FSE 2024): 75% of tests built, 57% passed reliably, 25% increased coverage; 73% of recommendations accepted. Its filter pipeline (build, pass, improve) is a reusable pattern. \[VERIFIED\]
- MuTAP (IST 2024): feeding surviving mutants back into the prompt detected up to 28% more faulty snippets and reached a 93.57% mutation score on synthetic bugs. \[VERIFIED\]
- LLMorpheus (arXiv 2404.09952): among surviving LLM-made mutants, 63.2% were behavioral changes, 8.5% equivalent, 9.7% near-equivalent. \[VERIFIED\]

### 2.6 Mocks create coupling

Spadini et al. (MSR 2017; EMSE 2019): developers report that keeping a mock’s behavior compatible with the real class is hard, and mocks increase test-to-production coupling. \[VERIFIED\]

### 2.7 Tool facts that shape the design

- Stryker’s report schema records per mutant the covering tests (coveredBy) and killing tests (killedBy). \[VERIFIED\]
- With per-test coverage analysis Stryker distinguishes Survived from NoCoverage. A test that never reaches the mutated code gives NoCoverage, not a survivor. \[VERIFIED\]
- With Jest, Stryker runs without bail and reports only the first failing test unless disableBail is true. A full kill matrix needs disableBail true, at a runtime cost. \[VERIFIED\]
- Incremental mode reuses previous results and only retests changed mutants. \[VERIFIED\]

### 2.8 What is not established

No published evaluation of a guard-and-merge workflow for AI tests; real-world false-positive rates for mock-vacuity rules; effectiveness of the hollow-body probe and provenance classification (both our designs). Treat these as hypotheses to test.

## 3. Competitive landscape

| Tool | What it does | Gap we target |
| --- | --- | --- |
| Stryker | Mutation engine for JS/TS | No notion of mock vacuity or AI-test provenance |
| Mutahunter | Open-source LLM mutation testing and test generation (AGPL-3.0, a few hundred stars) | Generates and scores; does not audit mock-centered tests or merge safely |
| qodo-cover | AI test generation and coverage enhancement CLI | Coverage-oriented |
| Agent skills for mutation testing | Instructions the agent may or may not follow | Not a deterministic gate |
| Meta ACH and TestGen-LLM | Internal industrial systems | Not available; confirm the pattern works |

Do not copy code from AGPL projects. Before claiming “first,” rerun a GitHub and arXiv search the day before submission.

**Safe novelty claim:** “MockGuard combines mock-vacuity analysis, per-test mutation proof, and non-destructive merging into a gate for AI-generated tests.”

## 4. Product definition

**Users:** developers using AI assistants, reviewers of AI-generated pull requests, maintainers of TS/JS repositories, CI owners.

**Commands \[DESIGN\]:**

- `mockguard scan` static audit, no execution of mutants
- `mockguard prove` run the proof gate and produce the kill matrix
- `mockguard gen` generate candidate tests, then gate them
- `mockguard merge` insert accepted tests without touching hand-written nodes
- `mockguard report` render HTML, JSON or SARIF
- `mockguard mcp` serve the gate to AI agents

**Exit codes:** 0 pass; 1 policy failure (vacuous tests or ratchet violated); 2 infrastructure failure (baseline red, timeout, tool error). Infrastructure failures must never be reported as surviving mutants.

**Config:** one schema-validated file. Suppressions require a reason and an expiry date.

**Outputs:** terminal summary; versioned JSON; HTML report with per-test kill matrix and mutant diffs; SARIF; PR comment with the score delta on changed code.

## 5. Technical design

### 5.1 Pipeline

- **L0 baseline:** run the suite; if red, stop with BASELINE\_FAILED.
- **L1 static vacuity:** AST rules, milliseconds.
- **L2 hollow-body probe:** one run per target function.
- **L3 mutation proof:** Stryker with per-test attribution.
- **L4 correlate, report, merge.**

### 5.2 Vacuity taxonomy \[DESIGN\]

- **V1 mocked unit under test:** the function being tested is mocked, spied on, or replaced, then its mocked value is asserted.
- **V2 echo:** the expected value is the mock’s configured return value and the unit under test only passes it through.
- **V3 interaction-only:** assertions only check that a mock was called, with no business-level result, state or event assertion.
- **V4 no assertion.**
- **V5 copied logic:** the expected value is computed by re-implementing the production formula.
- **V6 trivially true assertions.**

Each finding carries a confidence: high (V1, or V2 plus a surviving mutant), medium (V3), low (V5), or unverified (parser ambiguity). Do not collapse to a single score. Mocks at true external boundaries (network, clock, payment provider) are legitimate and must not be flagged when the test asserts the real outcome.

### 5.3 Assertion provenance

For each assertion, trace the actual value and expected value to their sources: mock configuration, real execution of the unit under test, literals or specification, fixtures. Classify as grounded, echo, or interaction-only. Static dataflow over the TypeScript AST gives the first pass.

**Runtime echo check:** capture each mock’s returned values from Jest’s recorded results; if the asserted value is the same object reference a mock returned, the unit under test only passed it through. Implement through a setup file that wraps expect. Spike this first; it may interact badly with some Jest configurations.

### 5.4 Hollow-body probe

Replace one target function’s body with a stub that throws, then run only its covering tests. Any test that still passes never executed the real code. This catches mocked-unit tests with one run per function instead of one per mutant. \[DESIGN, unverified in the literature; describe it as our technique and test it\]

### 5.5 Mutation gate

- Stryker with perTest coverage analysis and disableBail true for the kill matrix. Use incremental mode in CI.
- Mutate only selected files: changed files in a pull request, files imported by the target tests, or an explicit list.
- Status taxonomy: Killed, Survived, NoCoverage, Timeout, CompileError, RuntimeError, Ignored. Keep them separate in every report.
- **Kill matrix:** mutants by tests, from killedBy.
- **Proof certificate per test:** the mutants it kills that no other test kills. A test with an empty certificate is flagged as redundant or vacuous.
- **Minimal proving set:** greedy set cover over the kill matrix finds the smallest test subset that preserves all kills.
- **Mutant ranking:** surface first the survivors on branches and return statements in business logic that are covered only by flagged tests. Show the top three, not hundreds.

### 5.6 Scoring and statistics

Always print the mutation score with its denominator and exclusions. When sampling mutants to bound runtime, report a confidence interval (for example a Wilson interval) and the sample size. Never compare scores across runs with different mutant sets without saying so.

### 5.7 Equivalent mutants

Compile or minify original and mutant; identical output means equivalent and the mutant is excluded and listed. This adapts trivial compiler equivalence (Papadakis et al., ICSE 2015) \[UNVERIFIED, check before citing\]. An LLM judge may add an advisory label but never decides. Report excluded mutants separately.

### 5.8 Repair and independent oracles

- Deterministic suggestion templates first: behavior that survived, input to exercise, observable outcome to assert, verification command.
- Prefer property-based tests (fast-check) and metamorphic relations over example assertions copied from the implementation.
- Spec-first generation: give the model signatures, docs, types and caller usage, not only the body. Measure it as an ablation against implementation-visible prompting.
- Any suggested test goes back through the same gate. Suggestions are untrusted until proven.

### 5.9 Merge engine

- Insert new tests by AST edit, never by regenerating the file.
- Mark generated nodes with provenance comments including a content hash. Never modify unmarked nodes; if a marked node’s hash changed, treat it as hand-edited and leave it.
- Properties to test: idempotence (running twice yields no diff), hand-written content preserved byte for byte, tuned mocks untouched, deterministic ordering.
- Conflicts (same test name, overlapping setup) produce a report entry, not an overwrite.

### 5.10 Evidence card schema

Each finding: id, kind, severity, confidence, test file and line, production file and lines, mock setup excerpt, assertion excerpt, missing observable assertion, mutant (operator, original, mutated, status, killedBy), probe result, suggestion, replay command, tool versions. Wording must describe observations, not declare a test “wrong.”

## 6. Agent-in-the-loop gate (high impact, high risk)

Expose the gate as an MCP server and a pre-commit or CI hook. Flow: the agent writes tests; the gate rejects vacuous ones with structured evidence; the agent revises; the gate accepts only tests with proof certificates. Tools to expose: verify\_tests, explain\_finding, suggest\_probe. Metrics: iterations to pass, tokens per accepted test, proof yield (accepted divided by generated). This is the enforcement version of the recommendation in Hora and Robbes. Spike it early; if integration is flaky, demote it to roadmap and keep the CLI demo.

## 7. Production engineering

- **Architecture:** a core library with no Jest or Stryker specifics; adapters for runner and mutation engine; reporters; rule plugins. Version the JSON schema. A small second adapter (Vitest) proves modularity better than a diagram.
- **Policy:** ratchet that blocks score drops on changed code; defined exit codes; suppressions with reason and expiry; no global threshold imposed by default.
- **Performance:** incremental mode, diff-scoped mutation, worker pool, content-hash cache, per-mutant and whole-run timeouts, mutant sampling with confidence intervals.
- **Determinism:** pinned versions, lockfile hash in reports, seeded runs, record-and-replay of any LLM call.
- **Errors:** a closed taxonomy (BASELINE\_FAILED, TIMEOUT, TOOL\_ERROR, UNSUPPORTED\_PATTERN). Failures in tooling never masquerade as test results.
- **Observability:** structured logs, a debug flag, and telemetry off by default.
- **Testing the tester:** run the tool’s own suite through its own gate; property-test and fuzz the merge engine and the parser; golden-file tests for reports; an adversarial fixture folder.
- **Release hygiene:** semantic versioning, changelog, npx zero-install, Docker image, npm provenance, a docs page with a 60-second quickstart, license, contribution guide.

## 8. Security and threat model

- Running tests and mutants executes repository code. Use temporary worktrees or containers with no network and resource limits. A plain subprocess with a timeout is not a sandbox; say so in the docs.
- Do not run install commands automatically; require an explicit test command.
- Repository text can contain prompt injection. If an LLM is used, pass code as quoted data only, give it no tools, validate its output against a schema, and let the deterministic gate decide.
- Redact secret-like strings from captured output.
- Never upload private code by default; local-first.
- Respect licenses of benchmark repositories and any reused tools.

## 9. Evaluation design

**Questions.** Does the guard flag obvious mock-vacuous tests? Does it avoid flagging legitimate boundary mocks? Does mutation evidence catch weakness static rules miss? Do kept tests detect real faults? Can a fresh clone reproduce results?

**Subjects.** (a) A synthetic labeled corpus with positive and negative cases. (b) Five or more real npm packages, chosen before seeing results, with AI-generated suites. (c) Known real bugs (for example the BugsJS set used by LLMorpheus) to check detection of real faults, not only synthetic mutants.

**Conditions.** B0 test runner and coverage only; B1 plain LLM generation; B2 static rules only; B3 mutation only; B4 full MockGuard. Add ablations: without the probe, without spec-first prompting, without the merge step.

**Metrics.** Line coverage; mutation score with denominator and interval; vacuity rate; mock-echo rate; unique kills per test; proof yield; precision and recall of static rules on the labeled corpus; false-positive rate on valid mocks; runtime and token cost; setup time from fresh clone.

**Rigor.** Multiple runs per condition, fixed seeds and temperature, report intervals, publish failures and cases where the tool does nothing. Pre-register subjects and metrics in the repository before running.

**Dataset release \[optional\].** A small labeled set of vacuous versus sound tests, mined from agent-authored commits in permissively licensed repositories, labeled independently by two people with an agreement score. Cut this first if time is short.

**Human study \[optional\].** Five developers reviewing AI tests with and without the report. Cut first.

**Reporting rule.** Every number in the README or slides must come from a committed command on the tagged commit, with versions recorded.

## 10. Reference fixture

Domain: order and payment service, with observable outcomes (order status, fulfillment event).

- **Production code:** createOrder charges a payment client; failed payment returns a cancelled order and publishes nothing; success publishes fulfillment and returns confirmed.
- **Weak test A (NoCoverage trap):** only calls the mocked payment client. Never reaches createOrder. Shows as NoCoverage, so do not use it to demonstrate survivors.
- **Weak test B (true survivor):** calls createOrder with a mocked payment client but asserts only that the client was called. The mutated condition survives. This is the demo test.
- **Weak test C (mocked unit):** spies on createOrder and asserts the mocked return. Caught by the probe and the static rule.
- **Echo test:** expected value is the object the mock returned.
- **Valid boundary mock:** mocks the payment client and asserts order status and the absent fulfillment event. Must not be flagged.
- **Strong test:** failed payment yields cancelled status and no fulfillment event; passes on the original and fails on the mutant.
- **Property test:** for any total, a failed payment never publishes fulfillment.

## 11. Build plan

### 11.1 Day-0 spikes (about an hour each; failing a spike demotes the feature)

1. Stryker with Jest yields killedBy per test with disableBail true on the fixture; record the runtime cost.
2. The fixture produces a Survived mutant, not NoCoverage.
3. The hollow-body probe flags the mocked-unit case and passes the valid boundary mock.
4. Reference-identity echo detection works inside Jest without breaking normal tests.
5. AST-insertion merge preserves a hand-edited mock and is idempotent.
6. MCP loop: an agent can call the gate and read structured feedback.

### 11.2 Tiers

- **Tier 0, must ship:** fixture with a true survivor; Stryker adapter with kill matrix; static rules; JSON and terminal reports; clean-clone setup; README.
- **Tier 1, credibility:** proof certificates; hollow-body probe; merge command; CI action with PR delta; real-package evaluation; related-work and competitor slide; security notes; capability ledger.
- **Tier 2, differentiators (pick one or two):** runtime echo detection; agent MCP loop; sampling intervals; equivalence filter; dataset.
- **Tier 3, roadmap only:** second language, IDE plugin, dashboards, ML-based mutant prediction.

### 11.3 Schedule (fractions of the event length)

- First 15%: scope, fixture, spikes, taxonomy, choose evaluation packages.
- Next 35%: static rules, probe, Stryker adapter, CLI skeleton.
- Next 25%: proof gate, certificates, merge engine; start evaluation runs in the background.
- Next 15%: results, report, GitHub Action, docs.
- Final 10%: rehearsal and freeze. No new features after the freeze.

### 11.4 Roles (adapt to team size)

Analysis lead (AST rules, provenance, probe); mutation and infrastructure lead (Stryker, sandbox, caching); developer-experience lead (CLI, config, CI, docs, report UI); evaluation and demo lead (corpus, benchmarks, statistics, video).

### 11.5 Cut order if behind

Human study, dataset, equivalence filter, MCP loop, second adapter. Never cut the real-package numbers, the true-survivor fixture, or the clean-clone test.

## 12. Demo and submission

### 12.1 Three-minute demo

1. One sentence of problem. Show an AI-written suite: green, high coverage.
2. Run the mutation proof. Show the low score and a surviving mutant that matters.
3. Run scan: flagged tests highlighted with the reason.
4. Run the gate loop: a stronger test is accepted; show its proof certificate and the mutant now killed.
5. Edit a mock by hand, regenerate, show merge preserved it.
6. Close with the benchmark table and the repository link.

**Fallback:** record and replay LLM calls; precompute slow runs and show one small live run; keep a recorded video of the full flow.

### 12.2 Likely judge questions

- *How is this different from Stryker?* Stryker measures; we correlate mock-vacuity evidence with surviving mutants, prove each test, and merge safely.
- *Why not ban mocks?* Boundary mocks are legitimate; we flag mocking the thing under test or asserting the mock.
- *False positives?* We publish precision and false-positive rates on a corpus that includes valid mocks, and use confidence levels.
- *Doesn’t mutation testing take forever?* Diff scoping, incremental mode, sampling with intervals.
- *Can the LLM cheat the gate?* The gate is deterministic and rejects tests without kill proofs; the model never verifies itself.
- *Equivalent mutants?* Filtered by compile-equivalence, listed separately, never hidden.

### 12.3 README outline

One-line pitch; demo GIF; problem; quickstart; example output; how it works; evaluation method and results; limitations; CI integration; development; license.

### 12.4 Submission assets

Demo video, architecture diagram, before-and-after screenshots, evaluation summary, capability ledger, threat model, sample report JSON.

## 13. Risks and mitigations

- **False positives on legitimate mocks:** confidence tiers and a negative corpus.
- **Mutation runtime:** scope, incremental, sampling, caching.
- **disableBail slowdown:** enable only for the proof run; keep default runs fast.
- **Stryker or Jest configuration eats the schedule:** keep an adapter boundary; fall back to a small deterministic mutator for the fixture and label the scope.
- **Equivalent mutants distort scores:** filter, list, show denominators.
- **LLM repair wrong or unstable:** advisory only, reverified, cached.
- **Looks like a Stryker wrapper:** make provenance, probe, certificates and merge first-class and evaluate them.
- **Weak results on some packages:** report honestly with explanations.
- **Claims exceed the repository:** maintain the capability ledger and generate numbers from the tagged commit.

## 14. Reading list

**Mutation-guided LLM test generation:** Foster et al., ACH at Meta (arXiv 2501.12862); Alshahwan et al., TestGen-LLM (arXiv 2402.09171); Moradi Dakhel et al., MuTAP (arXiv 2308.16557); Wang et al., MutGen (arXiv 2506.02954); Tip, Bell, Schäfer, LLMorpheus (arXiv 2404.09952); Wang et al., LLMs for mutation testing (arXiv 2406.09843); Tian et al., LLMs for equivalent mutant detection (ISSTA 2024).

**Failure modes of LLM tests:** Hora and Robbes, over-mocked agent tests (arXiv 2602.00409); Mathews and Nagappan (arXiv 2412.14137); Ouédraogo et al., test smells (arXiv 2410.10628); Do LLMs generate test oracles that capture actual or expected behavior (arXiv 2410.21136); Understanding LLM-driven test oracle generation (arXiv 2601.05542); Khandaker et al., AugmenTest (arXiv 2501.17461).

**Foundations:** Inozemtseva and Holmes (ICSE 2014); Just et al. (FSE 2014); Gopinath et al. (ICSE 2014); Petrović et al., Practical Mutation Testing at Scale (arXiv 2102.11378); Petrović et al., Does mutation testing improve testing practices (arXiv 2103.07189); Spadini et al., To Mock or Not To Mock (MSR 2017).

**Benchmarks and baselines:** Jain et al., TestGenEval (arXiv 2410.00752); Schäfer et al., TestPilot (arXiv 2302.06527); Wang et al., Software testing with LLMs survey (arXiv 2307.07221).

**Tools:** StrykerJS documentation and mutation-testing report schema; Jest documentation; Mutahunter; qodo-cover; fast-check.

## 15. Claim ledger and open questions

Maintain a table of capabilities with status DESIGNED, IMPLEMENTED or TESTED and the evidence for each (command, report, CI run). Update it only from the final commit.

Open questions: Which event and what is its rubric? Team size and event length? Strongest languages? Which real packages? Is the MCP loop stable enough to demo? What do the day-0 spikes show?

## 16. Final checklist

- [ ] Fresh clone installs and runs the fixture with documented commands
- [ ] Baseline passes before mutation analysis
- [ ] A true Survived mutant exists for the weak test and is killed by the strong test
- [ ] Kill matrix and per-test certificates generated
- [ ] Valid boundary mock is not flagged
- [ ] Merge preserves hand-written content and is idempotent
- [ ] Every statistic states denominator, exclusions and interval
- [ ] Real-package results and baselines committed
- [ ] No target presented as a measurement
- [ ] Competitor search repeated the day before submission
- [ ] Security limits and unsupported cases documented
- [ ] License, README, demo video, and links verified from a fresh session
