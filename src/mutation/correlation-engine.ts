import { Finding } from '../analysis/rules/types.js';
import { DiscoveredTestBlock } from '../analysis/model.js';
import { ProductionSymbolTarget } from '../analysis/symbol-resolver.js';
import { MutantOutcome, FindingKind } from '../contracts/outcomes.js';
import { NormalizedMutantRecord } from './stryker-normalizer.js';

export interface PerTestEvidence {
  testId: string;
  testName: string;
  filePath: string;
  coveredMutantIds: string[];
  killedMutantIds: string[];
  killAttribution: {
    mutantId: string;
    cause: 'UNKNOWN'; // Cause strictly kept unknown unless validated
  }[];
}

export interface CorroboratingEvidenceMatch {
  findingId: string;
  findingKind: FindingKind;
  testId: string;
  testName: string;
  mutantId: string;
  mutantOutcome: MutantOutcome;
  sutFilePath: string;
  mutantLine: number;
  relationship: 'CORROBORATING_SURVIVOR' | 'CORROBORATING_COVERAGE';
  note: string;
}

export type CorrelationAbstentionReason =
  | 'MISSING_SUT_PATH_MATCH'
  | 'AMBIGUOUS_TEST_ID'
  | 'MISSING_TEST_ID'
  | 'NO_COVERAGE'
  | 'NON_CORRELATABLE_OUTCOME';

export interface CorrelationAbstention {
  reason: CorrelationAbstentionReason;
  details: string;
  findingId?: string;
  mutantId?: string;
  testId?: string;
}

export interface CorrelationResult {
  perTestEvidence: Map<string, PerTestEvidence>;
  corroboratingMatches: CorroboratingEvidenceMatch[];
  abstentions: CorrelationAbstention[];
}

export interface CorrelationOptions {
  /** Optional explicit map from Stryker test ID to MockGuard DiscoveredTestBlock ID */
  testIdMapping?: Record<string, string>;
}

export class MutationCorrelationEngine {
  /**
   * Correlates static findings with normalized dynamic mutation outcomes under strict guardrails.
   *
   * Invariants:
   * - Correlates only when test IDs map uniquely, coverage is present, and the mutant is on the canonical SUT path.
   * - If any link is missing or ambiguous, abstains immediately with explicit reasons.
   * - Valid matches are labeled strictly as 'corroborating evidence'; finding confidence is never inflated.
   * - Never emits PROVEN, REDUNDANT, or VACUOUS.
   * - killedBy is treated as test-failure attribution only; kill cause remains UNKNOWN.
   */
  correlate(
    findings: Finding[],
    mutants: NormalizedMutantRecord[],
    testBlocks: DiscoveredTestBlock[],
    sutTarget?: ProductionSymbolTarget,
    options: CorrelationOptions = {}
  ): CorrelationResult {
    const corroboratingMatches: CorroboratingEvidenceMatch[] = [];
    const abstentions: CorrelationAbstention[] = [];
    const perTestEvidence = new Map<string, PerTestEvidence>();

    // 1. Resolve Test ID Mapping
    const { strykerToBlockMap, mappingAbstentions } = this.resolveTestIdMappings(
      testBlocks,
      mutants,
      options.testIdMapping
    );
    abstentions.push(...mappingAbstentions);

    // 2. Build Per-Test Evidence for Unambiguously Mapped Test Blocks
    for (const [strykerTestId, block] of strykerToBlockMap.entries()) {
      const coveredMutants = mutants.filter(m => m.coveredBy.includes(strykerTestId));
      const killedMutants = mutants.filter(m => m.killedBy.includes(strykerTestId));

      perTestEvidence.set(block.id, {
        testId: block.id,
        testName: block.name,
        filePath: block.location.filePath,
        coveredMutantIds: coveredMutants.map(m => m.id),
        killedMutantIds: killedMutants.map(m => m.id),
        killAttribution: killedMutants.map(m => ({
          mutantId: m.id,
          cause: 'UNKNOWN', // Invariant: kill cause is unknown without validated classification
        })),
      });
    }

    // 3. Correlate Static Findings with Dynamic Mutants
    const normalizedSutPath = sutTarget?.canonicalFilePath
      ? this.normalizePath(sutTarget.canonicalFilePath)
      : undefined;

    for (const finding of findings) {
      const associatedBlock = this.findBlockForFinding(finding, testBlocks);
      if (!associatedBlock) {
        continue;
      }

      // Find the Stryker test ID mapped to this block
      const strykerTestId = this.findStrykerIdForBlock(associatedBlock.id, strykerToBlockMap);
      if (!strykerTestId) {
        abstentions.push({
          reason: 'MISSING_TEST_ID',
          findingId: finding.id,
          testId: associatedBlock.id,
          details: `Test block '${associatedBlock.name}' (${associatedBlock.id}) has no unambiguous Stryker test ID mapping.`,
        });
        continue;
      }

      for (const mutant of mutants) {
        const normalizedMutantPath = this.normalizePath(mutant.file);

        // Guardrail 1: Canonical SUT path match
        if (normalizedSutPath && !normalizedMutantPath.endsWith(normalizedSutPath)) {
          abstentions.push({
            reason: 'MISSING_SUT_PATH_MATCH',
            findingId: finding.id,
            mutantId: mutant.id,
            testId: associatedBlock.id,
            details: `Mutant ${mutant.id} file '${mutant.file}' does not match canonical SUT path '${sutTarget?.canonicalFilePath}'.`,
          });
          continue;
        }

        // Guardrail 2: Coverage must be present
        if (mutant.outcome === 'NO_COVERAGE' || !mutant.coveredBy.includes(strykerTestId)) {
          abstentions.push({
            reason: 'NO_COVERAGE',
            findingId: finding.id,
            mutantId: mutant.id,
            testId: associatedBlock.id,
            details: `Mutant ${mutant.id} has no execution coverage from test block '${associatedBlock.name}'.`,
          });
          continue;
        }

        // Guardrail 3: Corroborating dynamic match for surviving mutants
        if (mutant.outcome === 'SURVIVED') {
          corroboratingMatches.push({
            findingId: finding.id,
            findingKind: finding.kind,
            testId: associatedBlock.id,
            testName: associatedBlock.name,
            mutantId: mutant.id,
            mutantOutcome: mutant.outcome,
            sutFilePath: sutTarget?.canonicalFilePath ?? mutant.file,
            mutantLine: mutant.startLine,
            relationship: 'CORROBORATING_SURVIVOR',
            note: `Surviving mutant ${mutant.id} on SUT path corroborated by static finding '${finding.kind}' on test '${associatedBlock.name}'.`,
          });
        }
      }
    }

    return {
      perTestEvidence,
      corroboratingMatches,
      abstentions,
    };
  }

