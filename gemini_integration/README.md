# MockGuard Gemini Integration (Build with Gemini)

This module implements the **Google Gemini Advisory Provider** for MockGuard, designed specifically for HackMatrix PS #41 and the MLH **"Build with Gemini"** sponsor track.

---

## 1. Value Proposition: "The Assistant, Not The Judge"

MockGuard mathematically detects when AI-generated unit tests test their mocks instead of real business code.

Once MockGuard isolates a surviving mutant or mock illusion, **Google Gemini** is invoked as an intelligent advisory assistant:
1. **Root Cause Extraction**: Analyzes why the mock assertion bypassed the underlying code.
2. **Behavioral Assertion Synthesis**: Generates an executable assertion that verifies real application contracts.
3. **Verification Loop**: MockGuard re-runs the mutant against the suggested test to mathematically prove whether Gemini's fix kills the mutant.

---

## 2. Quickstart & Live Demo

### Step 1: Configure Your API Key
Set your Google AI Studio API key in your environment:

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY = "your-api-key"
```

```bash
# macOS / Linux
export GEMINI_API_KEY="your-api-key"
```

### Step 2: Run the Gemini Advisory Bridge
Execute the live advisory CLI:

```bash
npm run gemini:advisory
```

Example Output:
```text
============================================================
🤖 MockGuard + Google Gemini Advisory Bridge (Build with Gemini)
============================================================

🔍 [MockGuard]: Deterministic mutant survival detected:
   Mutant: "amount <= 0" replaced with "amount < 0"
   Status: SURVIVED (Test asserts mock interaction, not code behavior)

📡 [Gemini API]: Querying Google AI Studio (gemini-2.5-flash)...
✅ [Gemini API]: Advisory response received in 1460ms!

------------------------------------------------------------
💡 GEMINI ADVISORY ROOT CAUSE:
------------------------------------------------------------
The test directly mocks the 'gateway.charge' method and asserts that it was invoked. This bypasses the PaymentProcessor's internal logic, including its error handling for invalid amounts, and only confirms interaction with the mock, not the SUT's behavior.

------------------------------------------------------------
🛠️  SUGGESTED BEHAVIORAL ASSERTION (KILLS THE MUTANT):
------------------------------------------------------------
expect(processor.execute(0)).rejects.toThrow('Invalid amount');

------------------------------------------------------------
📊 VERIFICATION & HUMAN-IN-THE-LOOP SAFETY:
------------------------------------------------------------
- Verified Status:     NO (Independent verification required)
- Human Review Gate:   REQUIRED
- Model:               gemini-2.5-flash-lite
- Tokens Consumed:     Prompt: 426, Output: 267
------------------------------------------------------------
```

---

## 3. Architecture & Safety Invariants

- **Zero-Dependency Native Transport**: Uses Node.js 18+ native `fetch` — no external SDK vulnerabilities or supply chain bloat.
- **Model Fallback Chain**: Automatically cascades from `gemini-2.5-flash` to `gemini-2.5-flash-lite` and `gemini-flash-latest` during network spikes or high demand (503/429).
- **Security & Privacy Guard**: Input byte limits and timeout bounding prevent runaway costs and buffer overflow attacks.
- **Human-in-the-Loop Gate**: All Gemini output is tagged with `verified: false` and `needsHumanReview: true`. Gemini never dictates test verdicts.
