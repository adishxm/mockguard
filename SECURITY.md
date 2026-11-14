# MockGuard Security Policy

MockGuard may execute tests from a user-selected repository. Treat the local MVP as a trusted-workspace tool, not a hardened sandbox.

## Report

Do not include secrets in an issue. Describe the affected version, operating system, command, expected behavior, observed behavior, and a minimal reproduction that does not expose private source.

## Supply chain

Release artifacts should be built from clean CI, use locked dependencies, and publish provenance where supported.

## Scope

Security claims apply only to implemented and tested controls listed in the capability ledger.
