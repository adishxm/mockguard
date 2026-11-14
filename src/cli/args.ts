import path from 'node:path';

export interface CliOptions {
  command: 'verify' | 'baseline' | 'compare' | 'help' | 'version';
  targetPath: string;
  configPath?: string;
  baseRef?: string;
  format: 'terminal' | 'json';
  outFile?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  maxMutants?: number;
  concurrency: number;
  testMatch?: string;
  bail: boolean;
  testNamePattern?: string;
  changed?: boolean;
  include?: string;
  exclude?: string;
}

export const DEFAULT_CLI_OPTIONS: CliOptions = {
  command: 'verify',
  targetPath: '.',
  format: 'terminal',
  timeoutMs: 60_000,
  maxOutputBytes: 10 * 1024 * 1024, // 10 MB
  maxMutants: 20,
  concurrency: 1,
  bail: false,
  changed: false,
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

    if (arg === '--base') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a git reference.`);
      }
      options.baseRef = next;
      continue;
    }

    if (arg.startsWith('--base=')) {
      options.baseRef = arg.slice('--base='.length);
      continue;
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

    if (arg === '--max-mutants' || arg === '--maxMutants') {
      const next = args[++i];
      const parsed = parseInt(next, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag ${arg} requires a positive integer.`);
      }
      options.maxMutants = parsed;
      continue;
    }

    if (arg.startsWith('--max-mutants=') || arg.startsWith('--maxMutants=')) {
      const val = arg.includes('--max-mutants=')
        ? arg.slice('--max-mutants='.length)
        : arg.slice('--maxMutants='.length);
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag --max-mutants requires a positive integer.`);
      }
      options.maxMutants = parsed;
      continue;
    }

    if (arg === '--max-output-bytes' || arg === '--maxOutputBytes') {
      const next = args[++i];
      const parsed = parseInt(next, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Flag ${arg} requires a positive integer.`);
      }
      options.maxOutputBytes = parsed;
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

    if (arg === '--testMatch' || arg === '--test-match') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a glob pattern.`);
      }
      options.testMatch = next;
      continue;
    }

    if (arg.startsWith('--testMatch=') || arg.startsWith('--test-match=')) {
      const val = arg.includes('--testMatch=')
        ? arg.slice('--testMatch='.length)
        : arg.slice('--test-match='.length);
      options.testMatch = val;
      continue;
    }

    if (arg === '--include') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a glob pattern.`);
      }
      options.include = next;
      continue;
    }

    if (arg.startsWith('--include=')) {
      options.include = arg.slice('--include='.length);
      continue;
    }

    if (arg === '--exclude') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a glob pattern.`);
      }
      options.exclude = next;
      continue;
    }

    if (arg.startsWith('--exclude=')) {
      options.exclude = arg.slice('--exclude='.length);
      continue;
    }

    if (arg === '--testNamePattern' || arg === '-t') {
      const next = args[++i];
      if (!next || next.startsWith('-')) {
        throw new Error(`Flag ${arg} requires a regex/name pattern.`);
      }
      options.testNamePattern = next;
      continue;
    }

    if (arg.startsWith('--testNamePattern=')) {
      options.testNamePattern = arg.slice('--testNamePattern='.length);
      continue;
    }

    if (arg === '--changed') {
      options.changed = true;
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
    if (first === 'verify' || first === 'baseline' || first === 'compare') {
      options.command = first;
      if (positional.length > 1) {
        options.targetPath = path.resolve(positional[1]);
      }
    } else {
      options.targetPath = path.resolve(first);
    }
  }

  if (options.command === 'compare' && !options.baseRef) {
    throw new Error('Command "compare" requires --base <git-ref>.');
  }

  return options;
}

export function printHelp(): void {
  console.log(`
MockGuard - Verify whether AI-generated tests protect real behavior

USAGE:
  mockguard [command] [target-directory] [options]

COMMANDS:
  verify                       Run full baseline, static analysis, and mutation verification (default)
  baseline                     Run Jest baseline test suite only
  compare --base <git-ref>     Compare base Git revision against current working tree

OPTIONS:
  -c, --config <file>             Explicit path to jest.config.(js|ts|json)
      --base <git-ref>            Base Git commit or reference for "compare" command
  -f, --format <format>           Output format: 'terminal' | 'json' (default: terminal)
  -o, --out <file>                Output file for JSON report
      --timeout <ms>              Process execution timeout in ms (default: 60000)
      --max-mutants <n>           Maximum number of mutants to evaluate (default: 20)
      --concurrency <n>           Number of concurrent worker processes (default: 1)
      --test-match <glob>         Test file pattern to match (e.g. "**/*.test.ts")
      --include <glob>            Source file inclusion pattern
      --exclude <glob>            Source file exclusion pattern
  -t, --testNamePattern <pattern> Run tests matching the regex pattern
      --changed                   Only run tests related to changed files (Git)
      --bail                      Stop on first mutation survival
  -h, --help                      Display this help message
  -v, --version                   Display MockGuard version
`);
}
