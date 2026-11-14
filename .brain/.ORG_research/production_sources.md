# Production source notes

| Source | URL | Design consequence |
|---|---|---|
| npm provenance | https://docs.npmjs.com/generating-provenance-statements | Use clean CI and provenance for public package releases; provenance is not a malicious-code guarantee. |
| SARIF | https://sarifweb.azurewebsites.net/ | Use SARIF 2.1.0 only after schema validation; JSON and terminal remain the first stable outputs. |
| NIST SSDF | https://csrc.nist.gov/Projects/ssdf | Organize secure development as prepare, protect, produce, and respond; do not claim certification. |
| OpenTelemetry primer | https://opentelemetry.io/docs/concepts/observability-primer/ | Use structured local diagnostics and define SLIs/SLO candidates before optional telemetry. |
| GitHub Actions hardening | https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions | Least privilege, untrusted PR isolation, secret handling, and pinned actions are release gates. |
