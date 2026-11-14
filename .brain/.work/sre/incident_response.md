# MockGuard Incident Response

## Severity

- SEV-1: package/release compromise, secret exposure, or destructive execution caused by MockGuard.
- SEV-2: widespread false hard failures, data loss, or broken release path.
- SEV-3: isolated incorrect finding, performance regression, or unsupported-project crash.
- SEV-4: documentation or UX issue without incorrect execution.

## Response sequence

1. Stop affected release or feature flag.
2. Preserve run IDs, logs, artifact hashes, and commit.
3. Determine whether source/test output was exposed.
4. Rotate credentials if CI secrets may be exposed.
5. Reproduce from a clean commit.
6. Publish a corrective release or advisory.
7. Add a regression fixture and update the claims register.
