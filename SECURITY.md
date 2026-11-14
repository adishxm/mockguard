# MockGuard Security Policy

MockGuard is a developer tool that analyzes test suites and verifies behavioral guarantees through mutation testing. This document establishes our security boundary, disclosure procedure, and operational SLAs.

---

## 1. Execution Boundary & Trust Model

MockGuard executes test commands from a user-selected repository. 
- **Local Developer Tool**: MockGuard is designed to be run within trusted local or dedicated CI environments. It does not provide a multi-tenant sandbox against hostile, arbitrary code execution inside target test suites.
- **Process Guardrails**: Child processes spawned by MockGuard enforce strict wall-clock timeouts (default 60s), memory/output buffer caps (10MB default), clean tree cancellation (`SIGTERM`/`SIGKILL`), and an isolated environment variable whitelist (`safeEnv`).
- **Zero Telemetry Guarantee**: MockGuard never transmits source code, AST structures, test outputs, or mutation results to any external or remote telemetry servers by default.

---

## 2. Reporting a Vulnerability

We welcome responsible security reports from researchers and contributors.

### Disclosure Channels
- **GitHub Security Advisory**: Submit reports privately via the repository's **Security** tab -> **Report a vulnerability**.
- **Issue Template**: Alternatively, utilize [`.github/ISSUE_TEMPLATE/security_report.yml`](./.github/ISSUE_TEMPLATE/security_report.yml).

### What to Include
Please provide:
1. Affected MockGuard version and environment (Node version, OS).
2. Minimal reproduction steps or config payload (do **not** include sensitive private source or real production tokens).
3. The specific boundary breach or security impact observed.

---

## 3. Vulnerability Response SLA

Our maintainers adhere to the following response timeline:

| Stage | Target SLA |
|---|---|
| **Initial Acknowledgment** | Within 48 hours |
| **Severity Assessment & Triage** | Within 5 business days |
| **Patch Development & Testing** | Within 14 business days (Critical) / 30 business days (Medium) |
| **Public Advisory & Release** | Coordinated with reporter following patch verification |

---

## 4. Supply Chain & Packaging Integrity

- All public distributions are built exclusively from clean CI checkouts with locked dependencies (`npm ci`).
- Releases include standard SPDX 2.3 Software Bill of Materials (`mockguard.spdx.json`).
- Published npm tarballs are strictly verified to contain only compiled distribution artifacts (`dist/src/`) and essential license/governance documents.
