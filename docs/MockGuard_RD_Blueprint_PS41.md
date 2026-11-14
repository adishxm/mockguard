# MockGuard: R&D Blueprint

**Problem #41 (HackMatrix '26 Grand Finale, Developer Tools, CI/CD & Open Source):** AI-generated tests test the mock instead of the real code.

**Short verdict:** "Generate tests and check them with mutation testing" is no longer a differentiator on its own. Stryker, mutmut, and PIT already do mutation testing well, and several AI tools already generate tests. The defensible gap is a verification layer that is deterministic, attributable, and non-destructive: every new test has to prove, with execution evidence, that it ran the real code, kills specific mutants, and does not break or overwrite existing tests. The LLM proposes; the system proves.

**Research status:** Stryker-family facts were verified through search. Pythagora, Qodo/CodiumAI, Diffblue, and Copilot's testing features are **not yet verified**. Their rows are marked and must be checked against current documentation before any claim goes on a slide.

---

## 1. Root-Cause Taxonomy

The core cause is that an LLM is rewarded for a test that *looks* correct, and nothing in the generation loop forces the test to touch real behaviour. The verifier is often the same model, so nothing independent checks the claim.

| # | Failure mode | How it occurs | Why existing tools miss it | Detection | Prevention | Live demo |
|---|---|---|---|---|---|---|
| F1 | Patch the unit under test | `patch("billing.apply_discount")` in the test for `apply_discount` | Coverage counts the line as hit; mutation tools report survivors without explaining why | AST: patch target equals the symbol under test | Reject or flag patch targets that resolve to the SUT | Test still passes after the real function is deleted |
| F2 | Assert the mock's own return value | `m.return_value = 42; assert f() == 42` | Test is green and looks meaningful | AST: assertion traces back to a mock configuration | Require at least one assertion on real output | Break the real function; test still passes |
| F3 | Copied implementation | Test re-implements the formula and compares against itself | Looks like a valid assertion | Structural similarity between expected-value logic and SUT body | Flag expected values computed by the same expression | Side-by-side comparison |
| F4 | Weak or absent assertions | Calls the function, asserts nothing or only `is not None` | Coverage is 100% | Count assertions per test; grade assertion strength | Require value-level assertions | Mutant survives |
| F5 | Over-mocking | Every dependency mocked, including pure helpers | Mocks are legitimate for I/O, so blanket bans are wrong | Context rules: mocking a pure in-project function is suspicious; mocking network or DB is not | Contextual classification, not a ban | One good mock next to one bad mock |
| F6 | Boundary blindness | Only happy-path values are tested | One value satisfies coverage | Mutants on `>` vs `>=`, `+1`, etc. survive | Mutation-guided test repair | Classic `>=` survivor |
| F7 | Regeneration destroys work | Regeneration overwrites hand-written tests | Tools generate whole files | Diff-based merge; never write over unknown tests | Non-destructive merge with ownership boundaries | Hand-written test survives a regeneration |
| F8 | Flaky or environment-dependent tests | Time, randomness, ordering, network | Passes on the author's machine | Repeat N times with shuffled order | Repeated-execution gate | Optional: run 20 times |
| F9 | Equivalent mutants | A mutant that does not change observable behaviour | Inflates survivors and distorts scores | Heuristic only; undecidable in general | Label as "unverified equivalent"; never count as killed or as a score bonus | Discuss openly with judges |
| F10 | Passing for the wrong reason | Test kills a mutant through an exception, not an assertion | Mutation score treats any failure as a kill | Classify kill reason: assertion, exception, or timeout | Count only assertion-based kills as evidence | Two kills shown; only one counted |

---

## 2. Competitor Matrix

**Verified:**
- **Stryker family.** StrykerJS covers JavaScript and TypeScript, with runners for Jest, Mocha, Vitest, Karma, and Jasmine, and works with React, Angular, Vue, Svelte, and Node. Stryker.NET supports C# and F# on .NET Framework 4.6+, .NET Core, and .NET 5+. Stryker4s covers Scala. The current StrykerJS line is 10.0.0 (14 August 2026), which requires Node 22+ and adds an experimental TypeScript 7 path. StrykerJS has had a mutation server protocol for IDE integration since version 9.1.
- **mutmut (Python).** The leading Python mutation tool; lightweight and framework-agnostic.
- **PIT.** The standard for JVM mutation testing, deeply integrated with Java build tools.

