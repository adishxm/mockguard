# MockGuard: Final Gap Closure and Engineering Readiness Report

**Scope:** Technical specification to close open design gaps before implementation.
**Status:** Specification only. No repositories, branches, or deployments were modified. No code has been written. Awaiting team approval.
**Predecessor:** MockGuard R&D Blueprint (Problem #41, HackMatrix '26 Grand Finale, Developer Tools track).

---

## 0. Verification Log

Competitor claims below were checked against the official documentation pages or repositories returned by search during this review. Where a source was a secondary article, aggregator, or marketing page, it is labelled as such. Anything not confirmed is listed in Section 16.

| Tool | Source type used | Confidence |
|---|---|---|
| Stryker (JS/TS, .NET, Scala) | Official site, GitHub repos, release notes | High for language coverage; medium for per-test features |
| mutmut | Official GitHub README and docs mirrors | High for run/result model; medium for per-test attribution |
| PIT | Official pitest.org documentation and repository | High |
| fermut (Python, new entrant) | PyPI project page, self-reported benchmarks | Medium (self-reported) |
| Qodo | Official docs (docs.qodo.ai) | High for features; no mutation or mock-analysis content found |
| Diffblue Cover / Agents | Official docs and marketing pages | High for docs; marketing claims flagged |
| Pythagora | GitHub README (deprecated) | High that it is deprecated |
| GitHub Copilot | Official docs (docs.github.com, Microsoft Learn) | High for features |

---

## 1. Executive Verdict

1. **Mutation-guided test generation is no longer unique.** Diffblue's marketing states that its tests are "designed to achieve high mutation testing scores." This must be verified in its methodology documentation before any claim is made about it, but it means we cannot position "mutation-guided generation" alone as our differentiator.
2. **Mutation testing in Python is becoming crowded.** mutmut is established, and fermut (new, agent-first) claims faster runs with per-test coverage selection and a type-checker pre-filter. We should not compete on mutation speed or score.
3. **The differentiator that survives review is the gate pipeline and its evidence:** a generated test is accepted only when (a) it passes structural mock-integrity rules, (b) it executes the target symbol at runtime, and (c) it produces assertion-based kills on named mutants that human-written tests do not already kill, and (d) it is merged without touching existing files. None of the documentation reviewed describes this combination as a built-in product behaviour.
4. **Qualified claim we can defend:** *MockGuard accepts a generated test only with per-test, per-mutant evidence and never lets a model declare success.* This is narrower than "first to ..." claims and is what judges can verify live.
5. **Honest weakness to state openly:** a generated test derived from the implementation can enshrine a bug as expected behaviour. MockGuard detects weak and vacuous tests; it does not prove the specification is correct. Diffblue describes its tests as validating "current behavior," which has the same limitation.

---

## 2. Verified Competitor Comparison

### 2.1 Tool Notes

**Stryker (StrykerJS, Stryker.NET, Stryker4s)**
- Verified: mutation testing for JavaScript and TypeScript with runners for Jest, Mocha, Vitest, Karma, and Jasmine; works with React, Angular, Vue, Svelte, and Node. Stryker.NET supports C# and F# on .NET Framework 4.6+, .NET Core, and .NET 5+. Stryker4s supports Scala. Stryker has over 30 supported mutators.
- Verified: StrykerJS 10.0.0 (14 August 2026) requires Node 22+. Mutation server protocol for IDE integration exists from 9.1.
- Secondary source only: a per-test coverage analysis and a "dry run" that excludes tests already failing before mutation. Confirm in official docs before relying on either.
- Does not solve: test generation, mock-integrity analysis, merge of generated tests.

**mutmut (Python)**
- Verified: runs any test command that returns an exit code; can use coverage data to restrict mutation to covered lines; can stop and resume; caches results; `mutmut browse` and `mutmut apply` for working with survivors; a `pre_mutation` hook can change the test command per mutant.
- Verified result statuses in its output include Killed, Survived, Timeout, and Suspicious.
- Important for us: because mutmut only consumes exit codes, it does not classify kill reasons (assertion versus exception) natively. Per-test attribution would have to be built on top.
- Does not solve: generation, mock analysis, merge.

**PIT (Java and JVM)**
- Verified outcome set: Killed, Lived, No coverage, Non viable, Timed Out, Memory error, Run error.
- Verified: runs a line-coverage pass first, builds a map of which tests execute which lines, and selects tests per mutant.
- Verified: an early-exit option stops analysing a mutant once one test fails, which gives a performance benefit but means the full kill matrix is not produced by default.
- Does not solve: generation, Python, mock analysis, merge.

**fermut (Python, PyPI)**
- Verified from its PyPI page: agent-first mutation testing for Python, uses ruff's parser and Astral's `ty` type checker to drop type-invalid mutants before running, runs survivors in parallel against pytest or unittest, uses per-test coverage selection.
- Self-reported (unverified): 164 s versus 298 s for mutmut on one project, with a higher mutation score. Treat as the vendor's benchmark.
- Relevance: directly overlaps the "Python mutation engine" component. We should consume or benchmark against it rather than rebuild a general mutation engine without reason.

**Qodo (formerly CodiumAI; Qodo Gen)**
- Verified: `/test` and `/test-suite` commands; a "Test Lens" above functions; behaviour analysis that produces a list of behaviours before tests; a configuration file for test setup; per-test chat refinement; modification history per test; like and dislike feedback; coverage-gap identification during pull-request review through Qodo Merge.
- Verified and important: "If a test fails, Qodo Gen attempts to fix it automatically and re-run it. The process stops if a potential bug is detected." Automatic repair of failing tests can drive tests toward green without establishing which side was wrong. This is a risk we explicitly avoid (see Section 6.5).
- Not found in the documentation reviewed: mutation testing, mock-usage analysis, or kill-level evidence.

**Diffblue (Cover, Cover Agents)**
- Verified: autonomous Java unit test generation (JUnit or TestNG) that compiles and runs tests; runs inside the customer environment; sandbox on by default to prevent filesystem or network damage during test generation; CI integration and test maintenance across code changes; coverage reporting; an optimisation feature that runs only relevant tests.
- Verified: Diffblue describes its tests as validating "the current behavior of your code." This is characterisation testing, which can lock in existing bugs.
- Marketing claims, to verify: "Tests designed to achieve high mutation testing scores" and per-verified-line pricing. Python appears in the platform compatibility list on its marketing page.
- Overlap with us: autonomous test generation with verification before delivery, and a sandbox. This is the closest competitor in concept, though Java-focused and not described as a mock-integrity system in the documentation reviewed.

**Pythagora**
- Verified: its repository is marked deprecated in favour of GPT Pilot. It generates Jest tests for JavaScript and TypeScript by parsing a function and its called functions with AST, then sending them to a server running GPT-4.
- Verified statement from its own README: generated tests "should always be reviewed before committing."
- Relevance: historical reference only. Do not present it as a current competitor.

**GitHub Copilot (Chat, `/tests`, coding agent, Java app modernization)**
- Verified: `/tests` slash command generates unit tests for selected code or the open file; tests can be appended to an existing file or placed in a new one; prompt files can enforce frameworks and style; the Java app modernization agent generates tests, runs them, and produces a before-and-after report of counts (total, passed, failed, errors).
- Verified: the agent "validates that all tests pass before it finishes."
- Not found in documentation reviewed: mutation testing, mock-integrity checks, per-test kill evidence.

### 2.2 Feature Matrix

Legend: Yes = documented; No = not found in docs reviewed (not a claim about absence in the product); Partial = documented with limits; ? = unverified.

| Capability | Stryker | mutmut | PIT | fermut | Qodo | Diffblue | Copilot | MockGuard target |
|---|---|---|---|---|---|---|---|---|
| Mutation testing | Yes | Yes | Yes | Yes | No | ? (marketing) | No | Yes (controlled set) |
| Python | No (separate: .NET, Scala) | Yes | No | Yes | Yes (general) | Yes (marketing, verify) | Yes | Yes (MVP) |
| AI test generation | No | No | No | No | Yes | Yes (Java) | Yes | Yes, gated |
| Per-test coverage mapping | ? (secondary) | Partial (via hooks) | Yes | Yes | No | ? | No | Yes |
| Kill-reason classification | ? | No (exit codes) | Partial (outcome set, not reason) | ? | No | ? | No | Yes |
| Mock-usage analysis | No | No | No | No | No | ? | No | Yes (rules) |
| Rejects tests that patch the unit under test | No | No | No | No | No | ? | No | Yes |
| Non-destructive merge | N/A | N/A | N/A | N/A | Per-test history; no merge rule | No | User choice to append or create | Yes |
| Auto-repair of failing tests | No | No | No | No | Yes | Maintenance on change | Agent validates passing | No (explicitly excluded) |
| Sandboxed generation | No | No | No | No | No | Yes (default) | No | Hackathon subset |

### 2.3 Honest Read

The strongest documented overlaps are Diffblue (autonomous verified generation, sandbox) and PIT (per-test coverage mapping). The strongest documented gaps across the set are mock-usage rules, kill-reason classification as evidence, and non-destructive merge rules. Absence in documentation is not proof of absence in the product, so these gaps must be re-checked against each product's current features before any slide claims them.

---

## 3. Differentiation Assessment

Each candidate differentiator is scored against the documentation above.

| Candidate | Status | Basis | Action |
|---|---|---|---|
| Mutation-guided test generation | Overlapping | Diffblue marketing claim (unverified methodology) | Do not lead with it |
| Mutation engine for Python | Overlapping | mutmut, fermut | Do not build a general engine; use a controlled operator set and be explicit about it |
| Per-test coverage selection | Overlapping | PIT, fermut | Implement as a means, not as a claim |
| Kill-reason classification as evidence | Partially covered | PIT outcome set exists but does not separate assertion from exception kills in documented outcomes | Keep; it is central |
| Mock-usage integrity rules tied to the unit under test | Not found in reviewed docs | No reviewed tool documents it | Keep; test precision carefully (Section 7) |
| Gate: generated tests must execute the target at runtime | Not found in reviewed docs | Diffblue validates passing, not execution of target lines per test | Keep |
| Non-destructive merge into a generated file | Not found in reviewed docs | Copilot offers user choice; Qodo keeps history | Keep; simple and demonstrable |
| Evidence record linking test, symbol, mutant, and kill | Partially covered | PIT HTML reports link lines to outcomes, not generated tests | Keep as a stable JSON schema |
| Rejection of auto-repairs that trade a failing test for a passing one | Not found as a stated policy | Qodo auto-fixes failing tests | Keep as a stated policy |

**Defensible positioning:** a Python-first verification gate that accepts generated tests only with per-test, per-mutant assertion-kill evidence, mock-integrity checks, runtime execution of the target, and non-destructive merge, where every number traces to a raw log.

**Risk to positioning:** a judge can say "Diffblue already does this for Java and PIT does kill attribution for Java." Our reply must be the Python gap, the gate policy, and the evidence chain, and must not claim the mutation concept itself.

---

## 4. Final Technical Architecture

### 4.1 Principles

1. **Deterministic core, advisory AI.** The LLM produces candidate test files only. It cannot assert success, edit existing files, or run commands.
2. **Copy-based execution.** Every run happens in a disposable copy of the target repository. The user's working tree is never modified.
3. **Raw evidence first.** A JSON evidence file is the single source of truth. The HTML report is rendered from JSON only.
4. **Frozen contracts.** Evidence schema, outcome taxonomy, and operator set are versioned and fixed before coding (Section 12).

### 4.2 Pipeline

```
[1] Ingest        copy repo to sandbox workspace; record commit/hash; detect pytest config
[2] Index         AST symbol index; import resolution; list tests and their imports
[3] Inspect       mock-integrity rules over existing tests (advisory, confidence-tiered)
[4] Baseline      run suite 3x; quarantine flaky tests; record per-test outcomes and coverage contexts
[5] Candidates    load candidate test file(s) (LLM-generated or pre-recorded fixture)
[6] Gate-static   validate candidate: parses, path allowed, no forbidden patch targets, mock rules
[7] Gate-exec     run candidate against unmodified code: must pass; must execute target symbol
[8] Mutate        apply controlled operators to target module; check each mutant applied (hash)
[9] Attribute     run covering tests per mutant; classify each outcome; compute mutant status
[10] Credit       unique kills of candidate tests vs human-written tests
[11] Merge        write to generated file only; verify hand-written files byte-identical
[12] Report       emit evidence.json; render evidence.html from JSON
```

### 4.3 Deterministic and AI Boundary

| Stage | Deterministic | AI |
|---|---|---|
| Ingest, index, import resolution | Yes | No |
| Mock-integrity rules | Yes | No |
| Baseline and flake detection | Yes | No |
| Candidate generation | No | Yes (optional) |
| Static gate | Yes | No |
| Execution gate and trace | Yes | No |
| Mutation and attribution | Yes | No |
| Merge | Yes | No |
| Explanation text for repair suggestions | No | Yes, labelled "suggestion" and never used as evidence |

**Hard rule:** no status, score, or acceptance decision is computed from model output.

### 4.4 Module Layout (frozen)

```
mockguard/
  cli.py                      entry point, exit codes
  config.py                   fixed defaults, no hidden state
  workspace.py                copy-based sandbox, path guards
  index/
    symbols.py                AST symbol index
    imports.py                import and patch-target resolution
  inspect/
    rules.py                  rule registry (IDs, versions, confidence)
    mock_integrity.py         MI-* rules
    assertions.py             AS-* rules
  runner/
    pytest_runner.py          subprocess execution, timeouts, outcome parsing
    classify.py               outcome taxonomy (Section 6)
    coverage_map.py           per-test contexts
  mutation/
    operators.py              fixed operator set v1
    apply.py                  apply/revert with hash verification
  generate/
    provider.py               LLM interface
    fallback.py               deterministic fallback (fixture candidates)
  gates/
    static_gate.py
    exec_gate.py
  attribution/
    attribute.py
    credit.py
  merge/
    merge.py                  generated-file-only writes
  evidence/
    schema.py                 dataclasses + JSON schema
    ids.py                    content-addressed IDs
    writer.py
  report/
    render_html.py            reads evidence.json only
tests/                        MockGuard's own tests
demo/
  repo/                       sample project with planted faults
  candidates/                 recorded candidate files with provenance
  expected/                   expected evidence fragments (for regression, not for display)
benchmark/
  cases/                      labelled cases (Section 9)
  harness.py
```

### 4.5 Stack (frozen)

- Python 3.11+ (ast, tokenize), pytest, coverage.py (dynamic contexts), Typer, Pydantic or dataclasses for schema, Jinja2 or plain string templating for HTML.
- No database. JSON on disk.
- No web framework for MVP.
- Mutation engine: our own, limited to the operator set in Section 6.2. mutmut and fermut are used as comparison baselines in the benchmark only, not as dependencies.
- LLM: one provider adapter behind an interface. Keys are read from the environment of the generator process only and are never passed into test subprocesses.

---

## 5. Evidence Schema

The evidence file is `evidence.json`, schema version `pt-evidence/1`. Every record has an `id`, a `kind`, and a `provenance` block.

### 5.1 ID Scheme

IDs are content-addressed so that identical inputs produce identical IDs across runs.

| Entity | ID formula | Example |
|---|---|---|
| Source file | `file:` + sha256(path + blob bytes)[:16] | `file:3a9f0c2e1b7d4a60` |
| Symbol | `sym:` + sha256(file_id + qualified_name + start_line + end_line)[:16] | `sym:…` |
| Test | `test:` + sha256(file_id + nodeid)[:16] | `test:…` |
| Assertion | `asrt:` + sha256(test_id + line + col + normalized_text)[:16] | |
| Mock configuration | `mock:` + sha256(test_id + patch_target + line)[:16] | |
| Mutant | `mut:` + sha256(file_id + operator_id + line + col + original + replacement)[:16] | |
| Run | `run:` + sha256(command + env_fingerprint + seed + started_iso)[:16] | timestamps make runs unique by design |
| Kill record | `kill:` + sha256(mutant_id + test_id + run_id)[:16] | |
| Finding | `find:` + sha256(rule_id + rule_version + target_id + span)[:16] | |

Timestamps are excluded from every ID except run IDs. Re-running the same inputs must produce byte-identical records except `run` entries.

### 5.2 Entities

**Repository snapshot**
- `commit` (or `null` if not a git repo), `tree_hash` (sha256 over sorted file hashes), `root_name` (not absolute path).

**SourceFile**
- `id`, `relpath`, `sha256`, `kind` (`source` | `test` | `generated_test` | `config`), `origin` (`human` | `generated`).

**Symbol**
- `id`, `file_id`, `qualname`, `kind` (`function` | `method` | `class`), `span` (start/end line and column), `is_under_test` (boolean, set by the target selection, not inferred).

**TestCase**
- `id`, `file_id`, `nodeid` (pytest nodeid), `origin` (`human` | `generated`), `generation_id` (nullable), `baseline_status` (`pass` | `fail` | `error` | `flaky`), `targets` (list of symbol IDs, from coverage contexts).

**Assertion**
- `id`, `test_id`, `span`, `kind` (`value_eq` | `value_cmp` | `exception` | `mock_called` | `truthy` | `none_check` | `other`), `touches_sut` (true if any operand's data flow includes a call to a symbol under test; see Section 7), `is_value_assertion` (boolean).

**MockConfiguration**
- `id`, `test_id`, `patch_target` (string as written), `resolved_symbol_id` (nullable), `resolution` (`resolved` | `external` | `unresolved`), `is_sut` (boolean), `span`.

**Trace edge**
- `test_id`, `symbol_id`, `executed_lines` (count), recorded from coverage dynamic contexts during baseline and gate runs.

**Mutant**
- `id`, `file_id`, `symbol_id`, `operator_id` (e.g. `CMP_GE_GT`), `span`, `original` (text), `replacement` (text), `applied_hash`, `reverted_hash` (must equal original file hash), `status` (see Section 6.4), `candidate_test_ids`.

**Run**
- `id`, `command`, `env_fingerprint` (hash of relevant env keys and versions; keys themselves excluded), `python_version`, `pytest_version`, `seed`, `started`, `duration_ms`, `exit_code`, `workspace_hash_before`, `workspace_hash_after`.

**KillRecord**
- `id`, `mutant_id`, `test_id`, `run_id`, `outcome` (see Section 6.3), `raise_frame` (`test_file` | `sut` | `helper` | `none`), `failure_message_sha256` (hash only; full text kept in run log), `counted` (boolean, true only for `assertion_kill` with `raise_frame = test_file` or `helper` inside repo tests).

**Finding (mock and assertion rules)**
- `id`, `rule_id`, `rule_version`, `target_id` (test or mock ID), `span`, `severity` (`info` | `warning` | `violation`), `confidence` (`low` | `medium` | `high`), `runtime_confirmed` (boolean, from trace), `evidence_refs` (IDs), `message` (fixed template, no model text).

**Gate decision**
- `candidate_id`, `static_gate` (`pass` | `reject`), `reject_reasons` (rule IDs), `exec_gate` (`pass` | `reject`), `target_executed` (boolean), `accepted` (boolean, computed only from the two gates and credit rule).

### 5.3 Provenance

Each record carries:

```json
"provenance": {
  "producer": "deterministic | ai",
  "tool": "mockguard",
  "tool_version": "0.x.y",
  "rule_id": "MI-02",
  "rule_version": "1",
  "model": null,
  "prompt_sha256": null,
  "input_ids": ["test:…", "sym:…"]
}
```

For AI-produced candidates, `model` and `prompt_sha256` are mandatory. An AI-produced record never has `producer: deterministic`.

### 5.4 Relationships (summary)

```
SourceFile 1—* Symbol
SourceFile 1—* TestCase
TestCase *—* Symbol          (via TraceEdge)
TestCase 1—* Assertion
TestCase 1—* MockConfiguration
MockConfiguration *—1 Symbol (resolved_symbol_id, nullable)
Symbol 1—* Mutant
Mutant *—* TestCase          (candidate set)
Mutant *—* KillRecord *—1 TestCase
KillRecord *—1 Run
Finding *—1 (TestCase | MockConfiguration | Assertion)
GateDecision *—1 TestCase (candidate)
```

### 5.5 Storage and Versioning

- One `evidence.json` per run, plus `runs/<run_id>/` with raw pytest JUnit XML and coverage data.
- The schema version is a top-level field. Any change to a field name, type, or enum requires a version bump and a migration note.
- The HTML report reads only `evidence.json`. A test in CI fails if the HTML contains any number not present in the JSON.

---

## 6. Mutation Attribution Algorithm

### 6.1 Goal

For each mutant, determine which tests kill it, and for what reason, so that a claim such as "test X kills mutant M through an assertion" is exactly reproducible from raw logs.

### 6.2 Operator Set v1 (frozen)

Six operators, chosen because each corresponds to a boundary or logic error common in generated tests:

| ID | Transformation | Example |
|---|---|---|
| `CMP_GE_GT` | `>=` to `>` | `if total >= 100` |
| `CMP_GT_GE` | `>` to `>=` | |
| `CMP_EQ_NE` | `==` to `!=` | |
| `BOOL_NOT` | Negate a boolean condition | `if ok:` to `if not ok:` |
| `ARITH_PLUS_MINUS` | `+` to `-` and reverse | |
| `CONST_RETURN` | Replace a returned literal by a different literal of the same type (0 to 1, "" to "x", True to False) | |

Excluded in v1: deletion of calls, exception handling mutations, string mutations, and any mutation spanning more than one statement. Each exclusion is documented so judges can ask about it.

### 6.3 Outcome Taxonomy (per test, per mutant)

Outcomes come from the pytest report and traceback inspection, not from model output.

| Outcome | Condition | Counted as kill evidence |
|---|---|---|
| `PASSED` | Test passes against mutant | No (survivor by this test) |
| `ASSERTION_KILL` | Test fails with `AssertionError`, innermost frame in a test file or repo test helper | **Yes** |
| `SUT_EXCEPTION` | Test fails because the mutated code raises a non-assertion exception | No (weak kill) |
| `SUT_INTERNAL_ASSERT` | `AssertionError` raised inside source code, not test code | No (weak kill) |
| `TEST_ERROR` | Test fails with a non-assertion exception raised by test code (e.g. `KeyError` in test setup) | No (excluded; reported) |
| `TIMEOUT` | Runner timeout reached | No (weak kill, reported) |
| `UNRELATED_ERROR` | Collection, fixture, or import error unrelated to the mutant | Excluded from numerator and denominator; reported |
| `RUN_ERROR` | Crash, OOM, or runner failure | Re-run once; if it reproduces, excluded and reported |

**Why this split matters:** a mutant killed by `SUT_EXCEPTION` is detected but not necessarily by a meaningful check. A test that only fails because a setup helper raised `TypeError` after the mutant made a value `None` is a false kill. Only `ASSERTION_KILL` shows that the test's own expectation was violated.

### 6.4 Mutant Status

Computed from KillRecords only:

| Status | Rule |
|---|---|
| `UNVIABLE` | Mutant fails to parse or import (detected at apply time) |
| `UNCOVERED` | No test in the baseline covers the mutated line |
| `KILLED_BY_ASSERTION` | At least one `ASSERTION_KILL` |
| `KILLED_WEAK` | Killed only by `SUT_EXCEPTION`, `SUT_INTERNAL_ASSERT`, or `TIMEOUT` |
| `SURVIVED` | Every candidate test `PASSED` |
| `INCONCLUSIVE` | No kill, and at least one `RUN_ERROR` or `UNRELATED_ERROR` affecting candidates |

No mutant may be labelled `SURVIVED` if any candidate produced `RUN_ERROR` or `UNRELATED_ERROR`. Those become `INCONCLUSIVE`.

### 6.5 Credit Rule (attribution to generated tests)

A generated test `T` receives **unique credit** for mutant `M` only if:

1. `T` has an `ASSERTION_KILL` on `M`, and
2. No human-written test has an `ASSERTION_KILL` on `M`.

Report both **unique kills** and **shared kills** (kills also achieved by human tests). Never report only the larger number.

**Auto-repair policy:** MockGuard never modifies a failing generated test to make it pass. If a candidate fails the execution gate, it is rejected with its failure record. A candidate may be regenerated, but the new candidate must pass all gates from scratch and keep its own provenance. This prevents the pattern that a pass is obtained by rewriting the expectation to match the observed output without a documented reason.

### 6.6 Algorithm

```
inputs: repo workspace W (copy), target module T, candidate test file C, timeout t, seed s

1. Baseline:
   run full suite 3 times with seed s and shuffled order
   quarantine any test with differing outcomes (flaky)
   record outcome per test, coverage contexts per test

2. Gate-exec (candidate):
   copy C into W/tests/mockguard_generated/
   run C against unmodified code
   reject if any test fails
   reject if target symbol not in coverage contexts of any candidate test

3. Mutate:
   M = operators.enumerate(T) filtered to lines covered by any test
   for each mutant m in M:
       h0 = sha256(T in W)
       apply m to W's copy of T
       verify sha256(T in W) != h0 and file parses
       if not: status = UNVIABLE; continue
       candidates = tests whose coverage contexts include m.line
       for each t_i in candidates (individually, no early exit):
           run t_i with timeout
           outcome_i = classify(run_report, traceback, frame_location)
       status_m = aggregate(outcome_i)
       revert T in W from original bytes
       verify sha256(T in W) == h0
       if not: abort run (workspace integrity failure)

4. Credit:
   for each generated test g and mutant m:
       unique_kill(g, m) = g.ASSERTION_KILL(m) and no human test ASSERTION_KILL(m)
   report unique and shared counts

5. Emit evidence.json and render HTML from it.
```

**Key implementation rules:**
- Run each candidate test individually, not the whole file, to keep kill attribution exact. PIT's early-exit behaviour is a performance choice and is not used here.
- Mutants are applied to a worker copy only, and reverted with a hash check after every mutant.
- Frame classification uses the traceback's innermost frame whose file is within the repository test directories or the generated test file. Assertions inside source files are classified as `SUT_INTERNAL_ASSERT`.
- Each run uses a fixed seed and disabled random plugins where possible. Random behaviour that cannot be pinned is reported as a stability risk.

### 6.7 Known Limits of Attribution

- **Equivalent mutants** are not detected. A mutant that never changes behaviour appears as `SURVIVED`. We never auto-label mutants as equivalent. A human may add a labelled exclusion, recorded as a `Finding` with `rule_id: HUMAN-EQUIV` and the reviewer's identity.
- **Kill for the wrong reason** is reduced but not eliminated. An `ASSERTION_KILL` in a helper called by the test may be correct or may check the wrong thing. Helper assertions are flagged for review in the report.
- **Operator coverage** is limited to six operators. A high score on this set is not a general quality claim.
- **Cost** is mutants times candidate tests. Caps are required (Section 8.4).

---

## 7. Avoiding False Positives in AST-Based Mock-Integrity Detection

### 7.1 Principle

A static rule may flag a test. A runtime observation may only raise or lower confidence. No mock-integrity finding is a violation without at least one of: explicit static evidence that cannot have a legitimate reading, or runtime confirmation.

### 7.2 Rules

| ID | Statement | Static evidence | Exemptions | Confidence |
|---|---|---|---|---|
| MI-01 | The test patches the symbol it tests | `patch` target resolves to symbol S; the test calls S by the name it was imported under | Target is external (outside repo) or resolves to a different symbol with the same short name | High when resolution is exact and the test calls S directly |
| MI-02 | Assertion checks a value the test configured on a mock | Assert expression's operand equals the mock's `return_value` configured in the same test, and no operand depends on a call to S | Test is explicitly named or documented as a wrapper/forwarder test | Medium; high if combined with MI-01 |
| MI-03 | Test asserts only mock calls for a function it claims to test | Only `assert_called*` assertions; no value assertion; mock target is a repo symbol | Target is an I/O boundary (see 7.3) | Medium |
| MI-04 | Patch of a pure, in-repo helper | Patch target resolves to a repo function with no I/O calls in its body (static check) | Helper is in an allowlist; function has I/O | Low; advisory only |
| MI-05 | Copied implementation | Expected value expression is structurally identical to an expression in S's body after normalising names | Expression is a literal or a trivially short arithmetic over constants | Low; advisory only |
| AS-01 | No value-level assertion | Test has no assertion comparing against a non-mock value | Test asserts an exception with the expected type | High |
| AS-02 | Only `is not None` or truthiness | All assertions are `none_check` or `truthy` | Test documents a presence-only contract explicitly | Medium |

### 7.3 Boundary Allowlist

Patches of external boundaries are legitimate and are not flagged. The allowlist is defined by resolution, not by name guessing:

- The patch target's module is outside the repository (resolved by the package finder), or
- The target matches a configured boundary pattern (`requests.*`, `sqlalchemy.*`, `boto3.*`, `datetime.datetime.now`, `time.*`, `random.*`, `os.environ`, `subprocess.*`, and user-configurable entries), or
- The target is a repo symbol that performs I/O according to a static check (open, socket, subprocess, database session calls).

The default allowlist is user-visible and versioned. Any change to it must appear in the evidence file.

### 7.4 Import and Name Resolution

Most false positives come from resolution failures. Rules:

1. Resolve `from x import y as z` and `import x.y` both ways; a patch target `x.y.f` and an import `from x.y import f as g` must unify to the same symbol ID.
2. If resolution fails (dynamic import, `getattr`, star import, `importlib`), the result is `resolution: unresolved`. Unresolved targets never produce a violation. They produce an `info` finding stating that the analyser could not decide.
3. `patch.object(obj, "attr")` is resolved through the type of `obj` only when `obj` is a module or class reference; otherwise unresolved.
4. Decorator-based patches (`@patch`, `@mock.patch`) and `pytest-mock` `mocker.patch` are supported in v1 for string targets. `monkeypatch.setattr` with a non-string target is unresolved.
5. Fixtures returning mocks are followed one level within the same file or `conftest.py`. Deeper chains are unresolved.

### 7.5 Runtime Confirmation

For each test with a static MI finding, the baseline trace records which symbols executed inside that test. Runtime confirmation rules:

- MI-01 with `target_executed = false` for the patched symbol across the test: confirmed.
- MI-02 with the SUT not executed: confirmed.
- If the SUT executes in the test and the static finding is MI-02 on a mock return value that is passed through the SUT: the finding is demoted to `info`.

Runtime confirmation changes a finding's `runtime_confirmed` flag and can raise its confidence. It never creates a violation on its own.

### 7.6 Measured Precision

Precision and recall for each rule are measured on the labelled benchmark (Section 9). A rule is shipped as `violation` only if its benchmark precision meets the threshold in Section 10. Rules below threshold ship as `warning`.

### 7.7 Known Blind Spots

- Dynamic dispatch and generated code.
- Mocks created through factories in other modules deeper than one level.
- Property-based and parametrised tests with dynamically generated arguments: static rules apply to the parametrisation template only.
- `unittest.mock` objects passed through data structures.

Each blind spot is reported as an analyser coverage figure per run: the fraction of mock configurations that were resolved.

---

## 8. Security Model

### 8.1 Threat List

| # | Threat | Vector |
|---|---|---|
| T1 | Arbitrary code execution | Repo test files, `conftest.py`, `setup.py`, `pyproject.toml` build hooks, import-time code |
| T2 | Dependency attacks | Installing repo dependencies triggers install scripts |
| T3 | Resource exhaustion | Infinite loops, fork bombs, memory growth in tests or mutants |
| T4 | Network exfiltration | Tests send data to external hosts |
| T5 | Secret theft | Reading environment variables, `.env`, SSH keys, cloud credentials |
| T6 | Path traversal | Candidate file paths, archive extraction, symlinks |
| T7 | Destructive commands | Tests that delete files, drop databases |
| T8 | Prompt injection | Repo comments instructing the model to write malicious tests or exfiltrate data |
| T9 | LLM output as code execution | Model output executed as shell, or written outside allowed paths |
| T10 | Evidence forgery | Model-written text presented as measured fact |

### 8.2 Controls: Hackathon Versus Production

| Threat | Hackathon control (implemented) | Production control (not in scope) |
|---|---|---|
| T1 | Run only the bundled demo repository and explicitly trusted repositories; arbitrary repository mode labelled "trusted only" in CLI | Container per run, read-only mount of source, non-root user, seccomp profile, no host mounts |
| T2 | Never install dependencies automatically; require user-provided environment; refuse to run if dependency install is requested | Dependency install inside sandbox with egress allowlist to package indexes, hash-pinned installs |
| T3 | Per-run timeout; per-mutant timeout; caps on mutant count and test count; `resource` limits (address space, CPU time) on POSIX | cgroup limits (memory, CPU, PIDs), wall-clock budgets per job |
| T4 | Set proxy environment variables to an unreachable address for test subprocesses; document this as best-effort, not a guarantee | Network namespace with no route; egress proxy with allowlist |
| T5 | Test subprocesses receive a scrubbed environment: only `PATH`, `HOME` set to workspace, `PYTHONHASHSEED`; LLM keys never passed; log redaction for common key patterns | Secret-free runners; secret scanning on inputs and outputs |
| T6 | Resolve every path; reject any path not under the workspace; reject symlinks in candidate files; ignore archives entirely in v1 | Same, plus hardened extraction if archives are added later |
| T7 | Workspace is a disposable copy; deleted after the run; the tool never writes outside `workspace/` and `runs/` | Ephemeral container storage; snapshot and rollback |
| T8 | Repo content placed inside clearly delimited data blocks; model instructions state that repo text is data; candidate output is validated by gates regardless of what it says | Prompt-injection classifier; output policy checks |
| T9 | Model output is written only to `tests/mockguard_generated/`, after `ast.parse`, path validation, and the static gate; never executed as shell | Same with a sandboxed generator process |
| T10 | Reports are rendered from JSON; every number has an ID; provenance marks AI content; CI check that HTML numbers are a subset of JSON values | Signed evidence bundles |

### 8.3 Demo Boundary (stated explicitly)

- The live demo runs only on `demo/repo/`, which is authored by the team and contains no secrets.
- Arbitrary repositories are supported in the CLI behind a flag that states the trust assumption. We do not claim they are safe to run.
- The claim to judges is: "the tool is safe for the repository it is pointed at, under stated limits; production isolation is the next step." We do not claim a production sandbox.

### 8.4 Resource Caps (defaults, fixed for v1)

| Cap | Default |
|---|---|
| Baseline runs | 3 |
| Per-test timeout | 10 s |
| Per-mutant aggregate timeout | 60 s |
| Max mutants per run | 200 |
| Max candidate tests per mutant | 20 |
| Total run wall-clock budget | 15 min |

Any cap hit is recorded in evidence as `budget_exhausted` and the affected mutants are `INCONCLUSIVE`, not survivors.

---

## 9. Benchmark Design

### 9.1 Purpose

The benchmark exists to make claims measurable. It is a pilot dataset, not a statistically representative sample. We state its size and limitations in every report.

### 9.2 Categories and Target Counts

| Category | Description | Count | Ground truth |
|---|---|---|---|
| A. Patch-the-SUT tests | Tests that patch the function under test and assert its return value | 10 | MI-01 positive |
| B. Valid mocked tests | Tests mocking HTTP, DB, clock, filesystem, or subprocess boundaries | 10 | No MI violation (negatives) |
| C. Copied implementation | Expected values recomputed with the same formula as the SUT | 6 | MI-05 positive |
| D. Weak assertions | Only `is not None`, truthiness, or mock calls | 8 | AS-02 / MI-03 positive |
| E. Boundary bugs | Single planted fault at `>` / `>=` or off-by-one | 8 | Expected mutant killed only by boundary tests |
| F. Strong tests | Value assertions with boundary values | 8 | No violations; kills planted boundary mutants |
| G. Flaky tests | Time, randomness, ordering dependent | 4 | Flake detection positive |
| H. Unrelated errors | Import or fixture errors | 3 | Classified as `UNRELATED_ERROR` |
| I. Regeneration overwrite | Hand-written file plus generated candidate | 3 | Hand-written file byte-identical after merge |

**Total: 60 cases.** Splits: 30 development, 30 held-out. Rules are developed on the development split only. The held-out split is run once per rule version to report results.

### 9.3 Adversarial Variants

At least one third of cases in categories A, B, and C must include variants that defeat naive rules:

- Aliased imports (`from pkg import f as g`; patch `pkg.f`).
- Patch through a helper function in `conftest.py`.
- Mocks configured in fixtures.
- Assertions on mock returns wrapped in helper functions.
- Valid boundary patches with similar names (`requests.get` versus a repo `get`).

### 9.4 Authoring and Labelling

- Cases are written by the team; some are generated by a real LLM and recorded with model name, version, date, and prompt hash (provenance).
- Each case has a `manifest.json`:

```json
{
  "case_id": "A-03",
  "category": "A",
  "split": "dev",
  "source_files": ["src/discounts.py"],
  "candidate_file": "candidates/test_discounts_a03.py",
  "origin": "authored | llm-recorded",
  "llm": {"model": null, "prompt_sha256": null},
  "labels": {
    "MI-01": "positive",
    "MI-02": "absent",
    "AS-01": "positive"
  },
  "planted_mutants": [],
  "expected_gate": "reject",
  "expected_reason_codes": ["MI-01"],
  "labellers": ["person_a", "person_b"],
  "adjudicated": true
}
```

- Two labellers label each case independently. Disagreements are adjudicated and the adjudication note is recorded.
- Labels are fixed before the rules are run on the case to avoid tuning labels to output.

### 9.5 Planted Faults

Categories E and F use planted faults registered in `demo/repo/` and in the benchmark, each with a fixed mutant ID. The expected kill set is recorded before running the tool.

### 9.6 Benchmark Harness Outputs

The harness produces, for each case: the static findings, gate decision, outcome per test per mutant, mutant statuses, and the confusion counts per rule. Output is JSON, and the summary table is generated from that JSON.

---

## 10. Evaluation Metrics and Acceptance Criteria

### 10.1 Rules for Thresholds

- Invariants (must be 100%) are properties of the software and can be tested deterministically.
- Quality thresholds are **proposed design targets**. They are not results. They must be checked after the baseline is measured and may be revised only with a written justification recorded in the repository.
- No performance number is claimed before measurement.

### 10.2 Invariants (must hold, 100%)

| ID | Invariant | Verification |
|---|---|---|
| INV-1 | Hand-written test files are byte-identical before and after any run | Hash comparison in test suite and in the merge step |
| INV-2 | Source files in the user's working tree are unchanged after any run | Hash comparison of the original tree |
| INV-3 | Every mutant's apply and revert hashes are verified | Evidence records `applied_hash` and `reverted_hash` |
| INV-4 | No model output is executed | Static check of the codebase: no `subprocess` call receives model text |
| INV-5 | Writes occur only inside `workspace/` and `runs/` | Path guard tests with traversal and symlink fixtures |
| INV-6 | Status and acceptance are never computed from model output | Unit test that gate code does not import the generator module |
| INV-7 | Same inputs produce byte-identical evidence except run records | Two runs compared in CI |
| INV-8 | Every number in the HTML report exists in `evidence.json` | Automated extraction and comparison |
| INV-9 | Kill attribution matches the oracle on planted-fault fixtures | Fixture set with known killing tests |

### 10.3 Quality Targets (proposed; calibrate after baseline)

| Metric | Definition | Proposed target |
|---|---|---|
| MI-01 precision | Flagged cases that are positive / flagged | ≥ 0.95 on dev and held-out |
| MI-01 recall | Positive cases flagged / positive cases | ≥ 0.90 |
| MI-02 precision | As above | ≥ 0.85 (ship as `violation` only if met; else `warning`) |
| Negative false-positive rate | Category B cases with any violation-level finding | 0 |
| Attribution agreement | Kill records matching oracle on planted faults | 100% on fixtures |
| Gate agreement | Gate decisions matching expected on the benchmark | ≥ 0.90 |
| Boundary kill rate | Category E planted faults killed by assertion | Reported; the target is the difference between candidate and baseline suites, not an absolute number |
| Analyser coverage | Mock configurations resolved / total | Reported per run; no target |

### 10.4 Demonstration Acceptance

- The demo runs from a fresh clone with one documented command.
- Every number on the demo report is regenerated from raw logs during the run.
- The demo repository includes a script that deletes `runs/` and re-runs the demo; numbers must match the evidence from the first run.
- A backup recording and the raw run directory are kept in the repository.

---

## 11. Smallest Complete Implementation

### 11.1 What It Must Demonstrate

The central innovation: a generated test is accepted only with runtime execution of the target, mock-integrity checks, and assertion-based kills on named mutants, merged without touching hand-written files.

### 11.2 Scope In

- Python 3.11+, pytest only.
- One target module of the demo repository, with three operators: `CMP_GE_GT`, `BOOL_NOT`, and `CONST_RETURN`.
- Rules MI-01 and AS-01 (highest precision, most demonstrable).
- Baseline with three runs, flake quarantine.
- Gate-static and gate-exec for one candidate file.
- Per-test, per-mutant attribution with the outcome taxonomy.
- Credit (unique versus shared kills).
- Non-destructive merge into `tests/mockguard_generated/`.
- `evidence.json` and a single static HTML report rendered from it.
- CLI exit code: non-zero if any candidate is rejected or any invariant fails.
- Candidate source: a pre-recorded LLM output with provenance, plus a fallback path that uses a fixture candidate. A live LLM call is optional.

### 11.3 Scope Out (explicitly)

- Any language other than Python.
- Web UI, FastAPI, Next.js, database.
- Docker and container sandboxing (documented as production work).
- Behavioural contract discovery, symbolic execution, property-based generation.
- Quality score.
- Equivalent-mutant detection.
- Repair loops that call the LLM repeatedly.
- Dependency installation.
- Multi-file generation.
- IDE integration.

### 11.4 Demo Walkthrough

1. Show the weak candidate: patches `discounts.apply_discount` and asserts the mock's return value. It passes.
2. Run MockGuard: MI-01 fires with high confidence; runtime trace confirms the real function never executed. Gate rejects.
3. Run mutation on the weak suite: `CMP_GE_GT` on the threshold survives. The report shows `SURVIVED`.
4. Show the candidate that asserts real output at the boundary. Gate accepts: passes, executes target, no MI findings.
5. Re-run mutation with the candidate: the boundary mutant changes to `KILLED_BY_ASSERTION`, with the exact test ID and outcome `ASSERTION_KILL` in evidence.
6. Show the merge: hand-written file hash identical before and after.
7. Show the report. Click the mutant to see the raw traceback reference in the run log.

### 11.5 Estimated Size

A rough, unvalidated estimate is 2,000 to 3,000 lines of Python including tests, excluding the benchmark cases. The team should measure its first week's throughput before committing to this estimate.

---

## 12. Architecture Decisions to Freeze Before Coding

Changing any item below after coding starts requires a written decision record and affects the schedule.

| # | Decision | Frozen value | Reason |
|---|---|---|---|
| D1 | Language and runner | Python 3.11+, pytest only | Narrow scope; widest demo value per hour |
| D2 | Evidence schema | `pt-evidence/1` as in Section 5 | All components depend on it |
| D3 | ID scheme | Content-addressed as in Section 5.1 | Reproducibility and deduplication |
| D4 | Outcome taxonomy | Section 6.3 enum, unchanged | Attribution logic and report depend on it |
| D5 | Mutant status set | Section 6.4 enum | Report wording depends on it |
| D6 | Operator set | Six operators in Section 6.2 | Benchmark design depends on it |
| D7 | Execution model | Disposable copy per run; per-mutant apply and revert with hash check | Integrity invariants |
| D8 | Per-test execution | Each candidate test run individually for attribution | Exact attribution |
| D9 | Generated file location | `tests/mockguard_generated/test_<module>_pt.py` only | Non-destructive merge |
| D10 | Rule IDs and confidence model | Section 7.2 | Findings and benchmark depend on them |
| D11 | Auto-repair policy | No automatic modification of failing candidates | Prevents expectation rewriting |
| D12 | AI boundary | AI produces candidate files only; gates decide | Core trust claim |
| D13 | Report source | HTML rendered only from `evidence.json` | INV-8 |
| D14 | Credit definition | Unique and shared kills reported together | Prevents overclaiming |
| D15 | Environment policy | Scrubbed environment; LLM keys never passed to test subprocesses | Secret protection |
| D16 | Dependency installation | Not performed by the tool | Removes T2 from MVP scope |
| D17 | CLI exit codes | 0 accepted and invariants pass; 1 candidate rejected; 2 invariant failure; 3 budget or runner failure | CI integration |
| D18 | Benchmark split | 30 dev and 30 held-out, rules tuned on dev only | Avoids overfitting claims |
| D19 | Competitor claims | Only claims verified in Section 2 may appear in materials | Credibility |
| D20 | Tools we depend on | None for mutation. Benchmark comparisons may use mutmut and fermut as external baselines | Own the core; compare externally |

---

## 13. Final Implementation Task List

Phases are ordered by dependency. Durations are relative, not hours, because the hackathon time budget has not been confirmed.

### Phase 0: Contracts (first, shared)

- T0.1 Write `pt-evidence/1` JSON schema and dataclasses. Owner: M4 with M2.
- T0.2 Write outcome and status enums. Owner: M2.
- T0.3 Write ID functions and tests for determinism. Owner: M4.
- T0.4 Write operator set v1 specification with examples. Owner: M2.
- T0.5 Write rule specifications MI-01, MI-02, AS-01 with exemptions. Owner: M1.
- T0.6 Write path guard and environment scrubbing specification. Owner: M3.
- T0.7 Freeze decision record D1 to D20. Owner: all, reviewed together.

### Phase 1: Foundations

- T1.1 Workspace copy, path guard, and hash utilities with tests for traversal and symlinks. Owner: M3.
- T1.2 AST symbol index and import resolution with unit tests for aliasing. Owner: M1.
- T1.3 Pytest runner with timeouts and JUnit parsing. Owner: M2.
- T1.4 Coverage contexts per test. Owner: M2.
- T1.5 Demo repository with planted faults and expected kills. Owner: M4.

### Phase 2: Inspection and Baseline

- T2.1 MI-01 and AS-01 rules with runtime confirmation hook. Owner: M1.
- T2.2 Baseline runs, flake quarantine, budget tracking. Owner: M2.
- T2.3 Evidence writer and ID integration. Owner: M4.

### Phase 3: Gates and Candidates

- T3.1 Static gate: parse, path allowlist, forbidden patch targets. Owner: M3.
- T3.2 Execution gate with target-executed check. Owner: M3.
- T3.3 Pre-recorded candidate fixtures with provenance; fallback provider. Owner: M3.
- T3.4 LLM provider adapter (optional path). Owner: M3.

### Phase 4: Mutation and Attribution

- T4.1 Operators CMP_GE_GT, BOOL_NOT, CONST_RETURN with apply and revert. Owner: M2.
- T4.2 Per-test per-mutant runner with outcome classification from traceback frames. Owner: M2.
- T4.3 Mutant status and credit computation. Owner: M2 with M3.
- T4.4 Fixture tests for attribution against known killing tests (INV-9). Owner: M2.

### Phase 5: Merge, Report, Invariants

- T5.1 Non-destructive merge into generated file only; hash checks (INV-1, INV-2). Owner: M3.
- T5.2 HTML renderer from JSON; numeric subset check (INV-8). Owner: M4.
- T5.3 CLI with exit codes (D17). Owner: M4.
- T5.4 Invariant test suite INV-1 through INV-9 in CI. Owner: M4.

### Phase 6: Benchmark and Demo

- T6.1 Author categories A to D first, dev split, with labels fixed before running. Owner: M1 and M3, second-person labelling.
- T6.2 Author categories E to I. Owner: M2 and M4.
- T6.3 Benchmark harness and confusion counts. Owner: M4.
- T6.4 Run dev split; tune only within rule specifications; record changes. Owner: M1.
- T6.5 Held-out run once per rule version; record results without edits. Owner: M4.
- T6.6 Demo script, clean-clone check, backup recording. Owner: M4, all review.

### Dependency Summary

Phase 0 blocks all. Phase 1 blocks 2 and 4. Phase 3 blocks 4 (candidates needed for attribution). Phase 5 blocks demo. Benchmark authoring (6.1, 6.2) can start after Phase 0 in parallel with Phase 1.

---

## 14. Team Allocation (3 to 4 members)

| Member | Primary ownership | Secondary ownership | Must not own |
|---|---|---|---|
| M1 Analysis | Symbol index, import resolution, MI and AS rules, rule specifications | Benchmark categories A to D | Mutation runner, report |
| M2 Mutation | Operators, runner, outcome classifier, attribution, status, credit | Benchmark category E and H | Merge, LLM adapter |
| M3 Generation and safety | Workspace, path guards, env scrubbing, gates, candidate fixtures, LLM adapter, merge | Benchmark category I | Rule logic, report |
| M4 Evidence and delivery | Schema, IDs, evidence writer, HTML report, CLI, invariant suite, demo, benchmark harness | Schema review for all | Rule logic, operator logic |

**Four-member mode:** as above.
**Three-member mode:** M3 absorbs CLI and invariant suite; M4 becomes schema, report, and demo; the benchmark is shared.

**Working rules:**
- Schema and enums are changed only through a reviewed pull request owned by M4 with M2 approval.
- Each module has tests written by its owner before integration.
- Daily integration at a fixed time. Demo path is kept green from Phase 2 onward.

---

## 15. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Trigger |
|---|---|---|---|---|---|---|
| R1 | Judges see the tool as "Stryker or PIT with an LLM" | High | High | Lead with the gate policy and evidence chain; show a live rejection; never claim mutation as novel | M4 | Any Q&A on mutation |
| R2 | Diffblue or other vendor shown to already do the same in Python | Medium | High | Verify Diffblue Python and methodology claims before the event; state the Python gap only if verified | M4 | Pre-event research |
| R3 | fermut or mutmut outperforms our engine | High | Low | We do not claim speed; benchmark against them honestly | M2 | Benchmark run |
| R4 | Rule false positives on valid mocks | Medium | High | Confidence tiers; negatives in benchmark; ship as warning when below threshold | M1 | Category B results |
| R5 | Attribution cost explodes | Medium | Medium | Candidate-set limits; per-mutant timeout; budget status INCONCLUSIVE | M2 | Demo repository run time |
| R6 | Flaky tests make attribution noisy | Medium | Medium | Three baseline runs; quarantine; fixed seed | M2 | Baseline disagreement |
| R7 | LLM unavailable or slow during demo | High | High | Pre-recorded candidates with provenance; live call optional | M3 | Day of demo |
| R8 | Demo fragility (environment, paths, Windows resource limits) | Medium | High | Demo runs on one OS image; clean-clone check; backup recording | M4 | Clean-clone check fails |
| R9 | Scope creep (languages, UI, contracts) | High | High | Section 11.3 scope-out list; decisions D1 and D16 | All | Any new feature request |
| R10 | Schema churn breaks integration | Medium | High | Freeze Phase 0; changes through reviewed PRs | M4 | Integration failure |
| R11 | Benchmark labels tuned to rules | Medium | High | Labels fixed before running; held-out split; single held-out run | M1, M4 | Dev split scores too high |
| R12 | Equivalent mutants misread as weak tests | High | Medium | Status SURVIVED without equivalence claim; HUMAN-EQUIV finding path | M2 | Judge question |
| R13 | Test code executes harmful actions on a judge's machine | Low | High | Demo repo only; env scrubbing; no dependency install; trusted-only flag | M3 | Arbitrary repo request |
| R14 | Windows resource limits unavailable | High | Low | Run demo on POSIX; document | M3 | Team on Windows |
| R15 | Team time insufficient for benchmark | Medium | Medium | Dev split first; held-out is small; report size honestly | All | Phase 6 start |
| R16 | Competitor claims in slides are wrong | Medium | High | Section 2 is the only source for slides; re-verify on the day | M4 | Slide review |
| R17 | Copying mutmut or fermut code | Low | High | Own implementation; cite as baselines only | M2 | Code review |
| R18 | Generated tests enshrine bugs | High | Medium | Stated as a known limit; reviewer step in report | M1 | Judge question |

---

## 16. Open Items Requiring Verification

1. **Diffblue mutation methodology:** what "designed to achieve high mutation testing scores" means, which mutation tool it uses, and whether this is documented.
2. **Diffblue Python support:** whether Python generation is generally available or preview, and its verification mechanism.
3. **Stryker per-test coverage and dry-run behaviour:** confirm in official Stryker docs (secondary sources only so far).
4. **PIT early-exit default and whether full kill matrix output is available as a setting.**
5. **mutmut per-test attribution options** via hooks, and whether its suspicious status has a documented definition.
6. **fermut benchmark methodology** and its mutator list.
7. **Qodo automatic test repair behaviour** in detail, including what it does when the fix does not match the stated behaviour.
8. **Copilot agent test validation:** whether any mutation or mock analysis exists in the Java modernization agent.
9. **Pythagora:** no action needed beyond the deprecation notice; do not cite as current.
10. **Scope of the hackathon's own judging criteria**, which may change which features matter.

---

## 17. References

**Stryker**
- Supported mutators: https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/
- Project site: https://stryker-mutator.io/
- Stryker.NET repository: https://github.com/stryker-mutator/stryker-net
- Stryker4s repository: https://github.com/stryker-mutator/stryker4s
- StrykerJS repository (secondary listing): https://dev.co/testing/open-source/stryker-js

**mutmut**
- Repository and README: https://github.com/boxed/mutmut (accessed through mirrors; verify the canonical URL)
- Usage and configuration summary (secondary): https://tessl.io/registry/testland/mutmut-mutation

**PIT**
- Basic concepts: https://pitest.org/quickstart/basic_concepts
- Repository: https://github.com/hcoles/pitest

**fermut**
- PyPI: https://pypi.org/project/fermut/

**Qodo**
- Test generation: https://docs.qodo.ai/qodo-documentation/qodo-gen/test-generation
- Managing test suites: https://docs.qodo.ai/qodo-documentation/qodo-gen/test-generation/organizing-and-managing-test-suites
- Using test generation features: https://docs.qodo.ai/qodo-documentation/qodo-gen/test-generation/using-test-generation-features

**Diffblue**
- Documentation index: https://cover-docs.diffblue.com/
- What is Diffblue Cover: https://docs.diffblue.com/get-started
- Marketing overview: https://diffblue.com/cover
- Platform page (marketing, includes pricing and benchmark claims): https://www.diffblue.com

**Pythagora**
- Repository (deprecated): https://github.com/Pythagora-io/pythagora

**GitHub Copilot**
- Writing tests with Copilot: https://docs.github.com/en/copilot/tutorials/write-tests
- Prompt files for unit tests: https://docs.github.com/copilot/tutorials/customization-library/prompt-files/generate-unit-tests
- Java unit test quickstart: https://learn.microsoft.com/en-us/azure/developer/github-copilot-app-modernization/quickstart-unit-tests

---

## 18. Status

**Specification complete for review.** No code, repository, branch, or deployment has been modified. The next step is team approval of the frozen decisions in Section 12, verification of the items in Section 16, and a decision on the hackathon time budget before Phase 0 begins.
