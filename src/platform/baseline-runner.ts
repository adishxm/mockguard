import {
  BoundedProcessSupervisor,
  SupervisorOptions,
} from './process-supervisor.js';
import { ResolvedTestCommand } from './config-resolver.js';
import { BaselineResult } from '../contracts/report.js';
import { BaselineStatus } from '../contracts/outcomes.js';

export class BaselineRunner {
  private supervisor: BoundedProcessSupervisor;

  constructor(supervisor?: BoundedProcessSupervisor) {
    this.supervisor = supervisor || new BoundedProcessSupervisor();
  }

  public cancel(): void {
    this.supervisor.cancel();
  }

  public async run(
    command: ResolvedTestCommand,
    options: { timeoutMs?: number; maxOutputBytes?: number } = {}
  ): Promise<BaselineResult> {
    const supervisorOptions: SupervisorOptions = {
      cwd: command.cwd,
      timeoutMs: options.timeoutMs ?? 60_000,
      maxOutputBytes: options.maxOutputBytes ?? 10 * 1024 * 1024,
    };

    const processResult = await this.supervisor.execute(
      command.executable,
      command.args,
      supervisorOptions
    );

    let status: BaselineStatus = 'FAIL';
    let testsPassed = 0;
    let testsTotal = 0;

    if (processResult.timedOut) {
      status = 'TIMEOUT';
    } else if (processResult.cancelled) {
      status = 'CANCELLED';
    } else if (processResult.error) {
      status = 'UNSUPPORTED';
    } else if (processResult.exitCode === 0) {
      status = 'PASS';
    } else {
      status = 'FAIL';
    }

    // Parse Jest test count summary from stdout/stderr
    const combinedOutput = `${processResult.stdout}\n${processResult.stderr}`;
    const parsedCounts = this.parseJestSummary(combinedOutput);
    if (parsedCounts) {
      testsPassed = parsedCounts.passed;
      testsTotal = parsedCounts.total;
    } else if (status === 'PASS') {
      // If passing without explicit count, minimum 1
      testsPassed = 1;
      testsTotal = 1;
    }

    return {
      status,
      testsPassed,
      testsTotal,
      durationMs: processResult.durationMs,
      stdout: processResult.stdout,
      stderr: processResult.stderr,
    };
  }

  private parseJestSummary(
    output: string
  ): { passed: number; total: number } | null {
    // Tests:       1 passed, 1 total
    // Tests:       2 failed, 3 passed, 5 total
    const match = output.match(/Tests:\s+([^\n\r]+)/);
    if (!match) return null;

    const summaryLine = match[1];
    let passed = 0;
    let total = 0;

    const passedMatch = summaryLine.match(/(\d+)\s+passed/);
    if (passedMatch) {
      passed = parseInt(passedMatch[1], 10);
    }

    const totalMatch = summaryLine.match(/(\d+)\s+total/);
    if (totalMatch) {
      total = parseInt(totalMatch[1], 10);
    }

    return { passed, total: total || passed };
  }
}
