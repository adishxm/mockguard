import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Valid Node.js test runner flags supported across Node 18, 20, 22.
 */
const VALID_NODE_TEST_PREFIXES = [
  '--test-name-pattern',
  '--test-reporter',
  '--test-reporter-destination',
  '--test-only',
  '--test-concurrency',
  '--test-timeout',
  '--test-update-snapshots',
];

/**
 * Filter arguments passed from npm test or CI runner.
 * Strips Jest-specific flags (--ci, --maxWorkers, --bail, etc.)
 * so Node 18/20/22 test runner doesn't mistake them for test file paths.
 */
export function filterTestRunnerArgs(args) {
  const filtered = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Strip known Jest flags that break node --test on Node 18/20
    if (
      arg === '--ci' ||
      arg === '--bail' ||
      arg === '-b' ||
      arg.startsWith('--maxWorkers')
    ) {
      // If flag has separate value (e.g. --maxWorkers 2), skip next arg if it's numeric
      if (arg === '--maxWorkers' && i + 1 < args.length && /^\d+$/.test(args[i + 1])) {
        i++;
      }
      continue;
    }

    // Allow recognized node --test flags and their values
    if (VALID_NODE_TEST_PREFIXES.some((prefix) => arg.startsWith(prefix))) {
      filtered.push(arg);
      // If flag has separate value (e.g. --test-name-pattern "pattern"), preserve value
      if (!arg.includes('=') && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        filtered.push(args[++i]);
      }
      continue;
    }

    // Ignore other unknown flags to prevent Node from treating them as test files
    if (arg.startsWith('-')) {
      continue;
    }

    // If an explicit file path is provided and exists, preserve it
    if (fs.existsSync(arg)) {
      filtered.push(arg);
    }
  }
  return filtered;
}

export function findTestFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js'))
    ) {
      results.push(full);
    }
  }
  return results;
}

export function runTests(argv = process.argv.slice(2)) {
  const testsDir = path.resolve('dist/tests');
  const discoveredFiles = findTestFiles(testsDir);

  if (discoveredFiles.length === 0) {
    console.error(
      `[mockguard-test-runner] ERROR: Zero compiled test files found in ${testsDir}. Did compilation run?`
    );
    return 1;
  }

  const extraArgs = filterTestRunnerArgs(argv);
  const nodeArgs = ['--test', ...discoveredFiles, ...extraArgs];

  const res = spawnSync(process.execPath, nodeArgs, {
    stdio: 'inherit',
    shell: false,
  });

  return res.status ?? 0;
}

// Only execute directly when invoked from CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('scripts/test-runner.js') ||
    process.argv[1].endsWith('scripts\\test-runner.js'))
) {
  const exitCode = runTests();
  process.exit(exitCode);
}
