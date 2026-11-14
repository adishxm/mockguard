import { DiscoveredTestBlock } from '../model.js';
import { ProductionSymbolTarget } from '../symbol-resolver.js';
import { Finding } from './types.js';

export function evaluateCallOnlyAssertion(
  block: DiscoveredTestBlock,
  _targetSymbol?: ProductionSymbolTarget
): Finding[] {
  // Only evaluate leaf test cases ('it' or 'test')
  if (block.kind !== 'it' && block.kind !== 'test') {
    return [];
  }

  // If there are zero assertions, that is covered by NO_ASSERTION
  if (block.assertions.length === 0) {
    return [];
  }

  // 1. If ANY assertion is not an interaction call, then the test verifies state, exceptions, or snapshots
  const hasNonCallAssertion = block.assertions.some(
    a => a.matcherKind !== 'interaction_call' && a.matcherKind !== 'unsupported_dynamic'
  );
  if (hasNonCallAssertion) {
    return [];
  }

  // 2. UPGRADE 1: Negative Side-Effect Recognition
  // Check if any assertion asserts non-calling (.not.toHaveBeenCalled*) on a boundary or mock.
  // Expecting a negative side effect (e.g., verifying payment gateway was NOT invoked on invalid cart)
  // is an observable invariant and must not be flagged as a vacuous call-only assertion.
  const hasNegativeInteractionAssertion = block.assertions.some(
    a => a.matcherKind === 'interaction_call' && a.isNegated
  );
  if (hasNegativeInteractionAssertion) {
    return [];
  }

  // 3. Conservative Check: All assertions are strictly positive interaction calls
  // (e.g., expect(spy).toHaveBeenCalled(), expect(service.call).toHaveBeenCalledTimes(1))
  // with zero state/value assertions or negative checks.
  const positiveCallAssertions = block.assertions.filter(
    a => a.matcherKind === 'interaction_call' && !a.isNegated
  );

  if (positiveCallAssertions.length === block.assertions.length && positiveCallAssertions.length > 0) {
    const locations = positiveCallAssertions.map(a => a.location);
    const evidence = positiveCallAssertions.map(
      a => `Call-only assertion '${a.rawExpression}' at line ${a.location.span.startLine} verifies invocation presence without inspecting state or return values.`
    );

    return [
      {
        id: `FINDING-CALL_ONLY_ASSERTION-${block.id}-1`,
        kind: 'CALL_ONLY_ASSERTION',
        confidence: 'medium',
        message: `Test '${block.name}' relies solely on call/interaction assertions without verifying return values, state changes, or negative side effects.`,
        locations,
        evidence,
      },
    ];
  }

  return [];
}
