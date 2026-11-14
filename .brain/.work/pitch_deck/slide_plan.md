# MockGuard Pitch Deck Plan & Slide Architecture

**Target**: HackMatrix PS #41 ("AI-generated tests test the mock, not the code")  
**Tracks**: Developer Tools, CI/CD & Open Source + Build with Gemini  
**Total Slides**: 8 slides  
**Format**: 16:9 widescreen  

---

## Slide 1: The False Green Trap
- **Headline**: The Illusion of Green Tests
- **Subtitle**: AI coding assistants generate 100% code coverage that tests mocks, not your code.
- **Visuals**:
  - Code block showing `order-service.weak.test.ts`:
    ```typescript
    const mockCharge = jest.fn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
    const service = new OrderService(mockCharge, mockEvents);
    await service.processOrder('order-123', 50);
    // ⚠️ THE MOCK TRAP: Only checks mock call, zero state or event checks!
    expect(mockCharge).toHaveBeenCalledWith(50);
    ```
  - Badges: `100% Code Coverage` (Green) $\leftrightarrow$ `0% Behavioral Verification` (Red).

---

## Slide 2: Why Code Coverage Fails
- **Headline**: Coverage is Execution, Not Verification
- **Key Points**:
  - **Line Coverage**: Tells you the line ran during test execution.
  - **The Blindspot**: If the line has incorrect business logic, an assertion testing the mock will still pass 100% green.
  - **The Counterfactual Solution**: Intentionally mutating production logic to see if any test catches the fault.

---

## Slide 3: Introducing MockGuard
- **Headline**: MockGuard: Test the Code, Not the Mock
- **Subtitle**: Developer Tool & CI Guardrail for Problem Statement #41
- **Core Pillars**:
  1. **Conservative Static AST Analysis**: Detects mock-only assertion patterns without guessing.
  2. **Deterministic Mutation Engine**: Injects 4 safe AST operators to verify behavior.
  3. **Git PR Revision Comparator**: `mockguard compare --base <ref>` blocks mock-heavy regressions.
  4. **Build with Gemini**: AI-guided remediation with strict human-in-the-loop review.

---

## Slide 4: Verification Pipeline Architecture
- **Headline**: Deterministic, Safe, Bounded Execution
- **Pipeline Workflow**:
  ```text
  [1. Discover Project] ──► [2. Baseline Jest Run] ──► [3. Static AST Rules]
                                     │ (Pass)
                                     ▼
  [Report & Findings] ◄── [5. Attribution Engine] ◄── [4. AST Mutation Loop]
  ```
- **Execution Invariants**:
  - Baseline must pass before mutation starts.
  - Original code is never modified (isolated temporary copy per execution).
  - Bounded process supervision (60s timeout, 10MB output cap, safe environment whitelist).

---

## Slide 5: Live Proof — The Weak AI Test (Mutants Survive)
- **Headline**: Live Proof: Weak AI Test Caught
- **Fixture**: `fixtures/order-service`
- **Command**:
  ```bash
  mockguard verify fixtures/order-service --testMatch "**/order-service.weak.test.ts"
  ```
- **Results**:
  - Baseline: **PASS (100% green)**
  - Static Scan: `[MG-RULE-001] Mock-Only Assertion Detected` (Confidence: 0.95)
  - Mutation: **3 Mutants SURVIVED** (40% mutation score)
  - Verdict: **`FAIL` (Exit Code 1) — PR Blocked**

---

## Slide 6: The Behavioral Fix — Strong Test (100% Killed)
- **Headline**: Restoring Confidence with Behavioral Assertions
- **Command**:
  ```bash
  mockguard verify fixtures/order-service --testMatch "**/order-service.strong.test.ts"
  ```
- **Behavioral Assertions**:
  ```typescript
  expect(service.status).toBe('PAID');
  expect(service.isFulfilled).toBe(true);
  expect(service.transactionId).toBe('txn-999');
  expect(emittedEvents).toContainEqual({ event: 'ORDER_FULFILLED', ... });
  ```
- **Results**:
  - Mutation Score: **100% (5 out of 5 mutants KILLED)**
  - Verdict: **`PASS` (Exit Code 0) — CI Gate Green**

---

## Slide 7: Production Readiness & Build with Gemini
- **Headline**: Enterprise-Grade Security & Google AI Studio Integration
- **Build with Gemini**:
  - Native integration with `gemini-2.5-flash` to diagnose surviving mutants and draft behavioral assertions.
  - Strict governance: Gemini suggestions are labeled `needsHumanReview: true` and never decide verdicts.
- **Enterprise Controls**:
  - **101 Automated Tests**: 100% passing across Node 18.x, 20.x, and 22.x.
  - **CodeQL SAST**: GitHub Advanced Security certified clean.
  - **SPDX 2.3 SBOM & SHA-256 Checksums**: Verifiable supply-chain provenance.
  - **Zero Telemetry**: Operates completely local-first with automated canary secret redaction.

---

## Slide 8: The Conclusion
- **Headline**: Stop Merging Mock Illusions
- **Call to Action**:
  - Install: `npm install -g mockguard`
  - GitHub: [`https://github.com/adishxm/mockguard`](https://github.com/adishxm/mockguard)
- **Tagline**:
  > *"Verify whether AI-generated tests protect real behavior — not just mocks."*
