import { MutantOutcome } from '../contracts/outcomes.js';

export type StabilityStatus = 'STABLE' | 'FLAKY' | 'INDETERMINATE';

export interface StabilityClassification {
  status: StabilityStatus;
  totalRuns: number;
  comparableRuns: number;
  outcome?: MutantOutcome;
  variance?: MutantOutcome[];
  reason?: string;
}

/**
 * FlakinessClassifier analyzes repeated mutant execution outcomes
 * supplied by Worker 01's execution lifecycle.
 *
 * Invariants:
 * - Worker 02 never performs retries, process spawning, or runner loops.
 * - Operates purely as an analytical classifier on arrays of outcomes.
 * - Enforces comparable outcomes (KILLED, SURVIVED) and minimum evidence (>= 2).
 * - Emits INDETERMINATE when evidence is insufficient.
 */
export class FlakinessClassifier {
  private static readonly COMPARABLE_OUTCOMES = new Set<MutantOutcome>([
    'KILLED',
    'SURVIVED',
  ]);

  /**
   * Evaluates stability across repeated test runs.
   *
   * @param outcomes Array of outcomes for a single mutant across multiple test runs
   * @param minEvidence Minimum number of comparable outcomes required (default: 2)
   */
  classifyStability(
    outcomes: MutantOutcome[],
    minEvidence = 2
  ): StabilityClassification {
    if (!outcomes || outcomes.length === 0) {
      return {
        status: 'INDETERMINATE',
        totalRuns: 0,
        comparableRuns: 0,
        reason: 'Zero execution runs provided. Minimum 2 comparable runs required.',
      };
    }

    // Filter to comparable behavioral outcomes
    const comparable = outcomes.filter(o => FlakinessClassifier.COMPARABLE_OUTCOMES.has(o));

    if (comparable.length < minEvidence) {
      return {
        status: 'INDETERMINATE',
        totalRuns: outcomes.length,
        comparableRuns: comparable.length,
        reason: `Insufficient comparable evidence: observed ${comparable.length} behavioral outcome(s), minimum ${minEvidence} required.`,
      };
    }

    const uniqueOutcomes = Array.from(new Set(comparable));

    if (uniqueOutcomes.length === 1) {
      return {
        status: 'STABLE',
        totalRuns: outcomes.length,
        comparableRuns: comparable.length,
        outcome: uniqueOutcomes[0],
      };
    }

    return {
      status: 'FLAKY',
      totalRuns: outcomes.length,
      comparableRuns: comparable.length,
      variance: uniqueOutcomes,
      reason: `Mutant execution yielded contradictory outcomes across runs: [${comparable.join(', ')}].`,
    };
  }
}
