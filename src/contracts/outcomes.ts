/**
 * Core verdict and outcome types for MockGuard.
 * Strictly aligned with .brain/.work/shared/interface_contracts.md
 */

export type Verdict =
  | 'PASS'
  | 'WARN'
  | 'FAIL'
  | 'UNVERIFIED'
  | 'BASELINE_FAILED'
  | 'TIMEOUT'
  | 'UNSUPPORTED';

export type FindingKind =
  | 'MOCK_ASSERTION'
  | 'MOCKED_SUT'
  | 'CALL_ONLY_ASSERTION'
  | 'NO_ASSERTION'
  | 'SURVIVING_MUTANT'
  | 'TIMEOUT'
  | 'COMPILE_ERROR'
  | 'UNSUPPORTED_PATTERN';

export type MutantOutcome =
  | 'KILLED'
  | 'SURVIVED'
  | 'TIMEOUT'
  | 'COMPILE_ERROR'
  | 'CANCELLED'
  | 'UNSUPPORTED';

export type BaselineStatus =
  | 'PASS'
  | 'FAIL'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNSUPPORTED';
