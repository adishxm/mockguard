# MockGuard Abuse Cases

1. A malicious repository causes the tool to execute a destructive test command.
2. A test prints environment secrets into the report.
3. A generated test deliberately satisfies a static pattern while leaving business behavior unverified.
4. A compromised third-party action modifies a release artifact.
5. A pull request triggers a privileged workflow with untrusted code.
6. A user treats a high mutation score as proof that no defects exist.
7. A repair suggestion overwrites hand-authored tests.
8. A cache returns results for the wrong commit/configuration.

For each case, controls, residual risk, and test IDs belong in the security test matrix.
