import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  MockGuardReport,
  BaselineResult,
  Finding,
  ArtifactReference,
} from '../contracts/report.js';
import { Verdict } from '../contracts/outcomes.js';
import { DiscoveredProject } from '../platform/project-discovery.js';
import { ResolvedTestCommand } from '../platform/config-resolver.js';
import { OrchestrationSummary } from '../mutation/orchestrator.js';

export class ReportBuilder {
  private static resolveGitCommit(cwd: string): string | null {
    try {
      const sha = execSync('git rev-parse HEAD', {
        cwd,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf-8',
        timeout: 3000,
      }).trim();
      return sha || null;
    } catch {
      return null;
    }
  }

  public static build(params: {
    project: DiscoveredProject;
    command: ResolvedTestCommand;
    baseline: BaselineResult;
    mutation?: OrchestrationSummary;
    findings?: Finding[];
    artifacts?: ArtifactReference[];
    runId?: string;
  }): MockGuardReport {
    const {
      project,
      command,
      baseline,
      mutation,
      findings = [],
      artifacts = [],
      runId,
    } = params;

    // INVARIANT: If baseline fails, mutation score must be null
    let mutationScore: number | null = null;
    let killed = 0;
    let survived = 0;
    let timeouts = 0;
    let compileErrors = 0;
    let valid = 0;

    if (mutation) {
      valid = mutation.valid;
      killed = mutation.killed;
      survived = mutation.survived;
      timeouts = mutation.timeouts;
      compileErrors = mutation.compileErrors;

      if (baseline.status === 'PASS') {
        mutationScore = mutation.score;
      } else {
        mutationScore = null;
      }
    }

    // Determine overall verdict
    let verdict: Verdict = 'PASS';
    if (baseline.status !== 'PASS') {
      verdict = 'BASELINE_FAILED';
    } else if (survived > 0 || findings.some((f) => f.severity === 'high')) {
      verdict = 'FAIL';
    } else if (findings.some((f) => f.severity === 'medium')) {
      verdict = 'WARN';
    } else if (valid === 0 && findings.length === 0) {
      verdict = 'UNVERIFIED';
    }

    const commitSha = this.resolveGitCommit(project.projectRoot);

    return {
      schemaVersion: 'mockguard.report.v1',
      tool: {
        name: 'mockguard',
        version: '0.1.0',
      },
      project: {
        root: project.projectRoot,
        commit: commitSha,
      },
      runner: {
        name: 'jest',
        command: [command.executable, ...command.args],
        exitCode: baseline.status === 'PASS' ? 0 : 1,
        durationMs: baseline.durationMs ?? 0,
      },
      baseline: {
        status: baseline.status,
        testsPassed: baseline.testsPassed,
        testsTotal: baseline.testsTotal,
      },
      analysis: {
        findings,
      },
      mutation: {
        valid,
        killed,
        survived,
        timeouts,
        compileErrors,
        score: mutationScore,
      },
      claims: {
        equivalentMutantsDetected: false,
        sandboxed: false, // Invariant: Must remain false unless verified sandbox
      },
      artifacts,
      verdict,
      runId,
      timestamp: new Date().toISOString(),
    };
  }

  public static writeJson(report: unknown, filePath: string): void {
    const dir = path.dirname(path.resolve(filePath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  }

  public static renderTerminal(report: MockGuardReport): string {
    const lines: string[] = [];

    lines.push('\n======================================================');
    lines.push('               MOCKGUARD VERIFICATION REPORT          ');
    lines.push('======================================================');
    lines.push(`Verdict:         ${report.verdict}`);
    lines.push(`Commit:          ${report.project.commit || 'unknown'}`);
    lines.push(`Baseline:        ${report.baseline.status} (${report.baseline.testsPassed}/${report.baseline.testsTotal} tests passed)`);

    if (report.baseline.status !== 'PASS') {
      lines.push('                 [MUTATION BLOCKED: Baseline must pass]');
    } else if (report.mutation.valid > 0) {
      const scoreStr =
        report.mutation.score !== null ? `${report.mutation.score}%` : 'N/A';
      lines.push(`Mutation Score:  ${scoreStr}`);
      lines.push(`Mutants:         ${report.mutation.killed} killed, ${report.mutation.survived} survived, ${report.mutation.timeouts} timeouts`);
    }

    if (report.analysis.findings.length > 0) {
      lines.push('\nFindings:');
      for (const f of report.analysis.findings) {
        lines.push(`  - [${f.severity.toUpperCase()}] ${f.kind}: ${f.message}`);
        if (f.file && f.line) {
          lines.push(`    at ${f.file}:${f.line}`);
        }
      }
    }

    lines.push('------------------------------------------------------');
    lines.push(`Sandbox status:  sandboxed: false (local execution)`);
    lines.push('======================================================\n');

    return lines.join('\n');
  }
}
