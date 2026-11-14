# MockGuard Comprehensive Demo Scope & Showcase

**Problem Statement**: HackMatrix PS #41 (*"AI-generated tests test the mock, not the code"*)  
**Track Alignment**: Core Open Source Developer Tooling + **Build with Gemini** (Google AI Studio)

---

## 1. Required Story & Demonstration Arc

MockGuard proves that high code coverage and green tests can be an illusion when AI agents write tests that merely verify mock setups.

The demo follows a structured 6-Act arc:
1. **Act 1: The False Confidence**: A weak AI-generated test (`order-service.weak.test.ts`) passes 100% green against an Order & Payment service by asserting only mock calls (`expect(mockCharge).toHaveBeenCalled()`).
2. **Act 2: Static AST Analysis**: MockGuard statically inspects the test AST, flagging `[MG-RULE-001]` (Mock-Only Assertion) with 0.95 confidence.
3. **Act 3: Counterfactual Mutation Proof**: MockGuard injects 3 deterministic mutants (boundary check flip, state transition deletion, event emission deletion). All 3 mutants **SURVIVE** (0% mutation score, Exit Code 1).
4. **Act 4: Google Gemini Advisory Fix**: Google AI Studio Gemini API (`gemini-2.5-flash`) diagnoses the mock illusion and synthesizes a candidate behavioral assertion.
5. **Act 5: The Behavioral Test**: The improved test (`order-service.strong.test.ts`) asserts observable business outcomes. Re-running MockGuard **KILLS 100% OF MUTANTS** (100% score, Exit Code 0).
6. **Act 6: Enterprise Release & Evidence Manifest**: Inspects the generated run report, SPDX 2.3 SBOM, SHA-256 checksums, and process supervisor safety controls.

---

## 2. Stage-Safe Demo Commands

### The 1-Command Automated Showcase (Recommended)
```bash
npm run demo
```
*Runs the full, beautifully narrated 6-Act interactive demonstration in ~15 seconds with ANSI color output.*

### The Live Gemini Advisory Command
```powershell
$env:GEMINI_API_KEY = "your-api-key"
npm run gemini:advisory
```

### The Individual Fixture Commands
```bash
# Baseline Weak Test
npx jest fixtures/order-service/order-service.weak.test.ts

# Behavioral Strong Test
npx jest fixtures/order-service/order-service.strong.test.ts
```

---

## 3. Demo Fixture Details (`fixtures/order-service/`)

| File | Role | Key Characteristics |
|---|---|---|
| [`order-service.ts`](../../fixtures/order-service/order-service.ts) | System Under Test (SUT) | Implements order payment, status transitions (`PENDING` $\to$ `PAID`), duplicate payment checks, and `ORDER_FULFILLED` event emission. |
| [`order-service.weak.test.ts`](../../fixtures/order-service/order-service.weak.test.ts) | Weak AI Test (Teaching Fixture) | Passes against original, but asserts ONLY `expect(mockCharge).toHaveBeenCalled()`. Allows all mutants to survive. |
| [`order-service.strong.test.ts`](../../fixtures/order-service/order-service.strong.test.ts) | Strong Behavioral Test | Asserts post-condition state (`status === 'PAID'`), emitted events (`ORDER_FULFILLED`), boundary error checks (`amount <= 0`), and kills all mutants. |

---

## 4. Demo Constraints & Safety

- **Time Limit**: Under 3 minutes total execution.
- **Offline Resilient**: Works completely offline without network or external services (Gemini is strictly advisory).
- **Zero Secret Leakage**: No API keys or credentials stored on disk; live API key passed strictly via environment variables.
