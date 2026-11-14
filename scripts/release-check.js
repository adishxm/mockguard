import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * MockGuard Comprehensive Release Verification Pipeline (Worker 03)
 * Orchestrates build, test, package auditing, SBOM, checksums, and clean-room smoke test.
 */
function runStep(name, command, args) {
  console.log(`\n============================================================`);
  console.log(`[Release Check] Step: ${name}`);
  console.log(`Executing: ${command} ${args.join(' ')}`);
  console.log(`============================================================`);

  const startTime = Date.now();
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const durationMs = Date.now() - startTime;
  if (result.status !== 0) {
    console.error(`\n❌ [Release Check] FAILED: Step "${name}" exited with status code ${result.status} (${durationMs}ms)`);
    process.exit(result.status || 1);
  }

  console.log(`✅ [Release Check] PASSED: Step "${name}" completed successfully in ${durationMs}ms`);
}

function verifyReleaseArtifacts() {
  console.log(`\n============================================================`);
  console.log(`[Release Check] Step: Release Artifact Integrity`);
  console.log(`============================================================`);

  const requiredArtifacts = [
    'LICENSE',
    'SECURITY.md',
    '.npmignore',
    'dist/SHA256SUMS.txt',
    'dist/mockguard.spdx.json',
    '.brain/.work/qa/failure_catalog.md',
    '.brain/.work/security/abuse_cases.md',
    '.brain/.work/security/privacy_model.md',
    '.brain/.work/security/supply_chain_release.md',
  ];

  for (const relPath of requiredArtifacts) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [Release Check] Missing mandatory release artifact: ${relPath}`);
      process.exit(1);
    }
  }

  console.log(`✅ [Release Check] PASSED: All ${requiredArtifacts.length} mandatory governance and release artifacts verified.`);
}

console.log('🛡️  Starting MockGuard Pre-Release Verification Pipeline (Worker 03)...');

// 1. Clean Build
runStep('1. TypeScript Production Build', 'npm', ['run', 'build']);

// 2. Test Build
runStep('2. TypeScript Test Build', 'npm', ['run', 'build:test']);

// 3. Automated Test Suite
runStep('3. Native Test Suite Execution', 'npm', ['test']);

// 4. Packaging Allowlist Audit
runStep('4. Distribution Package File Audit', 'node', ['scripts/verify-package.js']);

// 5. SPDX 2.3 SBOM Generation
runStep('5. SPDX 2.3 SBOM Generation', 'node', ['scripts/generate-sbom.js']);

// 6. Cryptographic SHA-256 Checksums
runStep('6. SHA-256 Release Checksums', 'node', ['scripts/generate-checksums.js']);

// 7. Clean-room Tarball Smoke Test
runStep('7. Isolated Clean-Room Tarball Smoke Test', 'node', ['scripts/smoke-test-tarball.js']);

// 8. Governance & Security Policy Artifact Integrity
verifyReleaseArtifacts();

console.log(`\n🎉 ============================================================`);
console.log(`🎉 ALL MOCKGUARD RELEASE GATES PASSED (100% GREEN)`);
console.log(`🎉 Artifacts ready for release provenance and tagging.`);
console.log(`============================================================\n`);
