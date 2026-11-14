import { Verdict, FindingKind, BaselineStatus } from './outcomes.js';

export interface ToolInfo {
  name: 'mockguard';
  version: string;
}

export interface ProjectInfo {
  root: string;
  commit: string | null;
}

export interface RunnerInfo {
  name: 'jest';
  command: string[];
  exitCode: number;
  durationMs: number;
}

export interface BaselineResult {
  status: BaselineStatus;
  testsPassed: number;
  testsTotal: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
}

export interface Finding {
  id: string;
  kind: FindingKind;
  severity: 'high' | 'medium' | 'low' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  snippet?: string;
  remediation?: string;
}

export interface AnalysisSection {
  findings: Finding[];
}

export interface MutationSection {
  valid: number;
  killed: number;
  survived: number;
  timeouts: number;
  compileErrors: number;
  noCoverage?: number;
  runtimeErrors?: number;
  ignored?: number;
  cancelled?: number;
  pending?: number;
  unsupported?: number;
  score: number | null; // INVARIANT: null when baseline fails
  excludedMutants?: string[];
}

export interface ClaimsSection {
  equivalentMutantsDetected: boolean;
  sandboxed: boolean; // Must remain false unless verified sandbox
}

export interface ArtifactReference {
  name: string;
  path: string;
  sizeBytes: number;
  sha256?: string;
}

export interface MockGuardReport {
  schemaVersion: 'mockguard.report.v1';
  tool: ToolInfo;
  project: ProjectInfo;
  runner: RunnerInfo;
  baseline: BaselineResult;
  analysis: AnalysisSection;
  mutation: MutationSection;
  claims: ClaimsSection;
  artifacts: ArtifactReference[];
  verdict?: Verdict;
  runId?: string;
  timestamp?: string;
}
