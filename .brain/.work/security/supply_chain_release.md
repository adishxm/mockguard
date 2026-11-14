# MockGuard Supply-Chain and Release Plan

## Release path

1. Tag a reviewed commit.
2. Run clean checkout build and tests.
3. Generate package tarball and inspect file allowlist.
4. Generate SBOM/provenance where supported.
5. Publish through trusted CI with least privilege.
6. Verify registry signatures/provenance.
7. Publish release notes and checksums.
8. Retain build logs and artifact metadata.

## npm provenance

npm documents provenance attestations that link a package to source and build instructions and use Sigstore-backed transparency mechanisms. Provenance supports auditability but does not guarantee that the package contains no malicious code. Use provenance as one release control, not as a correctness claim.
