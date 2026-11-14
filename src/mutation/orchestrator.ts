import {
  MutantDefinition,
  MutantExecutionResult,
  MutationAdapter,
} from './adapter.js';

export interface OrchestratorOptions {
  perMutantTimeoutMs?: number;
  totalTimeoutMs?: number;
  concurrency?: number;
  bail?: boolean;
}

export interface OrchestrationSummary {
  valid: number;
  killed: number;
  survived: number;
  timeouts: number;
  compileErrors: number;
  cancelled: number;
  unsupported: number;
  score: number | null; // Calculated mutation score: killed / (killed + survived)
  results: MutantExecutionResult[];
}

export class MutationOrchestrator {
  private isCancelled = false;

  public cancel(): void {
    this.isCancelled = true;
  }

  public async orchestrate(
    adapter: MutationAdapter,
    mutants: MutantDefinition[],
    testCommand: string[],
    options: OrchestratorOptions = {}
  ): Promise<OrchestrationSummary> {
    const perMutantTimeoutMs = options.perMutantTimeoutMs ?? 15_000;
    const bail = options.bail ?? false;

    let killed = 0;
    let survived = 0;
    let timeouts = 0;
    let compileErrors = 0;
    let cancelled = 0;
    let unsupported = 0;
    const results: MutantExecutionResult[] = [];

    for (const mutant of mutants) {
      if (this.isCancelled) {
        results.push({
          mutantId: mutant.id,
          outcome: 'CANCELLED',
          durationMs: 0,
        });
        cancelled++;
        continue;
      }

      const res = await adapter.testMutant(mutant, testCommand, {
        timeoutMs: perMutantTimeoutMs,
      });

      results.push(res);

      switch (res.outcome) {
        case 'KILLED':
          killed++;
          break;
        case 'SURVIVED':
          survived++;
          if (bail) {
            this.cancel();
          }
          break;
        case 'TIMEOUT':
          timeouts++;
          break;
        case 'COMPILE_ERROR':
          compileErrors++;
          break;
        case 'CANCELLED':
          cancelled++;
          break;
        case 'UNSUPPORTED':
          unsupported++;
          break;
      }
    }

    const totalEvaluated = killed + survived;
    const score =
      totalEvaluated > 0
        ? Math.round((killed / totalEvaluated) * 10000) / 100
        : null;

    return {
      valid: mutants.length,
      killed,
      survived,
      timeouts,
      compileErrors,
      cancelled,
      unsupported,
      score,
      results,
    };
  }
}
