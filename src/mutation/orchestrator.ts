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
    this.isCancelled = false;

    const perMutantTimeoutMs = options.perMutantTimeoutMs ?? 15_000;
    const totalTimeoutMs = options.totalTimeoutMs ?? 300_000;
    const concurrency = Math.max(1, options.concurrency ?? 1);
    const bail = options.bail ?? false;

    let killed = 0;
    let survived = 0;
    let timeouts = 0;
    let compileErrors = 0;
    let cancelled = 0;
    let unsupported = 0;
    const results: MutantExecutionResult[] = new Array(mutants.length);

    // Enforce total-run timeout
    const startTime = Date.now();
    let totalTimeoutHandle: NodeJS.Timeout | null = null;
    if (totalTimeoutMs > 0) {
      totalTimeoutHandle = setTimeout(() => {
        this.cancel();
      }, totalTimeoutMs);
    }

    // Bounded concurrency worker pool
    let currentIndex = 0;
    const executeWorker = async (): Promise<void> => {
      while (currentIndex < mutants.length) {
        if (this.isCancelled || (totalTimeoutMs > 0 && Date.now() - startTime >= totalTimeoutMs)) {
          this.cancel();
          const idx = currentIndex++;
          if (idx < mutants.length) {
            results[idx] = {
              mutantId: mutants[idx].id,
              outcome: 'CANCELLED',
              durationMs: 0,
            };
            cancelled++;
          }
          continue;
        }

        const idx = currentIndex++;
        const mutant = mutants[idx];

        try {
          const res = await adapter.testMutant(mutant, testCommand, {
            timeoutMs: perMutantTimeoutMs,
          });

          results[idx] = res;

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
        } catch (err) {
          results[idx] = {
            mutantId: mutant.id,
            outcome: 'UNSUPPORTED',
            durationMs: 0,
            stderr: err instanceof Error ? err.message : String(err),
          };
          unsupported++;
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let w = 0; w < concurrency; w++) {
      workers.push(executeWorker());
    }

    await Promise.all(workers);

    if (totalTimeoutHandle) {
      clearTimeout(totalTimeoutHandle);
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
