# MockGuard Worker Boundary & Cross-Domain Isolation Policy

## Purpose
Ensure that individual workers and agents operate strictly within their allocated domains, preventing scope drift, conflicting code edits, and unvetted claims.

---

## Domain Allocation

- **Worker 01 (Platform)**: Execution runner, CLI interface, process supervision, baseline runner, output formatters.
- **Worker 02 (Analysis)**: AST visitor, static rules (`MOCK_ASSERTION`, etc.), Stryker mutation integration, mutant-to-test attribution.
- **Worker 03 (Security & QA)**: Threat modeling, adversarial fixture generation, GitHub Actions CI/CD, security audits, npm packaging hygiene.
- **Worker 04 (Pitch & Narrative)**: Pitch deck, 3-minute demo script, judge defense, evidence ledger, hackathon submission portal.

---

## The "Ask Twice" Boundary Gate

If any request involves an agent crossing from Worker A's territory into Worker B's territory:
1. **Gate 1**: Alert the user to the boundary collision and ask for initial confirmation.
2. **Gate 2**: Warn of handoff/contract disruption and demand a second explicit confirmation before any file modification or task execution.

No automated bypass of this double gate is permitted.

---

## Remote Synchronization & "Pull Before Push" Gate

To prevent overwriting another worker's contributions:
1. **Mandatory Remote Check**: Every worker/agent MUST check for remote updates (`git fetch origin`) prior to any push.
2. **Rebase & Verification**: If new commits exist from other workers, pull and rebase (`git pull --rebase origin <branch>`), resolving conflicts cleanly and verifying test suite health before pushing.
3. **No Force Pushes**: Destructive force pushes are completely prohibited across all branches.

