import { spawnSync } from 'node:child_process';

/**
 * Validates that the npm package contains only intended runtime assets
 * and excludes internal research, source TypeScript, and test fixtures.
 */
export function verifyPackageTarball() {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed with code ${result.status}:\n${result.stderr}`);
  }

  const parsed = JSON.parse(result.stdout);
  const packInfo = Array.isArray(parsed) ? parsed[0] : parsed;
  const files = (packInfo.files || []).map((f) => f.path);

  // Prohibited path prefixes in distributed npm tarball
  const PROHIBITED_PREFIXES = [
    '.brain/',
    'docs/',
    'tests/',
    'src/',
    '.github/',
    'gemini_integration/',
    '.testdata/',
  ];

  const violations = [];

  for (const file of files) {
    for (const prohibited of PROHIBITED_PREFIXES) {
      if (file.startsWith(prohibited)) {
        violations.push({ file, prohibited });
      }
    }
  }

  // Mandatory runtime files
  const REQUIRED_FILES = [
    'README.md',
    'LICENSE',
    'package.json',
    'dist/src/index.js',
    'dist/src/cli/index.js',
  ];

  const missing = [];
  for (const req of REQUIRED_FILES) {
    if (!files.includes(req)) {
      missing.push(req);
    }
  }

  return {
    valid: violations.length === 0 && missing.length === 0,
    totalFiles: files.length,
    sizeBytes: packInfo.size,
    unpackedSizeBytes: packInfo.unpackedSize,
    violations,
    missing,
    files,
  };
}

if (process.argv[1]?.endsWith('verify-package.js')) {
  console.log('[MockGuard Packaging Guard] Auditing npm distribution tarball...');
  const audit = verifyPackageTarball();

  if (!audit.valid) {
    console.error('[MockGuard Packaging Guard] FAILED: Prohibited files detected or required files missing:');
    if (audit.violations.length > 0) {
      console.error('  Violations:', audit.violations);
    }
    if (audit.missing.length > 0) {
      console.error('  Missing:', audit.missing);
    }
    process.exit(1);
  }

  console.log(`[MockGuard Packaging Guard] PASSED: ${audit.totalFiles} files verified clean (${(audit.unpackedSizeBytes / 1024).toFixed(1)} KB unpacked).`);
  process.exit(0);
}
