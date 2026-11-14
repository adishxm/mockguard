# MockGuard Acceptance Criteria

## Must pass

- [ ] Clean fixture setup works from a clean checkout.
- [ ] Baseline failure blocks interpretation of mutation score.
- [ ] Weak mock fixture passes original tests and leaves at least one meaningful mutant alive.
- [ ] Strong behavior fixture kills that mutant.
- [ ] Valid boundary-mock fixture does not receive a high-confidence hard failure without dynamic support.
- [ ] Timeout, compile error, and unsupported states are distinct.
- [ ] Report is replayable from captured command/config metadata.
- [ ] No automatic edit occurs unless explicitly enabled.

## Quality targets, not results

- [ ] Every high-confidence finding has a correct source location.
- [ ] Evaluation corpus contains positive, negative, and unsupported cases.
- [ ] Final demo fits three minutes after setup.
- [ ] README happy path is copy-paste verified.
