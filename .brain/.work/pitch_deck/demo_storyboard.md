# MockGuard 3-Minute Video Demo Storyboard & Pitch Script

**Problem Statement**: HackMatrix PS #41 (*"AI-generated tests test the mock, not the code"*)  
**Format**: 3-Minute Video / Stage Pitch Demo  
**Command to Run on Screen**: `npm run demo`

---

## Storyboard Timeline & Cues

```
[0:00 - 0:35]  HOOK: The AI Mock Illusion
[0:35 - 1:05]  ACT 1 & 2: The Weak Test & Static AST Rule Detection
[1:05 - 1:45]  ACT 3: Counterfactual Mutation Proof (0% Score, Mutants Survive)
[1:45 - 2:20]  ACT 4: Google Gemini Advisory Bridge (Build with Gemini)
[2:20 - 2:45]  ACT 5: The Behavioral Test (100% Mutants Killed)
[2:45 - 3:00]  ACT 6 & CONCLUSION: Production Trust & Evidence Artifacts
```

---

### Segment 1: The Hook (0:00 - 0:35)

- **Visual**: Slide 1 ("AI-generated tests test the mock, not the code") $\to$ Split screen of VS Code showing `order-service.ts` and `order-service.weak.test.ts`.
- **Speaker**:  
  > *"Every engineering team is adopting AI coding assistants to generate unit tests. Code coverage shoots up to 100%, pull requests turn green, and CI passes. But there is a silent disaster lurking in production: AI agents frequently write tests that verify their own mock setups rather than the real business logic.  
  > If a test passes only because your mock returned true, you don't have a test suite — you have a mock illusion.  
  > We built **MockGuard** to mathematically expose and fix this problem."*

---

### Segment 2: The Weak Test & Static AST Detection (0:35 - 1:05)

- **Visual**: Terminal showing Act 1 and Act 2 of `npm run demo`.
- **Speaker**:  
  > *"Here is a real order payment service. The business rules are clear: payments must transition to 'PAID', emit an 'ORDER_FULFILLED' event, and reject duplicate payments.  
  > An AI assistant generated this test. When we run it, Jest reports 100% green!  
  > But MockGuard's static AST inspection immediately flags finding `[MG-RULE-001]`: this test asserts ONLY that `gateway.charge` was called. It makes zero assertions on the resulting order status or domain events."*

---

### Segment 3: Deterministic Mutation Testing (1:05 - 1:45)

- **Visual**: Terminal showing Act 3 of `npm run demo`.
- **Speaker**:  
  > *"Static analysis gives suspicion; mutation testing gives mathematical proof.  
  > MockGuard spins up an isolated sandbox and injects three deterministic mutants into the business logic: we flip a boundary check, delete the status transition, and omit the fulfillment event.  
  > If the test were actually verifying the code, it would fail. But when MockGuard runs the suite... all three mutants SURVIVE!  
  > The test still passes despite broken business logic. MockGuard exits with code 1 and a 0.0% mutation score. The mock illusion is mathematically proven."*

---

### Segment 4: Google Gemini Advisory Bridge (1:45 - 2:20)

- **Visual**: Terminal showing Act 4 of `npm run demo` and Google AI Studio logo.
- **Speaker**:  
  > *"Now, how do we fix it? We integrated Google AI Studio's Gemini API under the 'Build with Gemini' track.  
  > But our architectural principle is strict: **Gemini is the assistant, not the judge.**  
  > Gemini analyzes the AST structure and surviving mutants, explains the exact root cause, and synthesizes candidate behavioral assertions.  
  > Notice the safety controls: MockGuard marks the response `verified: false, needsHumanReview: true`. Gemini proposes the fix, but Gemini cannot certify the fix."*

---

### Segment 5: The Behavioral Test & Kill Verification (2:20 - 2:45)

- **Visual**: Terminal showing Act 5 of `npm run demo`.
- **Speaker**:  
  > *"The developer applies the behavioral assertions. The test now verifies that `order.status` is 'PAID', the transaction ID matches, and the 'ORDER_FULFILLED' event was emitted.  
  > When MockGuard re-runs the mutation engine: Mutant 1 is KILLED! Mutant 2 is KILLED! Mutant 3 is KILLED!  
  > Verification passes with 100% mutation score and exit code 0. Real business behavior is now protected."*

---

### Segment 6: Production Trust & Conclusion (2:45 - 3:00)

- **Visual**: Terminal showing Act 6 with file links to `dist/report.json`, `dist/mockguard.spdx.json`, and `dist/SHA256SUMS.txt`.
- **Speaker**:  
  > *"MockGuard is built for enterprise production: zero network leakage for core analysis, native child process supervision with hard timeouts and 10MB bounds, SPDX 2.3 SBOM generation, cryptographic SHA-256 provenance, and a full GitHub Actions CI matrix.  
  > Don't trust green checks that test mocks. Use MockGuard to prove your code actually works. Thank you!"*
