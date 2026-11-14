import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import os from 'node:os';

import { SecretRedactor } from '../../src/artifacts/secret-redactor.js';
import { BoundedProcessSupervisor } from '../../src/platform/process-supervisor.js';
import { parseCliArgs } from '../../src/cli/args.js';
import { ProjectDiscovery } from '../../src/platform/project-discovery.js';

test('Security 1: SecretRedactor strips known API keys and tokens', () => {
  // Test GitHub personal token
  const githubLog = 'Failed to clone repository with token ghp_1234567890abcdefghijklmnopqrstuvwxyzAB in CI';
  const redactedGithub = SecretRedactor.redact(githubLog);
  assert.strictEqual(redactedGithub.includes('ghp_'), false);
  assert.strictEqual(redactedGithub.includes('[REDACTED_SECRET]'), true);

  // Test AWS Access Key
  const awsLog = 'AWS upload failure with credentials AKIAIOSFODNN7EXAMPLE';
  const redactedAws = SecretRedactor.redact(awsLog);
  assert.strictEqual(redactedAws.includes('AKIAIOSFODNN7EXAMPLE'), false);
  assert.strictEqual(redactedAws.includes('[REDACTED_SECRET]'), true);

  // Test Generic Bearer / Password token
  const bearerLog = 'Authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M';
  const redactedBearer = SecretRedactor.redact(bearerLog);
  assert.strictEqual(redactedBearer.includes('eyJhbGciOiJIUzI1NiIs'), false);
  assert.strictEqual(redactedBearer.includes('[REDACTED_SECRET]'), true);

  // Test RSA Private key
  const rsaLog = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y...\n-----END RSA PRIVATE KEY-----';
  const redactedRsa = SecretRedactor.redact(rsaLog);
  assert.strictEqual(redactedRsa.includes('MIIEowIBAAKCAQEA0Y'), false);
  assert.strictEqual(redactedRsa.includes('[REDACTED_SECRET]'), true);
});

test('Security 2: ProcessSupervisor enforces hard timeout against runaway processes', async () => {
  const supervisor = new BoundedProcessSupervisor();
  
  // Use node to execute an intentional long sleep
  const result = await supervisor.execute(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], {
    timeoutMs: 250,
  });

  assert.strictEqual(result.timedOut, true);
  assert.ok(result.durationMs >= 200);
});

test('Security 3: ProcessSupervisor bounds and truncates runaway output', async () => {
  const supervisor = new BoundedProcessSupervisor();
  
  // Generate a flood of stdout
  const script = 'for (let i = 0; i < 5000; i++) console.log("A".repeat(100));';
  const result = await supervisor.execute(process.execPath, ['-e', script], {
    maxOutputBytes: 1024, // 1KB limit
    timeoutMs: 5000,
  });

  assert.strictEqual(result.outputTruncated, true);
  assert.ok(result.stdout.length <= 2048);
});

test('Security 4: ProcessSupervisor enforces clean environment isolation', async () => {
  const supervisor = new BoundedProcessSupervisor();
  
  // Temporarily set an arbitrary sensitive env var in parent
  process.env.TEST_CONFIDENTIAL_KEY = 'super_secret_value_12345';
  
  try {
    const script = 'console.log(process.env.TEST_CONFIDENTIAL_KEY || "NOT_LEAKED");';
    const result = await supervisor.execute(process.execPath, ['-e', script], {
      timeoutMs: 5000,
    });

    assert.strictEqual(result.stdout.trim(), 'NOT_LEAKED');
  } finally {
    delete process.env.TEST_CONFIDENTIAL_KEY;
  }
});

test('Security 5: CLI rejects out-of-boundary and negative parameters', () => {
  assert.throws(() => parseCliArgs(['--timeout', '-500']), /positive integer/);
  assert.throws(() => parseCliArgs(['--concurrency', '0']), /positive integer/);
  assert.throws(() => parseCliArgs(['--format', 'html']), /Invalid format/);
});

test('Security 6: ProjectDiscovery safely rejects nonexistent project paths', () => {
  const nonExistentPath = path.join(os.tmpdir(), 'mg-nonexistent-subpath-' + Date.now());
  assert.throws(
    () => ProjectDiscovery.discover(nonExistentPath),
    /Project directory does not exist/
  );
});
