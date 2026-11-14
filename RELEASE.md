# MockGuard Release Procedure

1. Freeze the commit and claims register.
2. Run unit, integration, adversarial, benchmark, and package tests.
3. Inspect the package tarball.
4. Generate checksums and provenance where supported.
5. Publish from a protected CI environment.
6. Verify the registry artifact and release metadata.
7. Update release notes with limitations and migration notes.
8. Run the smoke-test install from the published artifact.