  private resolveTestIdMappings(
    testBlocks: DiscoveredTestBlock[],
    mutants: NormalizedMutantRecord[],
    explicitMapping?: Record<string, string>
  ): {
    strykerToBlockMap: Map<string, DiscoveredTestBlock>;
    mappingAbstentions: CorrelationAbstention[];
  } {
    const strykerToBlockMap = new Map<string, DiscoveredTestBlock>();
    const mappingAbstentions: CorrelationAbstention[] = [];

    // Collect all unique Stryker test IDs referenced in mutants or explicit mappings
    const allStrykerTestIds = new Set<string>();
    if (explicitMapping) {
      for (const id of Object.keys(explicitMapping)) allStrykerTestIds.add(id);
    }
    for (const m of mutants) {
      for (const id of m.coveredBy) allStrykerTestIds.add(id);
      for (const id of m.killedBy) allStrykerTestIds.add(id);
    }

    for (const strykerId of allStrykerTestIds) {
      // 1. Explicit mapping provided
      if (explicitMapping && explicitMapping[strykerId]) {
        const targetBlockId = explicitMapping[strykerId];
        const matched = testBlocks.find(b => b.id === targetBlockId);
        if (matched) {
          strykerToBlockMap.set(strykerId, matched);
          continue;
        }
      }

      // 2. Direct ID or Name match
      const matchingBlocks = testBlocks.filter(
        b => b.id === strykerId || b.name === strykerId || strykerId.includes(b.name)
      );

      if (matchingBlocks.length === 1) {
        strykerToBlockMap.set(strykerId, matchingBlocks[0]);
      } else if (matchingBlocks.length > 1) {
        // Guardrail: Ambiguous mapping -> Abstain
        mappingAbstentions.push({
          reason: 'AMBIGUOUS_TEST_ID',
          testId: strykerId,
          details: `Stryker test ID '${strykerId}' ambiguously matches ${matchingBlocks.length} test blocks: ${matchingBlocks.map(b => b.id).join(', ')}.`,
        });
      } else {
        // Guardrail: Missing mapping -> Abstain
        mappingAbstentions.push({
          reason: 'MISSING_TEST_ID',
          testId: strykerId,
          details: `Stryker test ID '${strykerId}' could not be mapped to any discovered test block.`,
        });
      }
    }

    return { strykerToBlockMap, mappingAbstentions };
  }

  private findBlockForFinding(
    finding: Finding,
    testBlocks: DiscoveredTestBlock[]
  ): DiscoveredTestBlock | undefined {
    // 1. Match by finding ID if it incorporates block ID
    const matchedById = testBlocks.find(b => finding.id.includes(b.id));
    if (matchedById) return matchedById;

    // 2. Match by source location line containment
    for (const loc of finding.locations) {
      const match = testBlocks.find(
        b =>
          b.location.filePath === loc.filePath &&
          loc.span.startLine >= b.location.span.startLine &&
          loc.span.endLine <= b.location.span.endLine
      );
      if (match) return match;
    }

    return undefined;
  }

  private findStrykerIdForBlock(
    blockId: string,
    mapping: Map<string, DiscoveredTestBlock>
  ): string | undefined {
    for (const [strykerId, block] of mapping.entries()) {
      if (block.id === blockId) {
        return strykerId;
      }
    }
    return undefined;
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
  }
}
