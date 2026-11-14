import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function findTestFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js'))) {
      results.push(full);
    }
  }
  return results;
}

const testsDir = path.resolve('dist/tests');
const files = findTestFiles(testsDir);

if (files.length === 0) {
  console.error(`[mockguard-test-runner] No compiled test files found in ${testsDir}`);
  process.exit(1);
}

// Filter out arguments not recognized by node --test (e.g., Jest specific flags like --maxWorkers)
const extraArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--maxWorkers'));
const nodeArgs = ['--test', ...files, ...extraArgs];

const res = spawnSync(process.execPath, nodeArgs, {
  stdio: 'inherit',
  shell: false,
});

process.exit(res.status ?? 0);
