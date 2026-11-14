import { DiscoveredTestBlock } from '../model.js';
import { ProductionSymbolTarget } from '../symbol-resolver.js';
import { Finding } from './types.js';

export function evaluateMockAssertion(
  block: DiscoveredTestBlock,
  targetSymbol?: ProductionSymbolTarget
): Finding[] {
  // Only evaluate leaf test cases
  if (block.kind !== 'it' && block.kind !== 'test') {
    return [];
  }

  const findings: Finding[] = [];

  // Gather identifiers of mocks configured in this block
  const configuredMockTargets = new Set<string>();
  for (const mc of block.mockCalls) {
    if (mc.targetObjectText) {
      configuredMockTargets.add(mc.targetObjectText.trim());
    }
    if (mc.targetPropertyText) {
      configuredMockTargets.add(mc.targetPropertyText.replace(/['"`]/g, '').trim());
    }
  }

  for (const assertion of block.assertions) {
    // Interaction calls (toHaveBeenCalled) are evaluated by CALL_ONLY_ASSERTION, not MOCK_ASSERTION
    if (assertion.matcherKind === 'interaction_call' || assertion.matcherKind === 'unsupported_dynamic') {
      continue;
    }

    const actual = assertion.actualExpressionText.trim();
    if (!actual) continue;

    // Check if the actual expression being asserted is directly a configured mock or calling a mock
    let isMockEcho = false;
    let matchedMock: string | undefined;

    for (const mockName of configuredMockTargets) {
      if (mockName.length === 0) continue;
      // e.g. expect(mockFn()).toBe(...) or expect(mockObj.prop).toBe(...)
      if (
        actual === mockName ||
        actual.startsWith(`${mockName}(`) ||
        actual.startsWith(`${mockName}.`)
      ) {
        // Guard: If this target is actually the SUT, it's a MOCKED_SUT issue, not a secondary mock assertion
        if (targetSymbol && (mockName === targetSymbol.canonicalSymbolName || actual.includes(targetSymbol.canonicalSymbolName))) {
          continue;
        }
        isMockEcho = true;
        matchedMock = mockName;
        break;
      }
    }

    if (isMockEcho && matchedMock) {
      findings.push({
        id: `FINDING-MOCK_ASSERTION-${block.id}-${findings.length + 1}`,
        kind: 'MOCK_ASSERTION',
        confidence: 'low', // Strictly kept at low / advisory ceiling statically
        message: `Advisory: Assertion in '${block.name}' evaluates configured mock '${matchedMock}' directly rather than verifying SUT output.`,
        locations: [assertion.location],
        evidence: [
          `Assertion '${assertion.rawExpression}' evaluates mock target '${assertion.actualExpressionText}'.`,
          `Configured mock reference '${matchedMock}' appears in assertion actual argument.`,
          `Confidence ceiling is kept at low (advisory) pending dynamic mutation correlation.`,
        ],
      });
    }
  }

  return findings;
}
