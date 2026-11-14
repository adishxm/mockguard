import { DiscoveredTestBlock, SourceLocation } from '../model.js';
import { ProductionSymbolTarget } from '../symbol-resolver.js';
import { Finding } from './types.js';

export function evaluateNoAssertion(
  block: DiscoveredTestBlock,
  targetSymbol?: ProductionSymbolTarget
): Finding[] {
  // Only evaluate leaf test cases ('it' or 'test'), not 'describe' suites
  if (block.kind !== 'it' && block.kind !== 'test') {
    return [];
  }

  // If there are assertions present, this rule does not trigger
  if (block.assertions.length > 0) {
    return [];
  }

  // Determine if SUT was invoked in this test block
  let sutInvoked = false;
  let sutLocation: SourceLocation | undefined;
  let sutExpression: string | undefined;

  if (targetSymbol) {
    const resolvedInvocation = block.invocations.find(inv => inv.resolution.status === 'resolved');
    if (resolvedInvocation) {
      sutInvoked = true;
      sutLocation = resolvedInvocation.location;
      sutExpression = resolvedInvocation.expressionText;
    }
  } else {
    // If no target symbol provided, any target invocation indicates execution
    if (block.invocations.length > 0) {
      sutInvoked = true;
      sutLocation = block.invocations[0].location;
      sutExpression = block.invocations[0].expressionText;
    }
  }

  // If SUT was invoked but 0 assertions exist, emit NO_ASSERTION finding
  if (sutInvoked) {
    const locations = sutLocation ? [sutLocation, block.location] : [block.location];
    const evidence = [
      `Test block '${block.name}' executed SUT${sutExpression ? ` ('${sutExpression}')` : ''} at line ${block.location.span.startLine}.`,
      `Zero assertions or error expectations (expect(...)) were recorded in this test block.`,
    ];

    return [
      {
        id: `FINDING-NO_ASSERTION-${block.id}-1`,
        kind: 'NO_ASSERTION',
        confidence: 'medium',
        message: `Test '${block.name}' executes System Under Test logic but contains zero assertions.`,
        locations,
        evidence,
      },
    ];
  }

  return [];
}
