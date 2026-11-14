# MockGuard Judge Demo: Step-by-Step Execution Path

**Repository**: [`https://github.com/adishxm/mockguard`](https://github.com/adishxm/mockguard)  
**HackMatrix Track**: Developer Tools & Security • **Build with Gemini**  
**Core Thesis**: *"A test can pass and show high coverage while failing to detect a real bug. MockGuard exposes that false confidence and uses Google Gemini to synthesize behavioral fixes."*  
**Total Target Presentation Duration**: 3 Minutes (180 seconds)

---

## Quick Reference / 1-Click Launch

| Environment | 1-Click Command | Manual Step-by-Step |
|---|---|---|
| **Windows PowerShell** | `.\demo.ps1` | Follow Acts 1, 2, and 3 below |
| **Linux / macOS Bash** | `./demo.sh` | Follow Acts 1, 2, and 3 below |
| **Interactive Slides** | `Start-Process .brain/.demo/presentation.html` | 8-slide pitch deck with live counters |

---

## Pre-Demo Checklist (60 Seconds Before Judging)

1. **Verify Terminal Location**: Ensure you are in the repository root:
   ```powershell
   cd C:\Users\adity\OneDrive\Desktop\HackMatrix
   ```
2. **Confirm CLI Shim**: Verify `mockguard` is recognized:
   ```powershell
   mockguard --version
   # Expected output: mockguard 0.1.0
   ```
   *(If not linked, run `npm link` once).*
3. **Reset Demo State to Weak Test**:
   ```powershell
   node demo-project/switch-to-weak.js
   ```

---

## Step-by-Step 3-Act Demo Path

```
   ┌─────────────────────────────────────────────────────────────┐
   │            ACT 1: THE AI MOCK ILLUSION (30s)                │
   │  Show weak AI test: passes 100% green but only checks mock  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │         ACT 2: MOCKGUARD EXPOSES THE ILLUSION (60s)         │
   │  mockguard baseline: PASS (1/1)                             │
   │  mockguard verify:   FAIL (0 killed, 3 survived)            │
   │  + Compulsory Google Gemini Advisory synthesis              │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │         ACT 3: APPLY GEMINI FIX & PROVE IT (60s)            │
   │  node demo-project/switch-to-strong.js                      │
   │  mockguard verify:   PASS (3 killed, 0 survived, 100% score)│
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │            CLOSING PITCH & JUDGE Q&A (30s)                  │
   └─────────────────────────────────────────────────────────────┘
```

---

### ACT 1: Show the Problem — The AI Mock Illusion (30 Seconds)

#### 🎙️ Presenter Script (Say to Judges):
> *"AI coding assistants can generate unit tests that achieve 100% line coverage and green checkmarks without actually testing application behavior. They mock external dependencies and only assert that the mock was invoked. If the underlying business logic breaks, the test still passes."*

#### 🖥️ Action & Inspection:
Show the production logic and the weak AI test side-by-side:

```powershell
# 1. View production business rule:
cat demo-project/src/checkout.ts
```
```typescript
export function checkout(paymentStatus: string): CheckoutResult {
  if (paymentStatus === "SUCCESS") {
    return { orderStatus: "CONFIRMED", fulfillmentEvent: true };
  }
  return { orderStatus: "CANCELLED", fulfillmentEvent: false };
}
```

```powershell
# 2. View AI-generated test:
cat demo-project/tests/checkout.test.ts
```
```typescript
test('processes successful payment', () => {
  const payment = jest.fn().mockReturnValue({ status: 'SUCCESS' });
  payment();
  expect(payment).toHaveBeenCalled(); // ⚠️ Only checks mock invocation!
});
```

#### 🎙️ Presenter Script:
> *"Notice: The test only checks `expect(payment).toHaveBeenCalled()`. It never checks whether `orderStatus` is `CONFIRMED` or if `fulfillmentEvent` was fired. Let's see what MockGuard does with this."*

---

### ACT 2: Run MockGuard Verification & Trigger Gemini Advisory (60 Seconds)

#### Step 2A: Run the Baseline
```powershell
mockguard baseline ./demo-project
```

#### 📋 Expected Output:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT          
======================================================
Verdict:         UNVERIFIED
Commit:          840afb0...
Baseline:        PASS (1/1 tests passed)
------------------------------------------------------
Sandbox status:  sandboxed: false (local execution)
======================================================
```

#### 🎙️ Presenter Script:
> *"Step 1 passes. The original test suite is completely green. Now let's run MockGuard's deep verification."*

---

#### Step 2B: Run Full Verification
```powershell
mockguard verify ./demo-project
```

#### 📋 Expected Output:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT          
======================================================
Verdict:         FAIL
Commit:          840afb0...
Baseline:        PASS (1/1 tests passed)
Mutation Score:  0%
Mutants:         0 killed, 3 survived, 0 timeouts

Findings:
  - [MEDIUM] CALL_ONLY_ASSERTION: Test 'processes successful payment' 
    relies solely on call/interaction assertions without verifying 
    return values, state changes, or negative side effects.
    at ..\tests\checkout.test.ts:14

------------------------------------------------------
🤖 GOOGLE GEMINI ADVISORY (Build with Gemini)
------------------------------------------------------
Advisory Engine: gemini-2.5-flash
Target Mutant:   M-d5a03415
Root Cause:      Test only checks expect(mock).toHaveBeenCalled() 
                 without inspecting return values, state changes, 
                 or business side effects.
Suggested Fix:   Replace interaction checks with state assertions 
                 verifying the observable outcome of the operation.
Remediation Snippet:
// Suggested Gemini Behavioral Fix:
const result = checkout("SUCCESS");
expect(result.orderStatus).toBe("CONFIRMED");
expect(result.fulfillmentEvent).toBe(true);
------------------------------------------------------
Sandbox status:  sandboxed: false (local execution)
======================================================
```

#### 🎙️ Presenter Script:
> *"Three critical things just happened:*
> 1. *MockGuard statically caught the `CALL_ONLY_ASSERTION` anti-pattern.*
> 2. *MockGuard injected deterministic mutations (flipping `===` to `!==` and boolean values in a sandbox). The weak test still passed, meaning **100% of mutants survived**! Verdict is FAIL.*
> 3. *Our compulsory **Google Gemini Advisory** engine immediately analyzed the surviving mutant and synthesized the exact behavioral fix needed to protect the code.*"

---

### ACT 3: Apply the Gemini Fix and Prove Defect Detection (60 Seconds)

#### Step 3A: Upgrade to Strong Behavioral Assertions
Apply the exact behavioral test synthesized by Gemini:
```powershell
node demo-project/switch-to-strong.js
```

Inspect the upgraded test:
```powershell
cat demo-project/tests/checkout.test.ts
```
```typescript
test('confirms the order after successful payment', () => {
  const result = checkout('SUCCESS');
  expect(result.orderStatus).toBe('CONFIRMED');
  expect(result.fulfillmentEvent).toBe(true);
});
```

---

#### Step 3B: Re-verify with MockGuard
```powershell
mockguard verify ./demo-project
```

#### 📋 Expected Output:
```text
======================================================
               MOCKGUARD VERIFICATION REPORT          
======================================================
Verdict:         PASS
Commit:          840afb0...
Baseline:        PASS (2/2 tests passed)
Mutation Score:  100%
Mutants:         3 killed, 0 survived, 0 timeouts
------------------------------------------------------
Sandbox status:  sandboxed: false (local execution)
======================================================
```

#### 🎙️ Presenter Script:
> *"Now the test verifies the observable outcome of the business logic. When MockGuard mutates that code, the test fails immediately, killing all 3 mutants. Mutation score is 100%. Verdict: PASS.*
>
> *MockGuard doesn't just measure whether code executed. It proves whether your tests can actually catch real bugs."*

---

## 30-Second Final Judge Pitch (Closing Statement)

> *"In the era of AI code generation, code coverage is a vanity metric. A test can execute 100% of lines by asserting mock calls and catch zero regressions.*
>
> *MockGuard bridges this trust deficit: it mathematically detects mock vacuity through static AST analysis and counterfactual mutation testing. When it finds a flaw, it uses Google Gemini to synthesize a real behavioral assertion and verifies that the fix kills the defect.*
>
> *Our MVP runs 100% offline or live with Google AI Studio, backed by a clean-room TypeScript architecture with 101 automated passing tests."*

---

## Judge Q&A Cheat Sheet

### Q1: "How is MockGuard different from traditional code coverage (Istanbul/c8)?"
> **Answer**: *"Code coverage only measures execution—whether the runtime stepped through a line. It provides zero proof of verification. A test with an empty body or a mock assertion can achieve 100% coverage without checking any values. MockGuard mutates the code on that line; if the test doesn't fail, MockGuard proves the test is ineffective."*

### Q2: "Are mocks always bad?"
> **Answer**: *"No. Mocks are valid and necessary at external boundaries: third-party payment gateways (Stripe/PayPal), external APIs, or network sockets. The problem is when a test asserts only that the mock was invoked and never checks the resulting application state, return value, or emitted domain event."*

### Q3: "What role does Google Gemini play?"
> **Answer**: *"MockGuard follows the principle: 'Gemini is the assistant, not the judge.' MockGuard uses deterministic math and AST analysis to detect the flaw and calculate the mutation score. Once isolated, Gemini (gemini-2.5-flash) acts as the advisory engine, explaining the root cause and generating the exact behavioral assertion. MockGuard then re-verifies the fix."*

### Q4: "What if there is no internet during our demo?"
> **Answer**: *"MockGuard has built-in offline resiliency. If `GEMINI_API_KEY` or network access is absent, it seamlessly activates its local Gemini prompt-synthesis engine. The demo project runs 100% offline with zero external dependencies."*

### Q5: "What are your immediate next steps?"
> **Answer**:
> 1. *Automated GitHub Action PR bot with SARIF reports and inline line-comment annotations.*
> 2. *Vitest and Node native test runner adapters.*
> 3. *Incremental Git-diff mutation testing to verify PRs in sub-30 seconds.*

---

## Fallback Paths & Artifacts

- **Automated PowerShell Script**: [`demo.ps1`](file:///c:/Users/adity/OneDrive/Desktop/HackMatrix/demo.ps1)
- **Automated Bash Script**: [`demo.sh`](file:///c:/Users/adity/OneDrive/Desktop/HackMatrix/demo.sh)
- **Interactive HTML Slide Deck**: [`.brain/.demo/presentation.html`](file:///c:/Users/adity/OneDrive/Desktop/HackMatrix/.brain/.demo/presentation.html)
- **Production Enterprise Fixture**: [`fixtures/order-service`](file:///c:/Users/adity/OneDrive/Desktop/HackMatrix/fixtures/order-service)
- **GitHub Repository**: [`https://github.com/adishxm/mockguard`](https://github.com/adishxm/mockguard)

