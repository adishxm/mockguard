# MockGuard Production Test Strategy

## Test layers

1. Unit: parsers, rules, schema, classifiers, redaction.
2. Property: argv/config normalization, report invariants, path handling.
3. Fixture integration: real Jest project and selected mutation operator.
4. Adversarial: process, path, output, timeout, and malformed input cases.
5. Compatibility: Node/Jest/TypeScript/Stryker matrix.
6. Release: clean tarball install and CLI invocation.
7. Benchmark: labelled corpus, ablations, and calibration.

## Independence

Test fixtures must be authored independently of the rule implementation. Expected labels are reviewed before tool output is generated.
