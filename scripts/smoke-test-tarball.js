import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Smoke-tests the production npm tarball in complete isolation.
 * Unpacks the package into a clean temp folder and executes the CLI
 * to guarantee that missing dependencies, build outputs, or broken imports
 * are caught before distribution.
 */
export function smokeTestTarball(projectRoot = process.cwd()) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-smoke-tarball-'));
  const extractDir = path.join(tmpDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    // 1. Pack tarball into tmpDir
    const packResult = spawnSync('npm', ['pack', `--pack-destination=${tmpDir}`], {
      cwd: projectRoot,
      encoding: 'utf-8',
      shell: process.platform === 'win32',
    });

    if (packResult.status !== 0) {
      throw new Error(`npm pack failed with code ${packResult.status}:\n${packResult.stderr}`);
    }

    const lines = packResult.stdout.trim().split(/\r?\n/).map((l) => l.trim());
    const tarballName = lines.find((l) => l.endsWith('.tgz')) || lines.pop() || '';
    if (!tarballName) {
      throw new Error(`Could not determine packed tarball filename from output: ${packResult.stdout}`);
    }

    const tarballPath = path.join(tmpDir, tarballName);
    if (!fs.existsSync(tarballPath)) {
      throw new Error(`Tarball not found at expected path: ${tarballPath}`);
    }

    // 2. Extract tarball using built-in bsdtar/tar
    const tarResult = spawnSync('tar', ['-xzf', tarballPath, '-C', extractDir], {
      encoding: 'utf-8',
    });

    if (tarResult.status !== 0) {
      throw new Error(`tar extract failed with code ${tarResult.status}:\n${tarResult.stderr}`);
    }

    const extractedPackageDir = path.join(extractDir, 'package');
    const cliEntry = path.join(extractedPackageDir, 'dist', 'src', 'cli', 'index.js');

    if (!fs.existsSync(cliEntry)) {
      throw new Error(`CLI entry point not found in extracted tarball: ${cliEntry}`);
    }

    // 3. Smoke execute top-level --help
    const helpResult = spawnSync(process.execPath, [cliEntry, '--help'], {
      cwd: tmpDir, // Execute from temp dir, completely outside repo root
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'production',
      },
    });

    if (helpResult.status !== 0) {
      throw new Error(`Isolated CLI invocation failed with code ${helpResult.status}:\n${helpResult.stderr}`);
    }

    if (!helpResult.stdout.includes('MockGuard') || !/USAGE:/i.test(helpResult.stdout)) {
      throw new Error(`Isolated CLI help output did not contain expected banner:\n${helpResult.stdout}`);
    }

    // 4. Smoke execute subcommand --help (e.g. baseline)
    const baselineResult = spawnSync(process.execPath, [cliEntry, 'baseline', '--help'], {
      cwd: tmpDir,
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'production',
      },
    });

    if (baselineResult.status !== 0) {
      throw new Error(`Isolated CLI baseline invocation failed with code ${baselineResult.status}:\n${baselineResult.stderr}`);
    }

    return {
      success: true,
      tarballName,
      cliEntry,
      testedCommands: ['--help', 'baseline --help'],
    };
  } finally {
    // 5. Clean up temporary directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error in finally block
    }
  }
}

if (process.argv[1]?.endsWith('smoke-test-tarball.js')) {
  console.log('[MockGuard Smoke Guard] Smoke-testing isolated npm tarball...');
  try {
    const result = smokeTestTarball();
    console.log(`[MockGuard Smoke Guard] PASSED: Successfully unpacked ${result.tarballName} and verified CLI execution.`);
    process.exit(0);
  } catch (err) {
    console.error('[MockGuard Smoke Guard] FAILED:', err.message);
    process.exit(1);
  }
}
