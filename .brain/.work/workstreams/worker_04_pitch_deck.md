# Worker 04 — Pitch, Deck, Demo Narrative, and Submission

**Role:** Member 4 / Pitch and deck owner  
**Primary outcome:** convert verified engineering evidence into a clear, judge-ready story without inventing results.

## Production phases

### P0 — Message and audience

- Freeze the one-sentence pitch and the PS #41 problem statement.
- Identify the judge questions and the proof required for each.
- Build a claim-to-artifact map from the claims register.
- Exit gate: every slide claim has a source or a planned measurement.

### P1 — Storyboard and demo script

- Write the three-minute flow: weak green test → surviving mutant → evidence → stronger assertion → killed mutant.
- Use fixture-only mode as the reliable fallback.
- Time the story after setup and record the exact commands.
- Exit gate: two complete rehearsals without changing commands.

### P2 — Evidence and visual assets

- Capture terminal output, source snippets, mutation diff, evidence card, and before/after report.
- Use only numbers from the final benchmark artifact.
- Label design/target/measurement states in speaker notes.
- Exit gate: all screenshots are from the tagged candidate or explicitly marked as mockups.

### P3 — Deck build

Recommended 8-slide deck:

1. The false green problem.
2. Why coverage alone is insufficient.
3. MockGuard workflow.
4. Technical architecture.
5. Live proof: surviving mutant.
6. Improvement: mutant killed.
7. Production trust and limitations.
8. Roadmap and ask.

Do not overload slides with architecture. The live proof is the center.

### P4 — Judge Q&A and objection handling

Prepare concise answers for mocks, coverage, Stryker dependency, equivalent mutants, false positives, runtime cost, security boundary, AI repair, and framework scope.

### P5 — Submission lock

- Verify project name, repository link, description, team members, track, and problem statement.
- Check video/audio, slide export, README, license, and archive contents.
- Run the final claim audit against the capability ledger.
- Exit gate: no unverified number or capability remains in the pitch.

## Handoffs

- Worker 01 supplies exact commands and runtime metadata.
- Worker 02 supplies approved evidence cards, mutation outcomes, and benchmark numbers.
- Worker 03 supplies release status, security boundary, and limitations.

## Definition of done

A judge can understand the problem in 20 seconds, see proof in 90 seconds, and inspect a credible production path in the remaining time.
