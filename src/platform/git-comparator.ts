import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { MockGuardReport, Finding } from '../contracts/report.js';

export interface CompareOptions {
  baseRef: string;
  targetPath: string;
  configPath?: string;
  format?: 'terminal' | 'json';
  outFile?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  maxMutants?: number;
  concurrency?: number;
  bail?: boolean;
  testMatch?: string;
}

export interface CompareDeltaReport {
  schemaVersion: 'mockguard.compare.v1';
  baseRef: string;
  baseCommit: string;
  currentCommit: string | null;
  isDirty: boolean;
  baseVerdict?: string;
  currentVerdict?: string;
  baseMutationScore: number | null;
  currentMutationScore: number | null;
  scoreDelta: number | null;
  mutantsKilledDelta: number;
  mutantsSurvivedDelta: number;
  newFindings: Finding[];
  resolvedFindings: Finding[];
  baseReport?: MockGuardReport;
  currentReport?: MockGuardReport;
}

export class GitComparator {
  /**
   * Resolves a Git reference to its 40-character SHA.
   */
  public static resolveCommit(ref: string, cwd: string): string {
    try {
      const sha = execSync(`git rev-parse ${ref}`, {
        cwd,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      if (!sha || sha.length < 7) {
        throw new Error(`Invalid git reference: ${ref}`);
      }
      return sha;
    } catch {
      throw new Error(`Failed to resolve git reference: ${ref}`);
    }
  }

  /**
   * Checks if working directory has uncommitted modifications.
   */
  public static isWorkingTreeDirty(cwd: string): boolean {
    try {
      const out = execSync('git status --porcelain', {
        cwd,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      return out.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Compares the base revision snapshot with current working tree.
   * Creates an isolated temporary git worktree for the base ref,
   * runs verify on both, and calculates diff metrics.
   */
  public static async compare(
    options: CompareOptions,
    verifyFn: (targetDir: string) => Promise<MockGuardReport>
  ): Promise<CompareDeltaReport> {
    const cwd = path.resolve(options.targetPath);
    const baseCommit = this.resolveCommit(options.baseRef, cwd);
    const currentCommit = this.resolveCommit('HEAD', cwd);
    const isDirty = this.isWorkingTreeDirty(cwd);

    // Create temporary worktree for base commit
    const tempBaseDir = path.join(
      os.tmpdir(),
      `mg-worktree-base-${Date.now()}`
    );

    try {
      execSync(`git worktree add --detach "${tempBaseDir}" ${baseCommit}`, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
    } catch (err) {
      throw new Error(
        `Failed to create git worktree for base ref "${options.baseRef}": ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let baseReport: MockGuardReport;
    let currentReport: MockGuardReport;

    try {
      // 1. Run verification on Base
      baseReport = await verifyFn(tempBaseDir);

      // 2. Run verification on Current (includes uncommitted changes)
      currentReport = await verifyFn(cwd);
    } finally {
      // Clean up base worktree
      try {
        execSync(`git worktree remove --force "${tempBaseDir}"`, {
          cwd,
          stdio: ['ignore', 'ignore', 'ignore'],
        });
      } catch {
        // Fallback cleanup
        try {
          fs.rmSync(tempBaseDir, { recursive: true, force: true });
        } catch {
          // Ignored
        }
      }
    }

    // 3. Calculate deltas
    const baseFindings = baseReport.analysis?.findings || [];
    const currentFindings = currentReport.analysis?.findings || [];

    const baseFindingSignatures = new Set(
      baseFindings.map((f) => `${f.kind}:${f.file}:${f.line}`)
    );
    const currentFindingSignatures = new Set(
      currentFindings.map((f) => `${f.kind}:${f.file}:${f.line}`)
    );

    const newFindings = currentFindings.filter(
      (f) => !baseFindingSignatures.has(`${f.kind}:${f.file}:${f.line}`)
    );
    const resolvedFindings = baseFindings.filter(
      (f) => !currentFindingSignatures.has(`${f.kind}:${f.file}:${f.line}`)
    );

    const baseScore = baseReport.mutation?.score ?? null;
    const currentScore = currentReport.mutation?.score ?? null;
    const scoreDelta =
      baseScore !== null && currentScore !== null
        ? Math.round((currentScore - baseScore) * 10) / 10
        : null;

    const mutantsKilledDelta =
      (currentReport.mutation?.killed ?? 0) - (baseReport.mutation?.killed ?? 0);
    const mutantsSurvivedDelta =
      (currentReport.mutation?.survived ?? 0) - (baseReport.mutation?.survived ?? 0);

    return {
      schemaVersion: 'mockguard.compare.v1',
      baseRef: options.baseRef,
      baseCommit,
      currentCommit,
      isDirty,
      baseVerdict: baseReport.verdict,
      currentVerdict: currentReport.verdict,
      baseMutationScore: baseScore,
      currentMutationScore: currentScore,
      scoreDelta,
      mutantsKilledDelta,
      mutantsSurvivedDelta,
      newFindings,
      resolvedFindings,
      baseReport,
      currentReport,
    };
  }

  public static renderTerminal(report: CompareDeltaReport): string {
    const lines: string[] = [];
    lines.push('======================================================');
    lines.push('            MOCKGUARD REVISION COMPARISON             ');
    lines.push('======================================================');
    lines.push(`Base Ref:        ${report.baseRef} (${report.baseCommit.slice(0, 8)})`);
    lines.push(`Current HEAD:    ${report.currentCommit ? report.currentCommit.slice(0, 8) : 'N/A'}${report.isDirty ? ' (DIRTY - Uncommitted Changes)' : ' (Clean)'}`);
    lines.push('------------------------------------------------------');
    lines.push(`Base Verdict:    ${report.baseVerdict || 'UNKNOWN'}`);
    lines.push(`Current Verdict: ${report.currentVerdict || 'UNKNOWN'}`);
    lines.push('------------------------------------------------------');

    if (report.baseMutationScore !== null || report.currentMutationScore !== null) {
      const baseStr = report.baseMutationScore !== null ? `${report.baseMutationScore}%` : 'N/A';
      const curStr = report.currentMutationScore !== null ? `${report.currentMutationScore}%` : 'N/A';
      const deltaStr = report.scoreDelta !== null ? `${report.scoreDelta >= 0 ? '+' : ''}${report.scoreDelta}%` : 'N/A';
      lines.push(`Mutation Score:  ${baseStr} -> ${curStr} (Delta: ${deltaStr})`);
    } else {
      lines.push('Mutation Score:  N/A (Baseline failed or zero valid mutants)');
    }

    lines.push(`Mutants Killed:  ${report.mutantsKilledDelta >= 0 ? '+' : ''}${report.mutantsKilledDelta}`);
    lines.push(`Mutants Surv.:   ${report.mutantsSurvivedDelta >= 0 ? '+' : ''}${report.mutantsSurvivedDelta}`);
    lines.push('------------------------------------------------------');
    lines.push(`New Findings:    ${report.newFindings.length}`);
    for (const f of report.newFindings) {
      lines.push(`  + [${f.kind}] ${f.file || 'unknown'}:${f.line || '?'}`);
    }
    lines.push(`Resolved:        ${report.resolvedFindings.length}`);
    for (const f of report.resolvedFindings) {
      lines.push(`  - [${f.kind}] ${f.file || 'unknown'}:${f.line || '?'}`);
    }
    lines.push('======================================================');

    return lines.join('\n');
  }
}