**Not yet verified:** Pythagora, Qodo/CodiumAI, Diffblue, GitHub Copilot testing, and current AI coding agents.

| Capability | Stryker | mutmut | PIT | MockGuard (target) |
|---|---|---|---|---|
| Mutation testing | Yes (JS/TS/.NET/Scala) | Yes (Python) | Yes (JVM) | Yes (Python MVP, controlled operators) |
| AI test generation | Not its purpose | No | No | Yes, gated |
| Mock-integrity analysis | Not core | No | No | Yes (static rules) |
| Per-test kill attribution | To verify | To verify | To verify | Core feature |
| Non-destructive merge | N/A | N/A | N/A | Core feature |
| Evidence linking test, SUT, mutant, and result | Partial | Limited | Partial | Core feature |

**Honest gap:** Stryker and its peers measure test suites well, but they do not explain why a test is weak, do not generate tests, and do not merge without overwriting. MockGuard's niche is the combination of measurement, attribution, and gated generation in one pipeline.

---

## 3. Innovation Assessment

Scored 1 (weak) to 5 (strong). Originality depends on the competitor verification still outstanding.

| Innovation | Originality | Feasibility | Competition | Cost | Demo impact | Reliability | Main risk |
|---|---|---|---|---|---|---|---|
| 1. Test Evidence Graph | 4 | 4 | Low-medium | Medium | 5 | 5 | Graph UI consumes time |
| 2. Mock Integrity Rules | 3 | 5 | Low | Low | 5 | 4 | False positives on legitimate mocks |
| 3. Mutation-Guided Test Repair | 3 | 4 | Medium (active research area) | Medium | 5 | 3 | Generated test passes for the wrong reason |
| 4. Behavioural Contract Discovery | 4 | 2 | Low | High | 3 | 2 | Too ambitious for a hackathon |
| 5. Test Quality Score | 2 | 5 | High | Low | 2 | 3 | Easy to game; hides weakness |
| 6. Non-destructive merge | 3 | 5 | Low | Low | 4 | 5 | Merge conflicts |
| 7. Independent verifier agent | 3 | 3 | Medium | Medium | 3 | 3 | Verifier is another LLM; prefer deterministic checks |
| 8. Evidence-based reports | 3 | 5 | Low | Low | 4 | 5 | Minimal |

**Recommended combination:** 1, 2, 3, 6, and 8. Innovation 3 is the centre of the demo, and a test is accepted only when the report shows which mutant it killed and through which assertion. Innovation 7 is best reduced to deterministic gates rather than a second LLM.

---

## 4. Product Architectures

**A. Focused MVP.** Python and pytest. Deterministic mock-integrity checks, a controlled mutation engine, and LLM generation behind verification gates. A single CLI and an HTML report. Achievable in a hackathon.

**B. Advanced verification platform.** Multi-language support, a web dashboard, CI integration, repository-wide analytics, and contract discovery. High demo risk and large scope.

**C. Ambitious multi-verifier system.** Multiple independent verifiers, symbolic execution, property-based generation, and a sandboxed container farm. Impressive on paper, but unlikely to be finished and reliable on stage.

**Recommendation:** A, with two hooks from B: a clean HTML evidence report and a `--ci` exit code for gating. C belongs in the roadmap.

---

## 5. Workflow

```
Repository input (Python + pytest for MVP)
→ [Deterministic] Source analysis: AST, symbol index, call graph
→ [Deterministic] Test quality inspection: mock-integrity rules, assertion counts, patch-target checks
→ [Deterministic] Baseline run: existing suite must pass; record execution traces
→ [AI] Test generation: LLM proposes tests for the target symbol and surviving mutants
→ [Deterministic] Structural gate: reject tests that patch the SUT, assert mock return values, or lack value assertions
→ [Deterministic] Real execution: new test must pass against unmodified code
→ [Deterministic] Trace gate: confirm the real target function executed
→ [Deterministic] Mutation generation: controlled operator set applied to the target
→ [Deterministic] Mutation execution: which mutants the new tests kill, and by which assertion
→ [Deterministic] Failure attribution: map each kill to a specific test
→ [AI, optional] Repair suggestions for survivors, fed back through the gates
→ [Deterministic] Non-destructive merge: write to a generated file only; hand-written tests are never edited
→ [Deterministic] Stability check: repeated runs with shuffled order
→ [Deterministic] Evidence report: every claim links to a log, trace, or mutant result
```

