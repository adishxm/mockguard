# MockGuard Dependency Graph

```text
CLI
 ├── config/discovery
 ├── process supervisor
 ├── AST/static analysis
 ├── mutation adapter
 ├── correlation engine
 └── reporters
       ├── terminal
       ├── JSON
       └── optional SARIF

Evaluation harness
 ├── fixture corpus
 ├── baseline runner
 ├── static-only runner
 ├── mutation-only runner
 └── combined runner
```

## Build order

Contracts → fixture → baseline → static rules → mutation adapter → correlation → reports → evaluation → optional AI/SARIF.
