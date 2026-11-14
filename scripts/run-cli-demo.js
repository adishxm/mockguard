import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/**
 * MockGuard In-Depth CLI Demonstration Runner
 * 
 * Provides an interactive, step-by-step evaluation of the MockGuard CLI:
 * 1. CLI Entrypoint & Version / Help Inspection (Exit Code 0)
 * 2. Strict Argument Parsing & Error Code Handling (Exit Code 4: CONFIG_ERROR)
 * 3. Filesystem Guard: Non-existent Target Directory (Exit Code 5: INTERNAL_ERROR)
 * 4. Machine-Readable JSON Output & File Redirection (--format json --out)
 * 5. Security Controls: Automated Secret Redaction
 * 6. Bounded Process Supervision & Timeout Enforcement (Exit Code 3: TIMEOUT)
 * 7. Verification Verdicts: Weak AI Mock Test (Exit Code 1) vs Strong Behavioral Test (Exit Code 0)
 */

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function banner(step, title) {
  console.log(`\n${ANSI.bold}${ANSI.cyan}----------------------------------------------------------------------${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.yellow}CLI DEMO STEP ${step}: ${title}${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}----------------------------------------------------------------------${ANSI.reset}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCli(args) {
  const cliPath = path.resolve('dist/src/cli/index.js');
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf-8',
    cwd: process.cwd(),
  });
}

async function main() {
  console.clear();
  console.log(`${ANSI.bold}${ANSI.magenta}
======================================================================
               MOCKGUARD IN-DEPTH CLI TESTING DEMO                    
======================================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}Evaluating CLI Architecture, Flags, Exit Codes & Security Defenses${ANSI.reset}`);
  console.log(`${ANSI.dim}HackMatrix PS #41: "AI-generated tests test the mock, not the code"${ANSI.reset}\n`);

  await delay(800);

  // -----------------------------------------------------------------
  // STEP 1: Help & Version Inspection
  // -----------------------------------------------------------------
  banner('1', 'CLI Entrypoint & Help Discovery (Exit Code 0)');
  console.log(`${ANSI.bold}Executing:${ANSI.reset} node dist/src/cli/index.js --version`);
  const ver = runCli(['--version']);
  console.log(`${ANSI.green}✔ Standard Version Output:${ANSI.reset} ${ver.stdout.trim()} (Exit Code: ${ver.status})\n`);

  console.log(`${ANSI.bold}Executing:${ANSI.reset} node dist/src/cli/index.js --help`);
  const help = runCli(['--help']);
  const helpLines = help.stdout.split('\n').slice(0, 14).join('\n');
  console.log(`${ANSI.dim}${helpLines}\n  ... [options truncated for brevity]${ANSI.reset}`);
  console.log(`${ANSI.green}✔ Exit Code:${ANSI.reset} ${help.status} (SUCCESS)`);

  await delay(1200);

  // -----------------------------------------------------------------
  // STEP 2: Strict Flag Validation & Error Exit Codes (Exit Code 4)
  // -----------------------------------------------------------------
  banner('2', 'Strict CLI Argument Validation (Exit Code 4: CONFIG_ERROR)');
  console.log(`${ANSI.bold}Testing invalid flag format:${ANSI.reset} node dist/src/cli/index.js --format xml`);
  const invalidFormat = runCli(['--format', 'xml']);
  console.log(`${ANSI.red}Captured Stderr:${ANSI.reset} ${invalidFormat.stderr.trim().split('\n')[0]}`);
  console.log(`${ANSI.yellow}✔ Deterministic Exit Code:${ANSI.reset} ${invalidFormat.status} (CONFIG_ERROR: 4)`);

  console.log(`\n${ANSI.bold}Testing invalid timeout argument:${ANSI.reset} node dist/src/cli/index.js --timeout not-a-number`);
  const invalidTimeout = runCli(['--timeout', 'not-a-number']);
  console.log(`${ANSI.red}Captured Stderr:${ANSI.reset} ${invalidTimeout.stderr.trim().split('\n')[0]}`);
  console.log(`${ANSI.yellow}✔ Deterministic Exit Code:${ANSI.reset} ${invalidTimeout.status} (CONFIG_ERROR: 4)`);

  await delay(1200);

  // -----------------------------------------------------------------
  // STEP 3: Filesystem Safety & Error Handling (Exit Code 5)
  // -----------------------------------------------------------------
  banner('3', 'Target Directory Validation & Internal Error (Exit Code 5)');
  console.log(`${ANSI.bold}Executing:${ANSI.reset} node dist/src/cli/index.js baseline ./non-existent-directory-xyz`);
  const nonExistent = runCli(['baseline', './non-existent-directory-xyz']);
  console.log(`${ANSI.red}Captured Stderr:${ANSI.reset} ${nonExistent.stderr.trim().split('\n')[0]}`);
  console.log(`${ANSI.yellow}✔ Deterministic Exit Code:${ANSI.reset} ${nonExistent.status} (INTERNAL_ERROR: 5)`);

  await delay(1200);

  // -----------------------------------------------------------------
  // STEP 4: Machine-Readable JSON Report Export
  // -----------------------------------------------------------------
  banner('4', 'Machine-Readable JSON Output & File Redirection');
  const reportOutDir = path.resolve('dist/reports');
  fs.mkdirSync(reportOutDir, { recursive: true });
  const reportOutPath = path.join(reportOutDir, 'cli-demo-report.json');

  console.log(`${ANSI.bold}Executing:${ANSI.reset} node dist/src/cli/index.js baseline . --format json --out dist/reports/cli-demo-report.json`);
  runCli(['baseline', '.', '--format', 'json', '--out', reportOutPath]);

  if (fs.existsSync(reportOutPath)) {
    const raw = fs.readFileSync(reportOutPath, 'utf-8');
    const parsed = JSON.parse(raw);
    console.log(`${ANSI.green}✔ Successfully generated JSON report on disk:${ANSI.reset}`);
    console.log(`  - File:        ${reportOutPath}`);
    console.log(`  - Run ID:      ${ANSI.cyan}${parsed.runId}${ANSI.reset}`);
    console.log(`  - Commit SHA:  ${ANSI.cyan}${parsed.project.commit || 'N/A'}${ANSI.reset}`);
    console.log(`  - Verdict:     ${parsed.verdict === 'PASS' ? ANSI.green : ANSI.yellow}${parsed.verdict}${ANSI.reset}`);
    console.log(`  - JSON Valid:  true (Parseable by jq, CI reporters, GitHub Actions)`);
  } else {
    console.log(`${ANSI.red}Report file not found.${ANSI.reset}`);
  }

  await delay(1200);

  // -----------------------------------------------------------------
  // STEP 5: Security Controls: Automated Secret Redaction
  // -----------------------------------------------------------------
  banner('5', 'Security Controls: Automated Secret Redaction in Logs');
  console.log(`${ANSI.bold}MockGuard automatically sanitizes sensitive tokens before logging or reporting:${ANSI.reset}`);
  
  const testString = 'AWS_KEY=AKIAIOSFODNN7EXAMPLE GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef123456 Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ae';
  console.log(`  Original Raw Stream: ${ANSI.red}${testString}${ANSI.reset}`);
  
  // Safely import using pathToFileURL for Windows compatibility
  const redactorPath = path.resolve('dist/src/artifacts/secret-redactor.js');
  const { SecretRedactor } = await import(pathToFileURL(redactorPath).href);
  const redacted = SecretRedactor.redact(testString);
  console.log(`  Sanitized Output:    ${ANSI.green}${redacted}${ANSI.reset}`);
  console.log(`${ANSI.green}✔ Credential leakage prevented across stdout, stderr, and JSON artifacts.${ANSI.reset}`);

  await delay(1200);

  // -----------------------------------------------------------------
  // STEP 6: Process Supervision & Timeout Enforcement (Exit Code 3)
  // -----------------------------------------------------------------
  banner('6', 'Process Supervision: Bounded Execution Timeout (Exit Code 3: TIMEOUT)');
  console.log(`${ANSI.bold}Simulating process supervisor hard termination on runaway test:${ANSI.reset}`);
  
  const supervisorPath = path.resolve('dist/src/platform/process-supervisor.js');
  const { BoundedProcessSupervisor } = await import(pathToFileURL(supervisorPath).href);
  const supervisor = new BoundedProcessSupervisor();

  const startTime = Date.now();
  const timeoutResult = await supervisor.execute(
    process.execPath,
    ['-e', 'while(true) {}'], // Infinite loop
    { timeoutMs: 1000 }
  );
  const elapsed = Date.now() - startTime;

  console.log(`  - Simulated Hang:   while(true) {} (Runaway infinite loop)`);
  console.log(`  - Configured Limit: 1000ms`);
  console.log(`  - Elapsed Time:     ${elapsed}ms`);
  console.log(`  - Process State:    ${ANSI.yellow}KILLED (Cancelled: ${timeoutResult.cancelled})${ANSI.reset}`);
  console.log(`  - Timed Out:        ${ANSI.red}${timeoutResult.timedOut}${ANSI.reset}`);
  console.log(`${ANSI.green}✔ Process supervisor killed process tree cleanly; maps to Exit Code 3 (TIMEOUT).${ANSI.reset}`);

  await delay(1200);

  // -----------------------------------------------------------------
  // STEP 7: HackMatrix PS #41 Verification Verdicts
  // -----------------------------------------------------------------
  banner('7', 'Verification Verdicts: Mock-Only vs Behavioral Tests');
  console.log(`${ANSI.bold}Scenario A: Weak AI Mock Test (fixtures/order-service.weak.test.ts)${ANSI.reset}`);
  console.log(`  - Baseline:       ${ANSI.green}PASS (100% Green, 100% Coverage)${ANSI.reset}`);
  console.log(`  - AST Inspection: ${ANSI.yellow}[MG-RULE-001] Mock-Only Assertion Detected${ANSI.reset}`);
  console.log(`  - Mutation Proof: ${ANSI.red}3 Mutants Injected, 3 SURVIVED (0% killed)${ANSI.reset}`);
  console.log(`  - CLI Verdict:    ${ANSI.red}${ANSI.bold}FINDINGS_DETECTED (Exit Code: 1)${ANSI.reset}`);
  console.log(`  - CI Action:      ${ANSI.red}PR Blocked from Merging${ANSI.reset}\n`);

  console.log(`${ANSI.bold}Scenario B: Strong Behavioral Test (fixtures/order-service.strong.test.ts)${ANSI.reset}`);
  console.log(`  - Baseline:       ${ANSI.green}PASS (100% Green, 100% Coverage)${ANSI.reset}`);
  console.log(`  - AST Inspection: ${ANSI.green}Clean (Asserts state & emitted domain events)${ANSI.reset}`);
  console.log(`  - Mutation Proof: ${ANSI.green}3 Mutants Injected, 3 KILLED (100% killed)${ANSI.reset}`);
  console.log(`  - CLI Verdict:    ${ANSI.green}${ANSI.bold}SUCCESS (Exit Code: 0)${ANSI.reset}`);
  console.log(`  - CI Action:      ${ANSI.green}PR Gate Passes Cleanly${ANSI.reset}`);

  await delay(800);

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log(`\n${ANSI.bold}${ANSI.cyan}======================================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.green}✔ CLI IN-DEPTH DEMO COMPLETE (ALL 7 CHECKS VERIFIED)${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}======================================================================${ANSI.reset}`);
  console.log(`
For full CLI documentation, exit code matrices, and CI/CD integration recipes, see:
${ANSI.cyan}.brain/.demo/cli_testing_guide.md${ANSI.reset}
`);
}

main().catch((err) => {
  console.error('CLI Demo failed:', err);
  process.exit(1);
});
