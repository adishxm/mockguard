import path from 'node:path';

export interface CliOptions {
  command: 'verify' | 'baseline' | 'help' | 'version';
  targetPath: string;
  configPath?: string;
  format: 'terminal' | 'json';
  outFile?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  concurrency: number;
  testMatch?: string;
  bail: boolean;
}

export const DEFAULT_CLI_OPTIONS: CliOptions = {
  command: 'verify',
  targetPath: '.',
  format: 'terminal',
  timeoutMs: 60_000,
  maxOutputBytes: 10 * 1024 * 1024, // 10 MB
  concurrency: 1,
  bail: false,
};

export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULT_CLI_OPTIONS };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.command = 'help';
      return options;
    }

    if (arg === '--version' || arg === '-v') {
      options.command = 'version';
      return options;
    }

    if (arg === '--config' || arg === '-c') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a path argument.`);
      }
      options.configPath = path.resolve(next);
      continue;
    }

    if (arg.startsWith('--config=')) {
      options.configPath = path.resolve(arg.slice('--config='.length));
      continue;
    }

    if (arg === '--format' || arg === '-f') {
      const next = args[++i];
      if (next !== 'terminal' && next !== 'json') {
        throw new Error(`Invalid format "${next}". Allowed: terminal, json`);
      }
      options.format = next;
      continue;
    }

    if (arg.startsWith('--format=')) {
      const val = arg.slice('--format='.length);
      if (val !== 'terminal' && val !== 'json') {
        throw new Error(`Invalid format "${val}". Allowed: terminal, json`);
      }
      options.format = val;
      continue;
    }

    if (arg === '--out' || arg === '-o') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a file path argument.`);
      }
      options.outFile = path.resolve(next);
      continue;
    }

    if (arg.startsWith('--out=')) {
      options.outFile = path.resolve(arg.slice('--out='.length));
      continue;
    }

    if (arg === '--timeout') {
      const next = args[++i];
      const parsed = parseInt(next, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag --timeout requires a positive integer (ms).`);
      }
      options.timeoutMs = parsed;
      continue;
    }

    if (arg.startsWith('--timeout=')) {
      const parsed = parseInt(arg.slice('--timeout='.length), 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag --timeout requires a positive integer (ms).`);
      }
      options.timeoutMs = parsed;
      continue;
    }

    if (arg === '--concurrency') {
      const next = args[++i];
      const parsed = parseInt(next, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag --concurrency requires a positive integer.`);
      }
      options.concurrency = parsed;
      continue;
    }

    if (arg.startsWith('--concurrency=')) {
      const parsed = parseInt(arg.slice('--concurrency='.length), 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag --concurrency requires a positive integer.`);
      }
      options.concurrency = parsed;
      continue;
    }

    if (arg === '--testMatch') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag --testMatch requires a glob pattern.`);
      }
      options.testMatch = next;
      continue;
    }

    if (arg.startsWith('--testMatch=')) {
      options.testMatch = arg.slice('--testMatch='.length);
      continue;
    }

    if (arg === '--bail') {
      options.bail = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  if (positional.length > 0) {
    const first = positional[0];
    if (first === 'verify' || first === 'baseline') {
      options.command = first;
      if (positional.length > 1) {
        options.targetPath = path.resolve(positional[1]);
      }
    } else {
      options.targetPath = path.resolve(first);
    }
  }

  return options;
}

export function printHelp(): void {
  console.log(`
MockGuard - Verify whether AI-generated tests protect real behavior

USAGE:
  mockguard [command] [target-directory] [options]

COMMANDS:
  verify       Run full baseline and mutation verification (default)
  baseline     Run Jest baseline test suite only

OPTIONS:
  -c, --config <file>        Explicit path to jest.config.(js|ts|json)
  -f, --format <format>      Output format: 'terminal' | 'json' (default: terminal)
  -o, --out <file>           Output file for JSON report
      --timeout <ms>         Process execution timeout in ms (default: 60000)
      --concurrency <n>      Number of concurrent worker processes (default: 1)
      --testMatch <glob>     Test file pattern to match
      --bail                 Stop on first mutation survival
  -h, --help                 Display this help message
  -v, --version              Display MockGuard version
`);
}
