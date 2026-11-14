import { DiscoveredTestBlock, TestFileAnalysis } from '../model.js';
import { Finding } from './types.js';

export function evaluateUnsupportedPatterns(
  fileAnalysis: TestFileAnalysis,
  block?: DiscoveredTestBlock
): Finding[] {
  const findings: Finding[] = [];

  // 1. File-level unsupported constructs (e.g., eval, Function, non-literal dynamic import)
  if (!block && fileAnalysis.unsupportedConstructs) {
    for (const uc of fileAnalysis.unsupportedConstructs) {
      findings.push({
        id: `FINDING-UNSUPPORTED_PATTERN-file-${findings.length + 1}`,
        kind: 'UNSUPPORTED_PATTERN',
        confidence: 'unverified',
        message: `Dynamic construct detected: ${uc.reason}. Static analysis abstains from heuristic speculation.`,
        locations: [uc.location],
        evidence: [
          `File-level construct '${uc.reason}' at ${uc.location.filePath}:${uc.location.span.startLine}.`,
          `Unresolved dynamic syntax cannot be safely proven without runtime execution.`,
        ],
      });
    }
  }

  // 2. Block-level unsupported constructs
  if (block) {
    // Dynamic computed SUT invocations (e.g. sut[method]())
    for (const inv of block.invocations) {
      if (inv.resolution.status === 'unsupported') {
        findings.push({
          id: `FINDING-UNSUPPORTED_PATTERN-${block.id}-${findings.length + 1}`,
          kind: 'UNSUPPORTED_PATTERN',
          confidence: 'unverified',
          message: `Unsupported dynamic invocation in '${block.name}': ${inv.resolution.reason}`,
          locations: [inv.location],
          evidence: [
            `Target invocation '${inv.expressionText}' uses dynamic computed resolution.`,
            `Reason: ${inv.resolution.reason}`,
          ],
        });
      }
    }

    // Dynamic mock targets (e.g. jest.spyOn(obj, computedVar))
    for (const mc of block.mockCalls) {
      if (mc.isDynamicComputedTarget) {
        findings.push({
          id: `FINDING-UNSUPPORTED_PATTERN-${block.id}-${findings.length + 1}`,
          kind: 'UNSUPPORTED_PATTERN',
          confidence: 'unverified',
          message: `Dynamic mock target in '${block.name}': '${mc.rawExpression}' cannot be resolved statically.`,
          locations: [mc.location],
          evidence: [
            `Mock expression '${mc.rawExpression}' utilizes dynamic computed property access.`,
          ],
        });
      }
    }

    // Dynamic assertion targets (e.g. expect(obj[prop]).toBe(...))
    for (const assertion of block.assertions) {
      if (assertion.isDynamicComputed || assertion.matcherKind === 'unsupported_dynamic') {
        findings.push({
          id: `FINDING-UNSUPPORTED_PATTERN-${block.id}-${findings.length + 1}`,
          kind: 'UNSUPPORTED_PATTERN',
          confidence: 'unverified',
          message: `Dynamic computed assertion in '${block.name}': '${assertion.rawExpression}'.`,
          locations: [assertion.location],
          evidence: [
            `Assertion expression '${assertion.rawExpression}' utilizes dynamic computed evaluation.`,
          ],
        });
      }
    }
  }

  return findings;
}
