# MockGuard Adapter and Plugin Contract

## Adapter types

- `RunnerAdapter`: discovers and executes a supported test runner.
- `MutationAdapter`: creates and executes mutants.
- `ParserAdapter`: parses source and returns locations/diagnostics.
- `ReporterAdapter`: renders versioned findings.

## Requirements

Every adapter declares name, version, supported project shapes, input files, output schema, resource behavior, and failure modes.

No plugin may install packages, spawn an undeclared child process, or write outside its run directory without explicit capability approval.

## Compatibility

Breaking adapter changes require a contract version increment and a migration note.