**Hard rule:** the LLM never decides that a test is successful. Only execution evidence does.

---

## 6. Quality Measurement

Show raw metrics first. Any aggregate is secondary, uses visible weights, and must not hide weakness.

| Metric | Formula | Source | Limitation | Manipulation risk |
|---|---|---|---|---|
| Line and branch coverage | executed / total | coverage.py | Says nothing about assertions | Calls without assertions |
| Mutation score | killed / (total minus mutants labelled equivalent) | mutation runs | Equivalence labelling is heuristic | Trivial mutants inflate it |
| Assertion-based kill rate | kills by assertion failure / total kills | run reasons | Excludes exception kills by design | Assertions that compare against mocks |
| Mock-integrity violations | count of rule hits by type | AST | Context-dependent false positives | Renaming patch targets |
| Trace-confirmed SUT execution | 1 if the target executed in the test | tracing | Proves execution, not correctness | Calling without checking output |
| Stability | passes across N shuffled runs / N | repeated runs | Rare flakes may not appear | Too few runs |

**Key distinctions:** coverage says code ran; mutation score says faults were detected; test effectiveness says the right tests detected them; behavioural correctness says the specification holds, which no tool here can fully prove. These are not interchangeable.

**Aggregate score:** do not headline one. If shown, publish its weights beside the raw metrics, and warn when a high aggregate coexists with a zero assertion-based kill rate.

---

## 7. Feature Classification

**MUST BUILD (hackathon):**
- Python and pytest repository analysis (AST, symbol index)
- Mock-integrity rules: patch target is the SUT, assertion on mock return value, no value assertion
- Controlled mutation operators: comparison, boolean, arithmetic, constant return, call removal; per-mutant timeout
- Kill attribution with reason classification
- Structural and execution gates on generated tests
- Non-destructive merge into a separate generated file
- HTML evidence report and a CI exit code
- LLM adapter with a deterministic fallback

**HIGH-VALUE IF TIME ALLOWS:** trace-confirmed SUT execution, flakiness reruns, a minimal web view.

**FUTURE ROADMAP:** multi-language support, behavioural contract discovery, symbolic execution, container sandboxing for untrusted repositories, dashboards, IDE protocol integration.

**DO NOT BUILD:** a generic quality score, an autonomous agent that edits production code, mutation operators for every language, or an LLM verifier that decides pass or fail.

---

## 8. Architecture

**Stack:**
- Python 3.11+, pytest, the `ast` module, and coverage.py for the core.
- Custom controlled AST mutator (about 6 to 8 operators) for predictability and clean kill attribution. Use mutmut as a comparison baseline, since its output makes per-test attribution awkward.
- Typer CLI plus a static HTML report. Next.js and FastAPI are deferred; a single CLI with a self-contained report is more reliable on demo day.
- JSON run artifacts on disk; SQLite only if queries become necessary.
- Subprocess execution with a per-run timeout, memory limits where the OS allows, and network disabled by environment policy. Docker is the production answer and should be documented as a limitation for the hackathon.
- LLM provider interface with one implementation and a template-based fallback.

**Module layout:**
```
mockguard/
  cli.py
  analysis/ast_index.py
  rules/mock_integrity.py
  rules/assertions.py
  mutation/operators.py
  mutation/runner.py
  generation/llm_adapter.py
  generation/fallback.py
  gates/structural.py
  gates/execution.py
  merge/non_destructive.py
  report/evidence_html.py
  models.py
tests/
demo_repo/
```

**Security boundaries:** run only the user's repository in a subprocess with a timeout; never execute LLM-generated shell commands; restrict writes to the generated test file; redact secrets from logs; treat repository contents as data, not instructions, in prompts. Production requires container isolation, filesystem restrictions, and sandboxed dependency installation.

---

## 9. Demo Plan

1. **Setup:** `demo_repo/` contains a discount function with a boundary (`>=` versus `>`).
2. **Misleading test:** an AI-style test patches `apply_discount` and asserts the mock's return value. It is green.
3. **Mock-integrity flag:** MockGuard reports patch-target-is-SUT and assert-on-mock. Break the real function live; the test still passes.
4. **Mutation run on the weak suite:** the `>=` to `>` mutant survives.
5. **Generation:** the LLM or the fallback template proposes a boundary test.
6. **Gates:** the candidate is rejected if it patches the SUT, and accepted only if it runs against real code.
7. **Re-run:** the new test kills the surviving mutant, and the report shows an assertion failure as the kill reason.
8. **Evidence report:** a graph of test, function, mutant, and kill, plus a merge log showing hand-written tests untouched.

