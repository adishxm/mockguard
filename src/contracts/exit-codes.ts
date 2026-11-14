/**
 * Stable exit codes for MockGuard CLI.
 */
export enum ExitCode {
  SUCCESS = 0,
  /** Weak test or surviving mutant detected */
  FINDINGS_DETECTED = 1,
  /** Baseline test suite failed - mutation blocked */
  BASELINE_FAILED = 2,
  /** Execution timeout exceeded */
  TIMEOUT = 3,
  /** Configuration error or invalid arguments */
  CONFIG_ERROR = 4,
  /** Internal or unhandled error */
  INTERNAL_ERROR = 5,
}
