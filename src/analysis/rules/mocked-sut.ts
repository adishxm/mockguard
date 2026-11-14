import { DiscoveredTestBlock, DiscoveredMockCall } from '../model.js';
import { ProductionSymbolTarget } from '../symbol-resolver.js';
import { BoundaryAllowlist } from './boundary-allowlist.js';
import { Finding } from './types.js';

export function evaluateMockedSut(
  block: DiscoveredTestBlock,
  targetSymbol?: ProductionSymbolTarget,
  fileLevelMockCalls: DiscoveredMockCall[] = []
): Finding[] {
  const findings: Finding[] = [];
  const allCalls = [...fileLevelMockCalls, ...block.mockCalls];

  for (const mockCall of allCalls) {
    if (!matchesTargetSut(mockCall, targetSymbol, block)) {
      continue;
    }

    // Check if the mock call actually replaced the implementation
    if (!isImplementationReplaced(mockCall, block.mockCalls)) {
      // It's a bare spy (e.g. jest.spyOn(sut, 'method')) without mock implementation.
      // SUT real implementation still executes. Do not flag as MOCKED_SUT.
      continue;
    }

    const targetDesc = getTargetDescription(mockCall, targetSymbol);
    findings.push({
      id: `FINDING-MOCKED_SUT-${block.id}-${findings.length + 1}`,
      kind: 'MOCKED_SUT',
      confidence: 'high',
      message: `System Under Test symbol '${targetDesc}' is mocked or has its implementation replaced in test '${block.name}'. Real SUT code will not execute.`,
      locations: [mockCall.location],
      evidence: [
        `Mock expression '${mockCall.rawExpression}' replaces implementation of target SUT '${targetDesc}'.`,
        `Location: ${mockCall.location.filePath}:${mockCall.location.span.startLine}:${mockCall.location.span.startColumn}`,
      ],
    });
  }

  return findings;
}

function matchesTargetSut(
  mockCall: DiscoveredMockCall,
  targetSymbol?: ProductionSymbolTarget,
  block?: DiscoveredTestBlock
): boolean {
  const targetObj = mockCall.targetObjectText?.replace(/['"`]/g, '').trim();
  const targetProp = mockCall.targetPropertyText?.replace(/['"`]/g, '').trim();

  // If target symbol is explicitly given
  if (targetSymbol) {
    // 1. Check if mock targets the SUT module file directly (e.g. jest.mock('./calculator'))
    if (mockCall.kind === 'jest.mock' && targetObj) {
      const normalizedTargetObj = targetObj.replace(/\\/g, '/');
      const normalizedSutPath = targetSymbol.canonicalFilePath.replace(/\\/g, '/');
      const sutBase = normalizedSutPath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
      if (normalizedTargetObj.endsWith(sutBase) || normalizedSutPath.includes(normalizedTargetObj)) {
        return true;
      }
    }

    // 2. Check if property matches symbolName
    if (targetProp && targetProp === targetSymbol.canonicalSymbolName) {
      return true;
    }

    // 3. Check if target object matches symbolName or class name
    if (
      targetObj &&
      (targetObj === targetSymbol.canonicalSymbolName ||
        targetObj.toLowerCase() === targetSymbol.canonicalSymbolName.toLowerCase())
    ) {
      // If the targetSymbol itself resolves to an external boundary package, it's not a local SUT
      if (BoundaryAllowlist.isExternalBoundary(targetSymbol.canonicalFilePath)) {
        return false;
      }
      return true;
    }
  }

  // If no target symbol specified, check if mock targets any resolved SUT invocation in the block
  if (block && block.invocations.length > 0) {
    for (const inv of block.invocations) {
      if (inv.resolution.status === 'resolved') {
        const canonicalName = inv.resolution.canonicalSymbolName;
        if (targetProp === canonicalName || targetObj === canonicalName) {
          if (!BoundaryAllowlist.isExternalBoundary(inv.resolution.canonicalFilePath)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function isImplementationReplaced(
  mockCall: DiscoveredMockCall,
  blockMockCalls: DiscoveredMockCall[] = []
): boolean {
  if (
    mockCall.kind === 'mockReturnValue' ||
    mockCall.kind === 'mockResolvedValue' ||
    mockCall.kind === 'mockRejectedValue' ||
    mockCall.kind === 'mockImplementation' ||
    mockCall.kind === 'mockReturnThis'
  ) {
    return true;
  }

  if (mockCall.kind === 'jest.mock') {
    return true;
  }

  if (mockCall.kind === 'jest.fn') {
    return true;
  }

  if (mockCall.kind === 'jest.spyOn') {
    const raw = mockCall.rawExpression;
    if (
      raw.includes('.mockReturnValue') ||
      raw.includes('.mockResolvedValue') ||
      raw.includes('.mockRejectedValue') ||
      raw.includes('.mockImplementation') ||
      raw.includes('.mockReturnThis')
    ) {
      return true;
    }

    const prop = mockCall.targetPropertyText ? mockCall.targetPropertyText.replace(/['"`]/g, '') : undefined;
    const targetObj = mockCall.targetObjectText;

    const hasChainedConfig = blockMockCalls.some(other => {
      if (other === mockCall) return false;
      if (other.kind === 'jest.spyOn') return false;
      if (
        other.targetObjectText &&
        (other.targetObjectText.includes('spyOn') ||
          (prop && other.targetObjectText.includes(prop)) ||
          (targetObj && other.targetObjectText.startsWith(targetObj)))
      ) {
        return true;
      }
      return false;
    });

    return hasChainedConfig;
  }

  return false;
}

function getTargetDescription(mockCall: DiscoveredMockCall, targetSymbol?: ProductionSymbolTarget): string {
  if (targetSymbol) {
    return targetSymbol.canonicalSymbolName;
  }
  const prop = mockCall.targetPropertyText?.replace(/['"`]/g, '');
  const obj = mockCall.targetObjectText?.replace(/['"`]/g, '');
  if (obj && prop) return `${obj}.${prop}`;
  return obj || prop || 'SUT';
}
