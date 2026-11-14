# MockGuard Gemini Threat Model

## Assets

Source code, tests, secrets accidentally present in output, proprietary business logic, API key, usage budget, report integrity, and developer trust.

## Threats and controls

| Threat | Control | Residual risk |
|---|---|---|
| Source code leaves the machine unexpectedly | disabled by default; explicit opt-in; context preview; redaction | user can still consent to sending sensitive code |
| API key leaks | environment/secret manager only; never config/JSON report/logs | local environment compromise remains out of scope |
| Prompt injection in source/test comments | delimit untrusted code; treat as data; no tool access | model can still produce unsafe text |
| Model invents a claim | structured output; evidence-only prompt; claim validator | hallucination is possible; never use as verdict |
| Model suggests a harmful patch | patch proposal only; human review; independent tests/mutation | reviewer can accept a bad patch |
| Cost/rate-limit exhaustion | per-run request/token/time budgets; retry cap; circuit breaker | provider availability varies |
| Provider outage | no-op fallback; deterministic report remains complete | no AI explanation in that run |
| Sensitive data in pitch | only approved report artifacts go to summary mode | human sharing error |

## Non-negotiable controls

- No function calling, code execution, browser tools, or remote agent environment in the MVP integration.
- No sending full repositories by default.
- No automatic code edits.
- No Gemini-generated score or verdict.
- No logging of raw prompts/responses unless explicitly enabled for a local test fixture.
