# MockGuard Evidence Data Model

## Entities

- `Run`: one invocation and its environment/config metadata.
- `TestCase`: a test identity and source location.
- `StaticFinding`: a rule observation with confidence and evidence.
- `Mutant`: a controlled source change and execution outcome.
- `Observation`: stdout/stderr/exit/timing data.
- `Correlation`: a justified relationship between finding and mutant.
- `Suggestion`: an unverified proposed next step.
- `Artifact`: a file/hash/version belonging to the run.

## Privacy

Source excerpts and test output may be sensitive. Reports must support path normalization, output redaction, and a share-safe mode.
