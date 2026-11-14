import {
  MutantDefinition,
  MutantExecutionResult,
  MutationAdapter,
} from './adapter.js';

export interface OrchestratorOptions {
  perMutantTimeoutMs?: number;
  totalTimeoutMs?: number;
  concurrency?: number;
  delegateConcurrency?: boolean;
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
  noCoverage?: number;
  runtimeErrors?: number;
  ignored?: number;
  pending?: number;
  score: number | null; // Calculated mutation score: killed / (killed + survived + noCoverage)
  runVerdict?: 'COMPLETED' | 'CANCELLED' | 'TIMEOUT';
  results: MutantExecutionResult[];
}

export class MutationOrchestrator {
  private isCancelled = false;
  private wasTimedOut = false;

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
    this.wasTimedOut = false;

    const perMutantTimeoutMs = options.perMutantTimeoutMs ?? 15_000;
    const totalTimeoutMs = options.totalTimeoutMs ?? 300_000;
    const bail = options.bail ?? false;

    // Concurrency default is strictly 1 until sandboxed workspace isolation exists.
    // If delegateConcurrency is true or adapter is Stryker-based, concurrency is delegated.
    const isDelegated =
      options.delegateConcurrency === true ||
      adapter.name.toLowerCase().includes('stryker');
    const concurrency = isDelegated
      ? 1
      : Math.max(1, options.concurrency ?? 1);

    let killed = 0;
    let survived = 0;
    let noCoverage = 0;
    let timeouts = 0;
    let compileErrors = 0;
    let runtimeErrors = 0;
    let ignored = 0;
    let cancelled = 0;
    let pending = 0;
    let unsupported = 0;
    const results: MutantExecutionResult[] = new Array(mutants.length);

    // Enforce total-run timeout
    const startTime = Date.now();
    let totalTimeoutHandle: NodeJS.Timeout | null = null;
    if (totalTimeoutMs > 0) {
      totalTimeoutHandle = setTimeout(() => {
        this.wasTimedOut = true;
        this.cancel();
      }, totalTimeoutMs);
    }

    // Bounded concurrency worker pool
    let currentIndex = 0;
    const executeWorker = async (): Promise<void> => {
      while (currentIndex < mutants.length) {
        // Check if run was already cancelled before taking next mutant
        if (
          this.isCancelled ||
          (totalTimeoutMs > 0 && Date.now() - startTime >= totalTimeoutMs)
        ) {
          if (!this.isCancelled) {
            this.wasTimedOut = true;
            this.cancel();
          }
          const idx = currentIndex++;
          if (idx < mutants.length) {
            results[idx] = {
              mutantId: mutants[idx].id,
              outcome: 'PENDING',
              durationMs: 0,
            };
            pending++;
          }
          continue;
        }

        const idx = currentIndex++;
        const mutant = mutants[idx];
        const mutantStart = Date.now();

        try {
          const res = await adapter.testMutant(mutant, testCommand, {
            timeoutMs: perMutantTimeoutMs,
          });

          // Check if cancellation or timeout fired while testMutant was in-flight
          if (this.isCancelled) {
            results[idx] = {
              mutantId: mutant.id,
              outcome: 'CANCELLED',
              durationMs: Date.now() - mutantStart,
              testFailures: res.testFailures,
              stdout: res.stdout,
              stderr: res.stderr,
              killedBy: res.killedBy,
              testsRan: res.testsRan,
            };
            cancelled++;
            continue;
          }

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
            case 'NO_COVERAGE':
              noCoverage++;
              break;
            case 'TIMEOUT':
              timeouts++;
              break;
            case 'COMPILE_ERROR':
              compileErrors++;
              break;
            case 'RUNTIME_ERROR':
              runtimeErrors++;
              break;
            case 'IGNORED':
              ignored++;
              break;
            case 'CANCELLED':
              cancelled++;
              break;
            case 'PENDING':
              pending++;
              break;
            case 'UNSUPPORTED':
              unsupported++;
              break;
          }
        } catch (err) {
          results[idx] = {
            mutantId: mutant.id,
            outcome: 'RUNTIME_ERROR',
            durationMs: Date.now() - mutantStart,
            stderr: err instanceof Error ? err.message : String(err),
          };
          runtimeErrors++;
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

    // Exclude unexecuted (pending/cancelled) and non-test outcomes (timeouts, errors, ignored)
    const totalEvaluated = killed + survived + noCoverage;
    const score =
      totalEvaluated > 0
        ? Math.round((killed / totalEvaluated) * 10000) / 100
        : null;

    let runVerdict: 'COMPLETED' | 'CANCELLED' | 'TIMEOUT' = 'COMPLETED';
    if (this.wasTimedOut) {
      runVerdict = 'TIMEOUT';
    } else if (this.isCancelled && !bail) {
      runVerdict = 'CANCELLED';
    }

    return {
      valid: mutants.length - ignored,
      killed,
      survived,
      noCoverage,
      timeouts,
      compileErrors,
      runtimeErrors,
      ignored,
      cancelled,
      pending,
      unsupported,
      score,
      runVerdict,
      results,
    };
  }
}
