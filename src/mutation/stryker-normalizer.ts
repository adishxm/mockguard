import path from 'node:path';
import { MutantOutcome } from '../contracts/outcomes.js';

export interface StrykerLocation {
  start: { line: number; column: number };
  end?: { line: number; column: number };
}

export interface StrykerMutant {
  id: string;
  mutatorName: string;
  replacement?: string;
  location: StrykerLocation;
  status: string;
  statusReason?: string;
  coveredBy?: string[];
  killedBy?: string[];
  testsCompleted?: number;
  static?: boolean;
}

export interface StrykerFileReport {
  language?: string;
  mutants: StrykerMutant[];
  source?: string;
}

export interface StrykerReport {
  schemaVersion: string;
  thresholds?: { high: number; low: number };
  files: Record<string, StrykerFileReport>;
}

export interface NormalizedMutantRecord {
  id: string;
  file: string;
  operator: string;
  replacement: string;
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
  outcome: MutantOutcome;
  coveredBy: string[];
  killedBy: string[];
  testsCompleted?: number;
  statusReason?: string;
}

export type StrykerNormalizationResult =
  | {
      status: 'SUCCESS';
      schemaVersion: string;
      mutants: NormalizedMutantRecord[];
      counts: Record<MutantOutcome, number>;
    }
  | {
      status: 'REJECTED';
      reason: string;
    };

/**
 * Normalizes a Stryker mutation testing report adhering to the Mutation Testing Elements
 * JSON schema (v1.x / v2.x).
 *
 * Invariants:
 * - Strictly preserves NO_COVERAGE versus SURVIVED distinctions.
 * - Rejects non-Stryker or malformed report structures rather than guessing.
 * - Normalizes file paths cleanly for cross-platform consistency.
 */
export function normalizeStrykerReport(
  rawInput: unknown,
  baseDir?: string
): StrykerNormalizationResult {
  if (!rawInput || typeof rawInput !== 'object') {
    return {
      status: 'REJECTED',
      reason: 'Input must be a non-null JSON object representing a Stryker mutation report.',
    };
  }

  const report = rawInput as Partial<StrykerReport>;

  if (typeof report.schemaVersion !== 'string' || !report.schemaVersion.trim()) {
    return {
      status: 'REJECTED',
      reason: "Missing or invalid 'schemaVersion' field. Expected Mutation Testing Elements schema v1 or v2.",
    };
  }

  if (!report.files || typeof report.files !== 'object' || Array.isArray(report.files)) {
    return {
      status: 'REJECTED',
      reason: "Missing or invalid 'files' map in Stryker report.",
    };
  }

  const counts: Record<MutantOutcome, number> = {
    KILLED: 0,
    SURVIVED: 0,
    NO_COVERAGE: 0,
    TIMEOUT: 0,
    COMPILE_ERROR: 0,
    RUNTIME_ERROR: 0,
    IGNORED: 0,
    CANCELLED: 0,
    PENDING: 0,
    UNSUPPORTED: 0,
  };

  const normalizedMutants: NormalizedMutantRecord[] = [];

  for (const [rawFilePath, fileReport] of Object.entries(report.files)) {
    if (!fileReport || !Array.isArray(fileReport.mutants)) {
      continue;
    }

    const normalizedPath = normalizePath(rawFilePath, baseDir);

    for (const m of fileReport.mutants) {
      if (!m || typeof m.id === 'undefined' || !m.location || !m.location.start) {
        continue;
      }

      const outcome = mapStrykerStatus(m.status);
      counts[outcome]++;

      normalizedMutants.push({
        id: String(m.id),
        file: normalizedPath,
        operator: m.mutatorName || 'UnknownOperator',
        replacement: m.replacement ?? '',
        startLine: m.location.start.line,
        startColumn: m.location.start.column,
        endLine: m.location.end?.line,
        endColumn: m.location.end?.column,
        outcome,
        coveredBy: Array.isArray(m.coveredBy) ? m.coveredBy.map(String) : [],
        killedBy: Array.isArray(m.killedBy) ? m.killedBy.map(String) : [],
        testsCompleted: typeof m.testsCompleted === 'number' ? m.testsCompleted : undefined,
        statusReason: m.statusReason,
      });
    }
  }

  return {
    status: 'SUCCESS',
    schemaVersion: report.schemaVersion,
    mutants: normalizedMutants,
    counts,
  };
}

/**
 * Maps Stryker's mutant status string to MockGuard's core MutantOutcome.
 * Strictly preserves the distinction between NoCoverage and Survived.
 */
export function mapStrykerStatus(strykerStatus: string | undefined): MutantOutcome {
  if (!strykerStatus) {
    return 'UNSUPPORTED';
  }

  const normalized = strykerStatus.trim().toLowerCase();

  switch (normalized) {
    case 'killed':
      return 'KILLED';
    case 'survived':
      return 'SURVIVED';
    case 'nocoverage':
      return 'NO_COVERAGE';
    case 'timeout':
      return 'TIMEOUT';
    case 'compileerror':
      return 'COMPILE_ERROR';
    case 'runtimeerror':
      return 'RUNTIME_ERROR';
    case 'ignored':
      return 'IGNORED';
    case 'pending':
      return 'PENDING';
    default:
      return 'UNSUPPORTED';
  }
}

function normalizePath(p: string, baseDir?: string): string {
  let normalized = p.replace(/\\/g, '/');
  if (baseDir) {
    const absBase = path.resolve(baseDir).replace(/\\/g, '/');
    const absP = path.resolve(baseDir, p).replace(/\\/g, '/');
    if (absP.startsWith(absBase + '/')) {
      normalized = absP.slice(absBase.length + 1);
    }
  }
  return normalized;
}
