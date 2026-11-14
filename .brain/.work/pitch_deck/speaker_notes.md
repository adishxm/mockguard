# MockGuard Speaker Notes & Presentation Script (HackMatrix PS #41)

> **Total Timebox**: 3 minutes (180 seconds)  
> **Target Audience**: Hackathon Judges, Engineering Leaders, DevSecOps Architects  
> **Core Wedge**: "AI-generated tests test the mock, not the code."

---

## Stage Timing & Slide-by-Slide Script

### Slide 1: Problem Statement #41 — The False Green Trap (0:00 – 0:25)
- **Visual**: Side-by-side comparison of 100% Code Coverage badge vs. broken business logic.
- **Spoken Script**:
  > "Hello judges. Today, developers use AI assistants like Copilot and Cursor to generate hundreds of unit tests in seconds. These tests pass, and your CI dashboard lights up 100% green with 100% line coverage.
  > But here is the silent crisis: AI coding tools frequently write tests that assert *solely against their own mock configurations* rather than real application behavior. The test verifies that the mock was called—and completely ignores whether the code actually worked."
- **Stage Cue**: Point to the mock-only assertion `expect(mockCharge).toHaveBeenCalledWith(50)`.

---

### Slide 2: Why Code Coverage Is Not Enough (0:25 – 0:50)
- **Visual**: Diagram contrasting *Execution Evidence* (Coverage) vs *Behavioral Counterfactual* (Mutation Testing).
- **Spoken Script**:
  > "Code coverage only answers: *Did the interpreter touch this line?* It does NOT answer: *If this line is wrong, will any test fail?*
  > When an AI test mocks internal services and asserts only mock parameters, code coverage is 100%, but behavioral protection is 0%. If production state transitions break or domain events are dropped, the test still passes. You merge a false sense of security."

---

### Slide 3: Introducing MockGuard (0:50 – 1:10)
- **Visual**: MockGuard dual-engine architecture: Static AST Pattern Rules + Controlled AST Mutation Testing.
- **Spoken Script**:
  > "Introducing **MockGuard**—a local-first developer tool and CI guardrail built for HackMatrix Problem Statement #41.
  > MockGuard does two things:
  > First, its conservative TypeScript AST engine statically flags suspicious mock-only assertions without guessing.
  > Second, it injects deterministic code mutations into an isolated temporary copy of your source code to prove mathematically whether your tests actually catch regressions."

---

### Slide 4: The Core Verification Pipeline (1:10 – 1:30)
- **Visual**: Step-by-step pipeline flowchart: Baseline Jest Run $\to$ AST Scan $\to$ Bounded AST Mutation $\to$ Attribution $\to$ Report.
- **Spoken Script**:
  > "Our pipeline enforces strict production invariants:
  > 1. **Baseline Invariant**: The test suite must pass unmutated. If baseline fails, mutation is blocked immediately to avoid false attributions.
  > 2. **Deterministic Mutators**: 4 safe AST operators—Boolean flips, comparison swaps, numeric boundary mutations, and primitive returns.
  > 3. **Process Supervision**: Child runners execute under strict 60-second timeouts, 10MB output buffers, and safe environment variable whitelists.
  > 4. **Git Delta Comparator**: `mockguard compare` uses isolated Git worktrees to compare PRs against base commits without touching uncommitted changes."

---

### Slide 5: Live Proof — The Weak AI Test (1:30 – 1:55)
- **Visual**: Terminal output running `mockguard verify fixtures/order-service --testMatch "**/order-service.weak.test.ts"`.
- **Spoken Script**:
  > "Here is our live demonstration on `OrderService`.
  > Under the weak AI-generated test, Jest reports 100% green. But when MockGuard runs verification:
  > **3 mutants SURVIVE.**
  > The mutation score is only 40%. The test verified `mockCharge.toHaveBeenCalledWith(50)`, but when we mutated order status transitions and event fulfillment, the AI test still passed. MockGuard caught this false-green test and exited with code 1, blocking the pull request."

---

### Slide 6: The Behavioral Fix — Strong Test (1:55 – 2:20)
- **Visual**: Terminal output running `mockguard verify fixtures/order-service --testMatch "**/order-service.strong.test.ts"`.
- **Spoken Script**:
  > "Now, we run MockGuard against the behavioral test suite that asserts post-condition state transitions and emitted domain events.
  > Running `mockguard verify`:
  > **100% mutation score. 5 out of 5 mutants KILLED.**
  > The test failed on every single logic corruption. MockGuard outputs a green verdict with exit code 0."

---

### Slide 7: Production Trust & Build with Gemini (2:20 – 2:45)
- **Visual**: Gemini Advisory Card + Security & Release Badges (101 Passing Tests, SPDX SBOM, CodeQL SAST).
- **Spoken Script**:
  > "For remediation, we integrated **Google Gemini 2.5 Flash** via Google AI Studio. Gemini inspects the surviving mutant and weak mock to suggest real behavioral assertions. But under our strict governance, Gemini is strictly advisory—it never decides a test pass verdict.
  > MockGuard is production-ready today:
  > - **101 automated tests passing** across Node 18, 20, and 22.
  > - **SPDX 2.3 SBOM** and cryptographic SHA-256 release digests.
  > - **100% offline local-first core** with zero telemetry and automatic secret redaction."

---

### Slide 8: The Conclusion (2:45 – 3:00)
- **Visual**: Summary card and GitHub repository QR code (`adishxm/mockguard`).
- **Spoken Script**:
  > "In the era of AI-generated code, passing tests are no longer proof of quality.
  > **MockGuard verifies whether your tests protect real behavior—not just your mocks.**
  > Thank you, and we welcome your questions!"

---

## Quick Judge Q&A Cheat Sheet

| Question | 10-Second Answer |
|---|---|
| **Why not just use Stryker?** | Stryker is a heavy, general-purpose mutation runner. MockGuard is a targeted developer CLI purpose-built for PS #41 that correlates static mock antipatterns with surviving mutants and provides AI-assisted remediation. |
| **Does MockGuard automatically edit developer code?** | Never. MockGuard enforces human-in-the-loop review. It suggests behavioral assertions, but never overwrites source files. |
| **Is mutation testing too slow for CI?** | MockGuard mutates only target files under `--include` or `--changed` with bounded mutant caps (default 20), completing runs in 10–25 seconds. |
| **Does Gemini decide if a test passes?** | Never. The deterministic test runner and mutant survival evidence are the sole authorities. Gemini suggestions are marked `needsHumanReview: true`. |
