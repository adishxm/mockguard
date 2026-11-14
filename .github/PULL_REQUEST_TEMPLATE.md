## Description

<!-- Provide a brief description of the changes made and the motivation behind them. -->

## Worker Domain & Ownership Check
- [ ] **Worker 01 (Platform)**: `src/platform/`, `src/runner/`, `src/reporters/`
- [ ] **Worker 02 (Analysis)**: `src/analysis/`, `src/ast/`, `src/rules/`, `src/mutation/`
- [ ] **Worker 03 (Security & QA)**: `.github/`, security, `.brain/.testdata/`, packaging
- [ ] **Worker 04 (Pitch & Narrative)**: `.brain/.work/pitch_deck/`, presentation assets

> [!IMPORTANT]
> If this PR modifies files across different worker boundaries, verify that the **"Ask Twice"** confirmation was obtained.

## Security & Quality Checklist
- [ ] No private secrets, bearer tokens, or API keys are committed.
- [ ] New code is covered by automated unit/acceptance tests.
- [ ] "Pull Before Push" synchronization was performed prior to pushing.
- [ ] All CI and CodeQL security checks pass.

