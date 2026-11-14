import path from 'node:path';
import fs from 'node:fs';
import { DiscoveredProject } from './project-discovery.js';

export interface ResolvedTestCommand {
  executable: string;
  args: string[];
  cwd: string;
  configPath?: string;
  isCustomScript: boolean;
}

export class ConfigResolver {
  public static resolve(
    project: DiscoveredProject,
    options: {
      testMatch?: string;
      bail?: boolean;
      testNamePattern?: string;
      changed?: boolean;
    } = {}
  ): ResolvedTestCommand {
    const cwd = project.projectRoot;

    // Check if local jest binary exists in node_modules
    const isWindows = process.platform === 'win32';
    const jestBinName = isWindows ? 'jest.cmd' : 'jest';
    const localJest = path.join(cwd, 'node_modules', '.bin', jestBinName);

    let executable: string;
    const args: string[] = [];
    let isCustomScript = false;

    if (fs.existsSync(localJest)) {
      executable = localJest;
    } else {
      // Fallback to npx jest
      executable = isWindows ? 'npx.cmd' : 'npx';
      args.push('jest');
    }

    if (project.jestConfigPath && !project.jestConfigPath.includes('#jest')) {
      args.push('--config', project.jestConfigPath);
    }

    if (options.testMatch) {
      args.push('--testMatch', options.testMatch);
    }

    if (options.testNamePattern) {
      args.push('--testNamePattern', options.testNamePattern);
    }

    if (options.changed) {
      args.push('--onlyChanged');
    }

    if (options.bail) {
      args.push('--bail');
    }

    // Always run with colors disabled and json output support where needed
    args.push('--no-colors');

    return {
      executable,
      args,
      cwd,
      configPath: project.jestConfigPath,
      isCustomScript,
    };
  }
}
