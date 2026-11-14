import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('Security & Supply Chain: Generate valid SPDX 2.3 SBOM', async () => {
  const scriptPath = path.resolve('scripts/generate-sbom.js');
  const { generateSbom } = await import(pathToFileURL(scriptPath).href);
  const sbom = generateSbom();

  assert.strictEqual(sbom.spdxVersion, 'SPDX-2.3');
  assert.strictEqual(sbom.dataLicense, 'CC0-1.0');
  assert.ok(sbom.packages.length >= 2, 'Must include root package and dependencies');
  
  const root = sbom.packages.find((p: any) => p.SPDXID === 'SPDXRef-Package-Root');
  assert.ok(root, 'Root package must be defined');
  assert.strictEqual(root.name, 'mockguard');
  assert.strictEqual(root.licenseDeclared, 'Apache-2.0');

  assert.ok(sbom.relationships.length > 0, 'Dependencies relationships must be documented');
});
