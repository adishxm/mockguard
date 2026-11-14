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
    const isWindows = process.platform === 'win32';

    // 1. If run-jest.js exists in project root, use it directly with node
    const runJestScript = path.join(cwd, 'run-jest.js');
    if (fs.existsSync(runJestScript)) {
      const args: string[] = [runJestScript];
      if (options.testMatch) args.push('--testMatch', options.testMatch);
      if (options.testNamePattern) args.push('--testNamePattern', options.testNamePattern);
      if (options.changed) args.push('--onlyChanged');
      if (options.bail) args.push('--bail');
      args.push('--no-colors');

      return {
        executable: process.execPath,
        args,
        cwd,
        configPath: project.jestConfigPath,
        isCustomScript: true,
      };
    }

    // 2. Check if local jest binary exists in node_modules
    const jestBinName = isWindows ? 'jest.cmd' : 'jest';
    const localJest = path.join(cwd, 'node_modules', '.bin', jestBinName);

    let executable: string;
    const args: string[] = [];
    let isCustomScript = false;

    if (fs.existsSync(localJest)) {
      executable = localJest;
    } else {
      // On Windows, prefer node + npx-cli.js to avoid CVE-2024-27980 spawn EINVAL
      const npxCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
      if (isWindows && fs.existsSync(npxCli)) {
        executable = process.execPath;
        args.push(npxCli, 'jest');
      } else {
        executable = isWindows ? 'npx.cmd' : 'npx';
        args.push('jest');
      }
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
