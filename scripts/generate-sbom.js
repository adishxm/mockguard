import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Generates an SPDX 2.3 compliant Software Bill of Materials (SBOM).
 */
export function generateSbom(projectRoot = process.cwd()) {
  const pkgPath = path.join(projectRoot, 'package.json');
  const lockPath = path.join(projectRoot, 'package-lock.json');

  if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) {
    throw new Error('package.json and package-lock.json must both exist to generate SBOM.');
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

  const timestamp = new Date().toISOString();
  const documentNamespace = `https://github.com/adishxm/mockguard/spdx/${pkg.version}-${Date.now()}`;

  const packages = [
    {
      SPDXID: 'SPDXRef-Package-Root',
      name: pkg.name,
      versionInfo: pkg.version,
      packageSupplier: 'Organization: MockGuard Contributors',
      downloadLocation: 'git+https://github.com/adishxm/mockguard.git',
      filesAnalyzed: false,
      licenseConcluded: pkg.license || 'Apache-2.0',
      licenseDeclared: pkg.license || 'Apache-2.0',
      description: pkg.description || '',
    },
  ];

  const relationships = [];

  const lockPackages = lock.packages || {};
  let depIndex = 1;

  for (const [depKey, depVal] of Object.entries(lockPackages)) {
    if (!depKey || depKey === '') continue; // Skip root package entry

    const depName = depVal.name || depKey.replace(/^node_modules\//, '');
    const depSpdxId = `SPDXRef-Package-${depIndex++}`;

    packages.push({
      SPDXID: depSpdxId,
      name: depName,
      versionInfo: depVal.version || 'unknown',
      packageSupplier: 'NOASSERTION',
      downloadLocation: depVal.resolved || 'NOASSERTION',
      filesAnalyzed: false,
      licenseConcluded: depVal.license || 'NOASSERTION',
      licenseDeclared: depVal.license || 'NOASSERTION',
      checksums: depVal.integrity
        ? [
            {
              algorithm: depVal.integrity.startsWith('sha512-') ? 'SHA512' : 'SHA1',
              checksumValue: depVal.integrity,
            },
          ]
        : [],
    });

    relationships.push({
      spdxElementId: 'SPDXRef-Package-Root',
      relationshipType: 'DEPENDS_ON',
      relatedSpdxElement: depSpdxId,
    });
  }

  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `${pkg.name}-SBOM-${pkg.version}`,
    documentNamespace,
    creationInfo: {
      creators: ['Tool: MockGuard-SBOM-Generator-v1', 'Person: Worker 03 (Security & Release)'],
      created: timestamp,
    },
    packages,
    relationships,
  };
}

if (process.argv[1]?.endsWith('generate-sbom.js')) {
  console.log('[MockGuard SBOM] Generating SPDX 2.3 Software Bill of Materials...');
  const sbom = generateSbom();
  const outDir = path.resolve('dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'mockguard.spdx.json');
  fs.writeFileSync(outFile, JSON.stringify(sbom, null, 2), 'utf-8');
  console.log(`[MockGuard SBOM] PASSED: Generated ${sbom.packages.length} package entries -> ${outFile}`);
  process.exit(0);
}

