import { TestFileAnalysis } from '../model.js';
import { ProductionSymbolTarget } from '../symbol-resolver.js';
import { Finding } from './types.js';
import { evaluateMockedSut } from './mocked-sut.js';
import { evaluateNoAssertion } from './no-assertion.js';
import { evaluateCallOnlyAssertion } from './call-only.js';
import { evaluateMockAssertion } from './mock-assertion.js';
import { evaluateUnsupportedPatterns } from './unsupported-pattern.js';

export interface AnalysisRuleResult {
  findings: Finding[];
  totalBlocksAnalyzed: number;
  hasUnsupportedPatterns: boolean;
}

export class AnalysisRuleEngine {
  analyze(analysis: TestFileAnalysis, targetSymbol?: ProductionSymbolTarget): AnalysisRuleResult {
    const rawFindings: Finding[] = [];

    // 1. File-level unsupported constructs
    const fileUnsupported = evaluateUnsupportedPatterns(analysis);
    rawFindings.push(...fileUnsupported);

    // 2. Iterate each discovered test block
    let testBlocksCount = 0;
    for (const block of analysis.testBlocks) {
      if (block.kind === 'it' || block.kind === 'test') {
        testBlocksCount++;
      }

      // Check for block-level unsupported dynamic patterns
      const blockUnsupported = evaluateUnsupportedPatterns(analysis, block);
      rawFindings.push(...blockUnsupported);

      // Rule: MOCKED_SUT (high confidence when SUT implementation is replaced)
      const mockedSutFindings = evaluateMockedSut(block, targetSymbol, analysis.fileLevelMockCalls);
      rawFindings.push(...mockedSutFindings);

      // Rule: NO_ASSERTION (medium confidence when SUT runs with 0 assertions)
      const noAssertionFindings = evaluateNoAssertion(block, targetSymbol);
      rawFindings.push(...noAssertionFindings);

      // Rule: CALL_ONLY_ASSERTION (medium confidence, Upgrade 1 negative side-effect recognition)
      const callOnlyFindings = evaluateCallOnlyAssertion(block, targetSymbol);
      rawFindings.push(...callOnlyFindings);

      // Rule: MOCK_ASSERTION (conservative low/advisory ceiling)
      const mockAssertionFindings = evaluateMockAssertion(block, targetSymbol);
      rawFindings.push(...mockAssertionFindings);
    }

    // Number findings deterministically
    const findings: Finding[] = rawFindings.map((f, idx) => ({
      ...f,
      id: `FINDING-${idx + 1}-${f.kind}`,
    }));

    const hasUnsupportedPatterns = findings.some(f => f.kind === 'UNSUPPORTED_PATTERN');

    return {
      findings,
      totalBlocksAnalyzed: testBlocksCount,
      hasUnsupportedPatterns,
    };
  }
}