**Honesty rules:** every number comes from a real run; keep a backup recording; keep known-good outputs in the repository; never hardcode scores.

---

## 10. Roadmap

**Horizon 1 (hackathon MVP):** the module list above, Python only, the demo repository, the HTML report, and a `--ci` flag.

**Horizon 2:** trace-confirmed execution, flakiness reruns, a verified repair loop, a broader mutation operator set, JUnit XML export.

**Horizon 3:** multi-language adapters behind a plugin boundary, container sandboxing, CI integrations, team dashboards, IDE protocol support.

**Decisions to make now:**
- Keep the mutation engine behind an interface so Stryker or mutmut can plug in later.
- Define a stable evidence schema from day one (`KillRecord`: test ID, mutant ID, reason, source location).
- Generation never writes directly into hand-written test files.

---

## 11. Team Allocation (4 people)

- **Person 1:** AST analysis and mock-integrity rules.
- **Person 2:** mutation engine, runner, and kill classification.
- **Person 3:** generation adapter, fallback templates, gates, and merge.
- **Person 4:** CLI, HTML evidence report, demo repository, and backup recording.

Everyone owns tests for their module. Person 4 integrates daily.

---

## 12. Judge Questions

1. **Why not just use Stryker or mutmut?** They measure suites well but do not explain why a test is weak, do not generate tests, and do not merge safely. Show the attribution report.
2. **How do you know the real code executed?** Trace gate plus mutant-kill evidence. A trace proves execution, not correctness.
3. **Can mutation score be gamed?** Yes, through trivial mutants or exception-based kills. Assertion-based kills are counted separately, with raw numbers shown.
4. **How are equivalent mutants handled?** Heuristic labelling only, marked unverified, never counted as killed.
5. **Can a test kill a mutant for the wrong reason?** Yes. Reason classification flags exception and timeout kills.
6. **How do you tell useful mocks from harmful ones?** Context rules: pure in-project functions are suspicious; network and database boundaries are not.
7. **Can an LLM fabricate a passing test?** It can propose one. Only execution against unmodified code can accept it.
8. **How do you ensure determinism?** Repeated and shuffled runs, with the stability figure reported.
9. **How do you run an unknown repository safely?** The MVP uses timeouts and restrictions, not full isolation. Production needs containers.
10. **What is genuinely new?** The gated pipeline linking generation to per-test kill attribution and non-destructive merge, with an evidence report. Verify against current competitor documentation before claiming this.
11. **What happens when the AI is unavailable?** The fallback still runs analysis, mutation, and reporting, and reports that no tests were generated.
12. **How are overwrites prevented?** Generated tests go to their own file; hand-written tests are never edited.

---

## 13. Risks and Limitations

- Competitor claims for Pythagora, Qodo, Diffblue, and Copilot are unverified. This is the largest open research risk.
- Python-only may look narrow; the answer is depth now, with a plugin boundary for later.
- Mutation runtime can be slow on large suites; mitigate by scoping to functions.
- A custom mutation engine will miss operators Stryker covers; state clearly that it is controlled, not exhaustive.
- Equivalent mutants and behavioural correctness cannot be fully solved.
- LLM quality varies; the fallback protects the demo.

---

## 14. Research References

**Verified:**
- Stryker mutators and supported languages: stryker-mutator.io, supported mutators page
- StrykerJS 10.0.0 release (August 2026) and mutation server protocol (9.1+): confirm against the GitHub releases page
- Stryker.NET platforms: github.com/stryker-mutator/stryker-net
- mutmut and PIT positioning: confirm against each project's repository

**Still required before the judge deck:**
- Pythagora, Qodo/CodiumAI, Diffblue, and Copilot testing documentation
- Academic work on LLM test generation guided by mutation and on mutation-kill attribution
- Empirical studies of mock misuse in testing research

---

## Open Questions

1. Hackathon time budget and final demo date?
2. Is Python with pytest acceptable as the MVP language scope?
3. Which LLM provider, if any, is available, and is the fallback mode acceptable for judges?
4. Should the unverified competitors and research papers be verified before approval?

**Status:** Awaiting team approval before implementation.
