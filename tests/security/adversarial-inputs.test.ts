import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';

import { SecretRedactor } from '../../src/artifacts/secret-redactor.js';
import { BoundedProcessSupervisor } from '../../src/platform/process-supervisor.js';
import { ProjectDiscovery } from '../../src/platform/project-discovery.js';

test('Adversarial 1: SecretRedactor handles diverse secret token signatures', () => {
  const secretSamples = [
    { name: 'GitHub PAT', raw: 'token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' },
    { name: 'AWS Access Key', raw: 'aws_key: AKIA1234567890EXAMPLE', token: 'AKIA1234567890EXAMPLE' },
    { name: 'Bearer Service Token', raw: 'Authorization: Bearer mockguard_test_bearer_token_1234567890', token: 'mockguard_test_bearer_token_1234567890' },
    { name: 'API Key Parameter', raw: 'api_key=mockguard_test_api_key_ABCDEFGHIJKLMNOP', token: 'mockguard_test_api_key_ABCDEFGHIJKLMNOP' },
    { name: 'RSA Private Key Block', raw: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y\n-----END RSA PRIVATE KEY-----', token: 'MIIEowIBAAKCAQEA0Y' },
  ];

  for (const sample of secretSamples) {
    const redacted = SecretRedactor.redact(sample.raw);
    assert.strictEqual(
      redacted.includes(sample.token),
      false,
      `SecretRedactor leaked ${sample.name}`
    );
    assert.strictEqual(
      redacted.includes('[REDACTED_SECRET]'),
      true,
      `SecretRedactor missing placeholder for ${sample.name}`
    );
  }
});

test('Adversarial 2: ProcessSupervisor passes args without shell evaluation', async () => {
  const supervisor = new BoundedProcessSupervisor();

  // Adversarial argument containing shell injection payloads
  const injectionPayload = '; echo INJECTED_EXECUTION ; echo $(whoami) & calc.exe | echo piped';

  // Spawn node printing process.argv[1] verbatim
  const result = await supervisor.execute(process.execPath, ['-e', 'console.log(process.argv[1]);', injectionPayload], {
    timeoutMs: 5000,
  });

  assert.strictEqual(result.exitCode, 0);
  // The argument must be received as literal text without executing shell commands
  assert.strictEqual(result.stdout.trim(), injectionPayload);
});

test('Adversarial 3: ProcessSupervisor safely buffers ANSI sequences and binary control bytes', async () => {
  const supervisor = new BoundedProcessSupervisor();

  // ANSI escape sequence bomb and terminal control characters
  const ansiBombScript = 'console.log("\\x1b[2J\\x1b[H\\x1b[31;1mADVERSARIAL_ANSI\\x1b[0m\\x00\\x07\\x08");';
  const result = await supervisor.execute(process.execPath, ['-e', ansiBombScript], {
    timeoutMs: 5000,
  });

  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.includes('ADVERSARIAL_ANSI'));
});

test('Adversarial 4: ProjectDiscovery rejects root escaping path traversals and invalid targets', () => {
  const nonExistentTraversals = [
    '../../../../../../../../../../nonexistent_mockguard_path_etc_passwd',
    './some/deep/nonexistent/subfolder/../../../../../fake_nonexistent_shadow',
  ];

  for (const tp of nonExistentTraversals) {
    assert.throws(
      () => ProjectDiscovery.discover(tp),
      /Project directory does not exist/,
      `ProjectDiscovery failed to reject nonexistent traversal: ${tp}`
    );
  }

  // Passing a file target instead of a directory
  assert.throws(
    () => ProjectDiscovery.discover(path.resolve('package.json')),
    /Target path is not a directory/,
    'ProjectDiscovery allowed a file target when directory was expected'
  );

  // Passing a non-existent explicit Jest config path
  assert.throws(
    () => ProjectDiscovery.discover(process.cwd(), '../../../../../../etc/fake-jest.config.js'),
    /Explicit Jest config.*not found/,
    'ProjectDiscovery allowed non-existent explicit config'
  );
});

test('Adversarial 5: Release Checksums file verifies against SHA256 digests', async () => {
  const checksumFilePath = path.resolve('dist', 'SHA256SUMS.txt');
  if (!fs.existsSync(checksumFilePath)) {
    // Dynamically generate checksums if not yet generated
    const { generateChecksums } = await import(
      new URL('../../scripts/generate-checksums.js', import.meta.url).href
    );
    generateChecksums();
  }

  const lines = fs.readFileSync(checksumFilePath, 'utf-8').trim().split('\n');
  assert.ok(lines.length >= 2, 'Checksum file must contain at least tarball and SBOM entries');

  for (const line of lines) {
    const [expectedHash, fileName] = line.trim().split(/\s+/);
    const targetFile = path.resolve('dist', fileName);
    assert.ok(fs.existsSync(targetFile), `Target artifact must exist: ${fileName}`);

    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');
    assert.strictEqual(actualHash, expectedHash, `Hash mismatch for ${fileName}`);
  }
});
