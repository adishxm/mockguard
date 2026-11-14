import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { generateSbom } from './generate-sbom.js';

/**
 * Computes cryptographic SHA-256 digests for all release artifacts
 * to ensure provenance and non-repudiation during distribution.
 */
export function generateChecksums(projectRoot = process.cwd()) {
  const distDir = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Ensure SBOM is generated
  const sbomPath = path.join(distDir, 'mockguard.spdx.json');
  if (!fs.existsSync(sbomPath)) {
    const sbom = generateSbom(projectRoot);
    fs.writeFileSync(sbomPath, JSON.stringify(sbom, null, 2), 'utf-8');
  }

  // 2. Ensure release tarball is packed into dist
  const packResult = spawnSync('npm', ['pack', `--pack-destination=${distDir}`], {
    cwd: projectRoot,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  if (packResult.status !== 0) {
    throw new Error(`npm pack failed with code ${packResult.status}:\n${packResult.stderr}`);
  }

  const lines = packResult.stdout.trim().split(/\r?\n/).map((l) => l.trim());
  const tarballName = lines.find((l) => l.endsWith('.tgz')) || lines.pop() || '';
  const tarballPath = path.join(distDir, tarballName);

  // 3. Compute SHA256 hashes
  const targets = [
    { name: tarballName, fullPath: tarballPath },
    { name: 'mockguard.spdx.json', fullPath: sbomPath },
  ];

  const checksumLines = [];
  const results = [];

  for (const target of targets) {
    if (!fs.existsSync(target.fullPath)) {
      throw new Error(`Target file for checksum not found: ${target.fullPath}`);
    }

    const fileBuffer = fs.readFileSync(target.fullPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    checksumLines.push(`${hash}  ${target.name}`);
    results.push({ name: target.name, sha256: hash, sizeBytes: fileBuffer.length });
  }

  const checksumFile = path.join(distDir, 'SHA256SUMS.txt');
  fs.writeFileSync(checksumFile, checksumLines.join('\n') + '\n', 'utf-8');

  return {
    checksumFile,
    results,
  };
}

if (process.argv[1]?.endsWith('generate-checksums.js')) {
  console.log('[MockGuard Checksums] Generating SHA-256 release digests...');
  try {
    const { checksumFile, results } = generateChecksums();
    for (const r of results) {
      console.log(`  ${r.sha256}  ${r.name} (${(r.sizeBytes / 1024).toFixed(1)} KB)`);
    }
    console.log(`[MockGuard Checksums] PASSED: Generated ${results.length} digests -> ${checksumFile}`);
    process.exit(0);
  } catch (err) {
    console.error('[MockGuard Checksums] FAILED:', err.message);
    process.exit(1);
  }
}
