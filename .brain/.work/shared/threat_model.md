# MockGuard Threat Model

## Assets

- Source code and tests under analysis.
- Test output and environment metadata.
- Report integrity and provenance.
- Developer trust in findings.

## Threats

1. Arbitrary test command executes destructive code.
2. Generated test or source content injects instructions into an optional LLM.
3. A timeout is misclassified as a surviving mutant.
4. A static heuristic creates a false hard failure.
5. A report hides excluded or equivalent mutants.
6. A generated suggestion edits unrelated files.
7. Secrets leak into captured output.
8. An AI-written test games the analyzer with superficial assertions.

## Controls

- Explicit command/config boundary.
- Timeouts and output caps.
- No package installation by default.
- LLM receives bounded context and has no tools.
- Schema validation and abstention.
- Patch-only suggestions with human review.
- Redaction where practical.
- Independent mutation result is required for high-confidence correlation.
- Capability ledger prohibits unsupported public claims.

## Hackathon boundary

The local CLI is not a hardened multi-tenant sandbox. The README must state this clearly.
