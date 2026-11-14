import ts from 'typescript';
import path from 'node:path';
import {
  DiscoveredTestBlock,
  DiscoveredMockCall,
  DiscoveredAssertion,
  SourceLocation,
  SourceSpan,
  TestFileAnalysis,
  TargetSymbolInvocation,
  AssertionMatcherKind,
  MockCallKind,
} from './model.js';
import { SymbolResolver, ProductionSymbolTarget } from './symbol-resolver.js';

export class JestTestAnalyzer {
  private readonly resolver: SymbolResolver;
  private readonly rootDir: string;

  constructor(checker: ts.TypeChecker, rootDir: string, program?: ts.Program) {
    this.rootDir = path.resolve(rootDir);
    this.resolver = new SymbolResolver(checker, rootDir, program);
  }

  analyzeSourceFile(sourceFile: ts.SourceFile, targetSymbol?: ProductionSymbolTarget): TestFileAnalysis {
    const testBlocks: DiscoveredTestBlock[] = [];
    const fileLevelMockCalls: DiscoveredMockCall[] = [];
    const unsupportedConstructs: { reason: string; location: SourceLocation }[] = [];

    let currentBlockStack: DiscoveredTestBlock[] = [];

    const visit = (node: ts.Node) => {
      // 1. Detect dynamic import expressions with computed path
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && !ts.isStringLiteral(arg)) {
          unsupportedConstructs.push({
            reason: 'Dynamic import() with non-literal path expression',
            location: this.getNodeLocation(node, sourceFile),
          });
        }
      }

