import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface DiscoveredProject {
  projectRoot: string;
  hasPackageJson: boolean;
  packageJsonPath?: string;
  packageJsonData?: Record<string, unknown>;
  testScript?: string;
  jestConfigPath?: string;
  isMonorepo: boolean;
  monorepoProjects: string[];
  resolvedConfigHash: string;
}

export const KNOWN_JEST_CONFIG_FILES = [
  'jest.config.js',
  'jest.config.ts',
  'jest.config.mjs',
  'jest.config.cjs',
  'jest.config.json',
];

export class ProjectDiscovery {
  public static discover(
    targetDir: string,
    explicitConfigPath?: string
  ): DiscoveredProject {
    const root = path.resolve(targetDir);

    if (!fs.existsSync(root)) {
      throw new Error(`Project directory does not exist: ${root}`);
    }

    const stat = fs.statSync(root);
    if (!stat.isDirectory()) {
      throw new Error(`Target path is not a directory: ${root}`);
    }

    const packageJsonPath = path.join(root, 'package.json');
    let hasPackageJson = false;
    let packageJsonData: Record<string, unknown> | undefined;
    let testScript: string | undefined;

    if (fs.existsSync(packageJsonPath)) {
      try {
        const raw = fs.readFileSync(packageJsonPath, 'utf-8');
        packageJsonData = JSON.parse(raw);
        hasPackageJson = true;

        if (
          packageJsonData &&
          typeof packageJsonData === 'object' &&
          'scripts' in packageJsonData &&
          typeof packageJsonData.scripts === 'object' &&
          packageJsonData.scripts !== null &&
          'test' in packageJsonData.scripts
        ) {
          testScript = String(
            (packageJsonData.scripts as Record<string, unknown>).test
          );
        }
      } catch (err) {
        throw new Error(
          `Malformed package.json at ${packageJsonPath}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Resolve Jest config file
    let jestConfigPath: string | undefined;

    if (explicitConfigPath) {
      const resolvedExplicit = path.resolve(explicitConfigPath);
      if (!fs.existsSync(resolvedExplicit)) {
        throw new Error(
          `Explicit Jest config file not found: ${resolvedExplicit}`
        );
      }
      jestConfigPath = resolvedExplicit;
    } else {
      // Search standard files
      for (const candidate of KNOWN_JEST_CONFIG_FILES) {
        const p = path.join(root, candidate);
        if (fs.existsSync(p)) {
          jestConfigPath = p;
          break;
        }
      }

      // Check package.json jest field
      if (
        !jestConfigPath &&
        packageJsonData &&
        typeof packageJsonData === 'object' &&
        'jest' in packageJsonData
      ) {
        jestConfigPath = `${packageJsonPath}#jest`;
      }
    }

    // Check for monorepo setups
    let isMonorepo = false;
    const monorepoProjects: string[] = [];

    if (packageJsonData && 'workspaces' in packageJsonData) {
      isMonorepo = true;
      if (Array.isArray(packageJsonData.workspaces)) {
        monorepoProjects.push(...packageJsonData.workspaces.map(String));
      }
    }

    const lernaJson = path.join(root, 'lerna.json');
    const pnpmWorkspace = path.join(root, 'pnpm-workspace.yaml');
    if (fs.existsSync(lernaJson) || fs.existsSync(pnpmWorkspace)) {
      isMonorepo = true;
    }

    // Compute deterministic config hash
    const hash = crypto.createHash('sha256');
    hash.update(root);
    if (jestConfigPath) {
      hash.update(jestConfigPath);
      if (fs.existsSync(jestConfigPath)) {
        hash.update(fs.readFileSync(jestConfigPath));
      }
    }
    if (testScript) {
      hash.update(testScript);
    }
    const resolvedConfigHash = hash.digest('hex');

    return {
      projectRoot: root,
      hasPackageJson,
      packageJsonPath: hasPackageJson ? packageJsonPath : undefined,
      packageJsonData,
      testScript,
      jestConfigPath,
      isMonorepo,
      monorepoProjects,
      resolvedConfigHash,
    };
  }
}
