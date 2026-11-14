declare module '*scripts/test-runner.js' {
  export function filterTestRunnerArgs(args: string[]): string[];
  export function findTestFiles(dir: string): string[];
  export function runTests(argv?: string[]): number;
}
