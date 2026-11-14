# MockGuard Gemini Rate and Cost Policy

Google documents Gemini limits across requests per minute, tokens per minute, and requests per day, with model/project/tier variation. MockGuard must treat limits as dynamic configuration, not hard-coded guarantees.

## Defaults

- Disabled unless explicitly enabled.
- Maximum 3 requests per run.
- One retry for transient 429/5xx responses with bounded backoff.
- Hard per-request timeout.
- Maximum input bytes and output tokens.
- Circuit breaker after repeated provider failures.
- Never retry authentication, policy, validation, or malformed-request errors.
- Deterministic report remains usable after provider failure.

## Budget telemetry

Record request count, approximate input/output tokens when returned, model identifier, latency, and provider status. Do not store API keys.

## Hackathon mode

Use Gemini only for one or two visible advisory steps in the demo. The demo must work with the key absent and the network disabled.
