# Gemini Pitch Addendum

## Positioning

Gemini is the assistant, not the judge. MockGuard uses Gemini to turn evidence into a clear explanation or candidate behavior assertion, then re-runs the deterministic mutation check.

## Demo beat

1. MockGuard detects a surviving mutant.
2. Gemini proposes a behavior-level assertion.
3. The developer reviews the proposal.
4. MockGuard re-runs and independently verifies whether the mutant is killed.

## Safety line

“Gemini can suggest the fix, but it cannot certify the fix. Only the independent runner and mutation evidence can change the result.”

## Avoid

Do not claim Gemini generated a correct test, used an autonomous agent, or processed a complete private repository unless that exact capability is implemented, disclosed, and tested.
