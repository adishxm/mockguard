import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('Security & Release: Distribution tarball hygiene and content allowlist', async () => {
  const scriptPath = path.resolve('scripts/verify-package.js');
  const { verifyPackageTarball } = await import(pathToFileURL(scriptPath).href);
  const audit = verifyPackageTarball();

  assert.strictEqual(audit.valid, true, `Packaging audit failed with violations: ${JSON.stringify(audit.violations)}`);
  assert.strictEqual(audit.violations.length, 0);
  assert.strictEqual(audit.missing.length, 0);
  assert.ok(audit.totalFiles > 0);
  assert.ok(audit.unpackedSizeBytes < 250 * 1024, 'Package size must remain under 250KB');
});
