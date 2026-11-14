export interface SourceSpan {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface SourceLocation {
  filePath: string;
  span: SourceSpan;
}

export type TargetSymbolResolution =
  | { status: 'resolved'; importKind: 'direct' | 'aliased' | 'namespace'; canonicalFilePath: string; canonicalSymbolName: string }
  | { status: 'unresolved'; reason: string }
  | { status: 'unsupported'; reason: string };

export interface TargetSymbolInvocation {
  callerTestId?: string;
  resolution: TargetSymbolResolution;
  location: SourceLocation;
  expressionText: string;
}

export type MockCallKind =
  | 'jest.fn'
  | 'jest.spyOn'
  | 'jest.mock'
  | 'mockReturnValue'
  | 'mockResolvedValue'
  | 'mockRejectedValue'
  | 'mockImplementation'
  | 'mockReturnThis'
  | 'other';

export interface DiscoveredMockCall {
  kind: MockCallKind;
  methodName?: string;
  targetObjectText?: string;
  targetPropertyText?: string;
  isDynamicComputedTarget: boolean;
  location: SourceLocation;
  rawExpression: string;
}

export type AssertionMatcherKind =
  | 'value_equality'
  | 'interaction_call'
  | 'exception'
  | 'truthiness'
  | 'snapshot'
  | 'unsupported_dynamic'
  | 'other';

export interface DiscoveredAssertion {
  matcherName: string;
  matcherKind: AssertionMatcherKind;
  actualExpressionText: string;
  expectedExpressionText?: string;
  isNegated: boolean;
  isDynamicComputed: boolean;
  location: SourceLocation;
  rawExpression: string;
}

export interface DiscoveredTestBlock {
  id: string;
  name: string;
  kind: 'describe' | 'it' | 'test';
  location: SourceLocation;
  invocations: TargetSymbolInvocation[];
  mockCalls: DiscoveredMockCall[];
  assertions: DiscoveredAssertion[];
}

export interface TestFileAnalysis {
  testFilePath: string;
  testBlocks: DiscoveredTestBlock[];
  fileLevelMockCalls?: DiscoveredMockCall[];
  unsupportedConstructs: { reason: string; location: SourceLocation }[];
}
