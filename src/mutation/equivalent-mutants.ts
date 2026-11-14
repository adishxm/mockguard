import { MutantOutcome } from '../contracts/outcomes.js';
import { NormalizedMutantRecord } from './stryker-normalizer.js';

export interface EquivalentCandidateReport {
  /** Boolean claim required by report schema v1 claims.equivalentMutantsDetected */
  equivalentMutantsDetected: boolean;
  candidateCount: number;
  candidateIds: string[];
  candidates: {
    mutantId: string;
    file: string;
    operator: string;
    reason: string;
  }[];
}

export interface OutcomePartition {
  behavioralKills: string[];
  behavioralSurvivors: string[];
  noCoverage: string[];
  equivalentCandidates: string[];
  infrastructureOutcomes: {
    mutantId: string;
    outcome: MutantOutcome;
  }[];
}

/**
 * EquivalentMutantClassifier identifies syntactic and semantic patterns
 * that represent probable equivalent mutant candidates.
 *
 * Invariants:
 * - Equivalent candidates are strictly labeled as candidates, not confirmed equivalent mutants.
 * - claims.equivalentMutantsDetected is emitted as a boolean.
 * - Does not alter the canonical mutation score formula (killed / (killed + survived + noCoverage)).
 * - Non-behavioral outcomes (TIMEOUT, COMPILE_ERROR, RUNTIME_ERROR, CANCELLED) and equivalent candidates
 *   are partitioned so they are never silently counted as ordinary behavioral survivors.
 */
export class EquivalentMutantClassifier {
  /**
   * Evaluates mutants for candidate equivalent patterns.
   */
  classifyCandidates(mutants: NormalizedMutantRecord[]): EquivalentCandidateReport {
    const candidates: {
      mutantId: string;
      file: string;
      operator: string;
      reason: string;
    }[] = [];

    for (const m of mutants) {
      const reason = this.detectCandidateEquivalence(m);
      if (reason) {
        candidates.push({
          mutantId: m.id,
          file: m.file,
          operator: m.operator,
          reason,
        });
      }
    }

    const candidateIds = candidates.map(c => c.mutantId);

    return {
      equivalentMutantsDetected: candidateIds.length > 0,
      candidateCount: candidateIds.length,
      candidateIds,
      candidates,
    };
  }

  /**
   * Partitions execution outcomes into behavioral vs non-behavioral and candidate sets.
   * Ensures candidates, timeouts, errors, and cancellations are never silently lumped
   * into ordinary behavioral survivors.
   */
  partitionOutcomes(
    mutants: NormalizedMutantRecord[],
    candidateIds: Set<string>
  ): OutcomePartition {
    const behavioralKills: string[] = [];
    const behavioralSurvivors: string[] = [];
    const noCoverage: string[] = [];
    const equivalentCandidates: string[] = [];
    const infrastructureOutcomes: { mutantId: string; outcome: MutantOutcome }[] = [];

    for (const m of mutants) {
      if (candidateIds.has(m.id)) {
        equivalentCandidates.push(m.id);
        continue;
      }

      switch (m.outcome) {
        case 'KILLED':
          behavioralKills.push(m.id);
          break;
        case 'SURVIVED':
          behavioralSurvivors.push(m.id);
          break;
        case 'NO_COVERAGE':
          noCoverage.push(m.id);
          break;
        case 'TIMEOUT':
        case 'COMPILE_ERROR':
        case 'RUNTIME_ERROR':
        case 'CANCELLED':
        case 'IGNORED':
        case 'PENDING':
        case 'UNSUPPORTED':
          infrastructureOutcomes.push({ mutantId: m.id, outcome: m.outcome });
          break;
      }
    }

    return {
      behavioralKills,
      behavioralSurvivors,
      noCoverage,
      equivalentCandidates,
      infrastructureOutcomes,
    };
  }

  private detectCandidateEquivalence(mutant: NormalizedMutantRecord): string | undefined {
    const rep = mutant.replacement?.trim() ?? '';
    const op = mutant.operator.toLowerCase();

    // 1. Logging or diagnostic message mutation (e.g. empty string in console/log call)
    if (
      (op.includes('stringliteral') || op.includes('templateliteral')) &&
      (mutant.file.toLowerCase().includes('log') || mutant.statusReason?.toLowerCase().includes('log'))
    ) {
      return 'Mutation alters logging/diagnostic string literal without modifying control or data flow.';
    }

    // 2. Redundant identity or type coercion mutations (e.g. mutating !!x where x is boolean)
    if (rep === 'Boolean(true)' || rep === 'Boolean(false)' || rep === '!false' || rep === '!true') {
      return 'Mutation transforms constant boolean into semantically identical identity assertion.';
    }

    // 3. String concatenation with empty string
    if (rep.endsWith(" + ''") || rep.startsWith("'' + ") || rep === '""') {
      if (op.includes('string') && mutant.statusReason?.includes('noop')) {
        return 'Mutation represents identity string concatenation without functional divergence.';
      }
    }

    return undefined;
  }
}
