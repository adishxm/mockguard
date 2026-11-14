# MockGuard Agent & Worker Operating Rules

This file governs all AI agents, subagents, and human contributors working within this repository.

---

## 1. Strict Worker Domain Boundaries

To prevent conflicting edits, accidental regressions, and scope creeping, each worker owns an exclusive boundary:

| Worker | Title | Exclusive Domain & File Boundaries |
|---|---|---|
| **Worker 01** | **Platform & Runtime** | `src/platform/`, `src/runner/`, `src/reporters/`, CLI entry points, process supervisor, runtime caching |
| **Worker 02** | **Analysis & Mutation** | `src/analysis/`, `src/ast/`, `src/rules/`, `src/mutation/`, attribution engine, StrykerJS adapter |
| **Worker 03** | **Security, QA & Release** | `.github/`, security policies, threat model, adversarial test fixtures (`.brain/.testdata/`), packaging (`package.json` files field, `.npmignore`), release gates |
| **Worker 04** | **Pitch & Narrative** | `.brain/.work/pitch_deck/`, presentation scripts, demo storyboard, judge Q&A, submission lock |

---

## 2. Mandatory "Ask Twice" Gate (Double Confirmation)

**CRITICAL POLICY**:
No agent or worker may enter, modify, or execute tasks belonging to another worker without completing a mandatory **two-stage verification (Ask Twice)** with the user:

### Step 1: First Warning & Confirmation
When an agent or user requests work outside the active worker's designated role:
1. The agent must pause immediately.
2. The agent must state:
   - Current active worker role.
   - The target worker whose domain is about to be entered.
   - The specific files/tasks that belong to the other worker.
3. The agent must ask: *"Worker X is assigned to this domain. Are you sure you want to transition/override into Worker Y's tasks?"*

### Step 2: Second Explicit Override Confirmation
Even if the user confirms Step 1, the agent must ask a **second time** before any action or file write:
1. The agent must state the risk/handoff requirements (e.g. *"This boundary crossing could overwrite Worker Y's pending contracts or violate the execution model. Please explicitly reply with 'CONFIRM OVERRIDE' to proceed."*)
2. Only after this second explicit confirmation may the agent proceed with the other worker's tasks.

---

## 3. Remote Push & Synchronization Policy

### Rule A: Explicit User Approval Required
- Agents and workers must **never** execute `git push` autonomously or unprompted.
- `git push` requires an explicit, direct user prompt instructing the agent to push.

### Rule B: Mandatory Pull & Remote Check Before Push ("Pull Before Push")
- Before any push command is executed, the agent or worker **must check and pull any remote updates** from other workers:
  1. Execute `git fetch origin` to inspect remote branches and incoming commits.
  2. If remote has new commits from other workers, run `git pull --rebase origin <branch>` to integrate them cleanly.
  3. Verify that local changes do not regress or conflict with other workers' incoming work.
  4. Only when the working tree is fully synchronized, clean, and tests pass may the push proceed.
- Force pushing (`--force`, `-f`, `--force-with-lease`) is strictly prohibited.