      // 2. Detect eval or Function expressions
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && (node.expression.text === 'eval' || node.expression.text === 'Function')) {
          unsupportedConstructs.push({
            reason: `Use of dynamic code execution construct '${node.expression.text}'`,
            location: this.getNodeLocation(node, sourceFile),
          });
        }
      }

      // 3. Detect describe, it, test blocks
      const testBlockKind = this.getTestBlockKind(node);
      if (testBlockKind && ts.isCallExpression(node)) {
        const blockName = this.extractTestBlockName(node);
        const block: DiscoveredTestBlock = {
          id: `${testBlockKind}:${blockName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
          name: blockName,
          kind: testBlockKind,
          location: this.getNodeLocation(node, sourceFile),
          invocations: [],
          mockCalls: [],
          assertions: [],
        };

        testBlocks.push(block);
        currentBlockStack.push(block);

        // Traverse into block body
        ts.forEachChild(node, visit);

        currentBlockStack.pop();
        return;
      }

      // 4. Within a test/it/describe block, gather facts:
      const activeBlock = currentBlockStack[currentBlockStack.length - 1];

      if (ts.isCallExpression(node)) {
        // Collect Target Symbol Invocations if target specified
        if (targetSymbol) {
          const resolution = this.resolver.resolveTargetInvocation(node, targetSymbol);
          if (resolution.status === 'resolved' || resolution.status === 'unsupported') {
            const invocation: TargetSymbolInvocation = {
              callerTestId: activeBlock?.id,
              resolution,
              location: this.getNodeLocation(node, sourceFile),
              expressionText: node.getText(sourceFile),
            };
            if (activeBlock) {
              activeBlock.invocations.push(invocation);
            }
          }
        }

        // Collect Mock Calls (jest.fn, jest.spyOn, mockResolvedValue, etc.)
        const mockCall = this.extractMockCall(node, sourceFile);
        if (mockCall) {
          if (activeBlock) {
            activeBlock.mockCalls.push(mockCall);
          } else {
            fileLevelMockCalls.push(mockCall);
          }
        }

        // Collect Assertions (expect(x).toBe(y), expect(fn).toHaveBeenCalled(), etc.)
        const assertion = this.extractAssertion(node, sourceFile);
        if (assertion) {
          if (activeBlock) {
            activeBlock.assertions.push(assertion);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      testFilePath: this.normalizePath(sourceFile.fileName),
      testBlocks,
      fileLevelMockCalls,
      unsupportedConstructs,
    };
  }

  private getTestBlockKind(node: ts.Node): 'describe' | 'it' | 'test' | undefined {
    if (!ts.isCallExpression(node)) return undefined;
    const expr = node.expression;

    if (ts.isIdentifier(expr)) {
      if (expr.text === 'describe') return 'describe';
      if (expr.text === 'it') return 'it';
      if (expr.text === 'test') return 'test';
    }

    // it.each, test.each, describe.each
    if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
      if (expr.name.text === 'each') {
        const base = expr.expression.text;
        if (base === 'describe') return 'describe';
        if (base === 'it') return 'it';
        if (base === 'test') return 'test';
      }
    }

    return undefined;
  }

  private extractTestBlockName(callExpr: ts.CallExpression): string {
    const firstArg = callExpr.arguments[0];
    if (firstArg && (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))) {
      return firstArg.text;
    }
    return '<anonymous>';
  }

  private extractMockCall(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): DiscoveredMockCall | undefined {
    const expr = callExpr.expression;

    // jest.fn(...)
    if (ts.isPropertyAccessExpression(expr)) {
      if (ts.isIdentifier(expr.expression) && expr.expression.text === 'jest') {
        const method = expr.name.text;
        if (method === 'fn' || method === 'mock' || method === 'spyOn') {
          return {
            kind: method === 'spyOn' ? 'jest.spyOn' : method === 'mock' ? 'jest.mock' : 'jest.fn',
            methodName: method,
            targetObjectText: callExpr.arguments[0]?.getText(sourceFile),
            targetPropertyText: callExpr.arguments[1]?.getText(sourceFile),
            isDynamicComputedTarget: callExpr.arguments.some(a => !ts.isStringLiteral(a) && !ts.isIdentifier(a)),
            location: this.getNodeLocation(callExpr, sourceFile),
            rawExpression: callExpr.getText(sourceFile),
          };
        }
      }

      // method on mock: .mockReturnValue, .mockResolvedValue, etc.
      const propName = expr.name.text;
      if (propName.startsWith('mock')) {
        let kind: MockCallKind = 'other';
        if (propName.startsWith('mockReturnValue')) kind = 'mockReturnValue';
        else if (propName.startsWith('mockResolvedValue')) kind = 'mockResolvedValue';
        else if (propName.startsWith('mockRejectedValue')) kind = 'mockRejectedValue';
        else if (propName.startsWith('mockImplementation')) kind = 'mockImplementation';
        else if (propName === 'mockReturnThis') kind = 'mockReturnThis';

        // Check if property is dynamic element access: obj[method].mockResolvedValue
        const isDynamic = ts.isElementAccessExpression(expr.expression);

        return {
          kind,
          methodName: propName,
          targetObjectText: expr.expression.getText(sourceFile),
          isDynamicComputedTarget: isDynamic,
          location: this.getNodeLocation(callExpr, sourceFile),
          rawExpression: callExpr.getText(sourceFile),
        };
      }
    }

    return undefined;
  }

  private extractAssertion(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): DiscoveredAssertion | undefined {
    const expr = callExpr.expression;
    if (!ts.isPropertyAccessExpression(expr)) return undefined;

    const matcherName = expr.name.text;
    let current: ts.Expression = expr.expression;
    let isNegated = false;

    // Check for .not modifier: expect(x).not.toBe(y)
    if (ts.isPropertyAccessExpression(current) && current.name.text === 'not') {
      isNegated = true;
      current = current.expression;
    }

    // Check for resolves / rejects modifiers: expect(p).rejects.toThrow()
    if (
      ts.isPropertyAccessExpression(current) &&
      (current.name.text === 'resolves' || current.name.text === 'rejects')
    ) {
      current = current.expression;
    }

    // Verify root is expect(...)
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'expect') {
      const actualArg = current.arguments[0];
      const actualText = actualArg ? actualArg.getText(sourceFile) : '';
      const expectedText = callExpr.arguments[0] ? callExpr.arguments[0].getText(sourceFile) : undefined;

      const isDynamic = current.arguments.some(a => ts.isElementAccessExpression(a));

      return {
        matcherName,
        matcherKind: this.classifyMatcher(matcherName),
        actualExpressionText: actualText,
        expectedExpressionText: expectedText,
        isNegated,
        isDynamicComputed: isDynamic,
        location: this.getNodeLocation(callExpr, sourceFile),
        rawExpression: callExpr.getText(sourceFile),
      };
    }

    return undefined;
  }

  private classifyMatcher(matcherName: string): AssertionMatcherKind {
    if (matcherName.startsWith('toHaveBeenCalled') || matcherName.startsWith('toHaveBeenNthCalled')) {
      return 'interaction_call';
    }
    if (['toBe', 'toEqual', 'toStrictEqual', 'toMatchObject', 'toMatch'].includes(matcherName)) {
      return 'value_equality';
    }
    if (['toThrow', 'toThrowError'].includes(matcherName)) {
      return 'exception';
    }
    if (['toBeTruthy', 'toBeFalsy', 'toBeDefined', 'toBeUndefined', 'toBeNull'].includes(matcherName)) {
      return 'truthiness';
    }
    if (['toMatchSnapshot', 'toMatchInlineSnapshot'].includes(matcherName)) {
      return 'snapshot';
    }
    return 'other';
  }

  private getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const span: SourceSpan = {
      startLine: start.line + 1,
      startColumn: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    };
    return {
      filePath: this.normalizePath(sourceFile.fileName),
      span,
    };
  }

  private normalizePath(p: string): string {
    const abs = path.resolve(this.rootDir, p);
    return path.relative(this.rootDir, abs).replace(/\\/g, '/');
  }
}
