# MockGuard Gemini Integration Starter

This folder describes the optional Gemini provider boundary. It is a starter integration surface, not a claim that a working API call has already been implemented.

## Enablement

```bash
export GEMINI_API_KEY="..."
export MOCKGUARD_GEMINI_ENABLED=true
mockguard explain reports/run.json --provider gemini
```

The implementation must use the official Google GenAI SDK/API version selected by the team, validate structured output, respect the configured model, and preserve the deterministic report if the provider is unavailable.

## Safety

No automatic patch application, no full-repository upload by default, no tool/function calling, and no Gemini-controlled verdicts.
