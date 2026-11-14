# MockGuard NIST SSDF-Oriented Mapping

NIST SSDF groups secure development into Prepare the Organization, Protect the Software, Produce Well-Secured Software, and Respond to Vulnerabilities. This is a planning map, not a certification.

| SSDF area | MockGuard control | Artifact |
|---|---|---|
| Prepare | owner roster, threat model, claims register, supported-version policy | `.brain/.work/shared/` |
| Protect | least-privilege CI, pinned actions, release permissions, package allowlist | workflow/release docs |
| Produce | tests, static analysis, mutation verification, schema validation, SBOM/provenance | CI and reports |
| Respond | security policy, disclosure channel, rollback, release notes, incident runbook | root/security docs |

Use SSDF as a risk-based planning framework, not a checklist that implies compliance.
