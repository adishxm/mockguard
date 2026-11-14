# MockGuard Secure CI Profile

- Default `GITHUB_TOKEN` permissions to read-only.
- Use unprivileged pull-request workflows for untrusted code.
- Avoid checking out fork code in privileged workflows.
- Pin third-party actions to reviewed full commit SHAs or an approved lock mechanism.
- Keep release publishing in a separate environment with approval.
- Do not use source/test output as a secret-bearing workflow command.
- Generate release artifacts from a clean checkout.
- Validate package contents before publishing.
- Review logs for accidental leakage.
