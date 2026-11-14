# MockGuard Gemini Integration Plan

## Purpose

Use Gemini to provide bounded, optional assistance after MockGuard has collected deterministic evidence. Gemini may explain a finding, propose a behavior-level assertion, summarize a mutant, or draft a candidate test patch. Gemini must not decide that a test is correct, suppress a finding, mark a mutant killed, or publish a score.

## MLH resource

The MLH page at http://mlh.link/gemini links to Gemini API documentation, AI Studio, quickstarts, cookbook examples, student/credit programs, and model resources. It is a resource and access page, not a technical API contract. The implementation contract comes from Google’s current Gemini API documentation.

## Modes

### Mode A — Explain

Input: one finding, one related mutant, relevant source/test excerpts, and report metadata. Output: a concise explanation with explicit uncertainty.

### Mode B — Suggest assertion

Input: surviving mutant diff, current test, public behavior contract if available. Output: one or more candidate assertions in structured JSON.

### Mode C — Draft patch

Input: bounded test file and evidence. Output: a patch proposal only. The patch is never applied automatically.

### Mode D — Judge/pitch summary

Input: already approved report artifacts. Output: a plain-language explanation for the deck or demo. This mode must never invent metrics.

## Hard boundary

The Gemini provider is a suggestion service. The deterministic pipeline remains:

`static analysis → baseline → mutation → classification → correlation → Gemini assistance → re-run verification`

A Gemini output becomes a product result only after the proposed change is reviewed and the independent MockGuard pipeline verifies it.

## Provider interface

- `explainFinding(input) -> Explanation`
- `suggestAssertions(input) -> SuggestionSet`
- `draftPatch(input) -> PatchProposal`
- `summarizeEvidence(input) -> EvidenceSummary`

Every method returns provider/model/version, request ID if available, input redaction mode, token/cost metadata when available, structured output validity, and a `verified: false` flag until the runner rechecks the result.

## Integration sequence

1. Add provider interface and a disabled-by-default no-op provider.
2. Add Gemini provider behind `MOCKGUARD_GEMINI_ENABLED=true`.
3. Implement bounded context builder and redaction.
4. Request structured output using a versioned JSON schema.
5. Validate and reject malformed output.
6. Show the suggestion in the report as advisory.
7. Apply no patch automatically.
8. Re-run baseline and mutation checks on a user-reviewed patch.
9. Measure usefulness, acceptance, verification, and unsafe-output rates.

## Configuration sketch

```json
{
  "ai": {
    "enabled": false,
    "provider": "gemini",
    "model": "<pinned-supported-model>",
    "mode": "suggest-assertion",
    "maxInputBytes": 24000,
    "maxOutputTokens": 1200,
    "timeoutMs": 20000,
    "maxRequestsPerRun": 3,
    "sendSourceByDefault": false,
    "requireUserConfirmationBeforeSend": true,
    "applyPatchesAutomatically": false
  }
}
```

The model name remains a configuration value because Google’s available models and recommended API surfaces change. Do not hard-code an unverified future model name into the product.
