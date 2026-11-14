# MockGuard Target Architecture

## Planes

### Control plane

CLI, configuration, scope selection, policy, and report orchestration.

### Analysis plane

AST parser, symbol/reference model, mock-rule engine, confidence engine, and evidence extractor.

### Verification plane

Baseline runner, mutation adapter, process supervisor, kill matrix, timeout classifier, and flakiness controller.

### Evidence plane

Versioned entities, content hashes, report schema, terminal/JSON/SARIF renderers, and diagnostic bundles.

### Trust plane

Threat policy, redaction, no-install boundary, action/package pinning, release provenance, and capability ledger.

## Production constraints

- No network is required for the fixture path.
- No source is sent to a remote service by default.
- The tool does not claim sandboxing unless the execution mechanism is independently verified.
- Plugins are versioned and capability-declared.
- Reports are append-only per run but not treated as tamper-proof local storage.
