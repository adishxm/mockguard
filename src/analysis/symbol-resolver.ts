import ts from 'typescript';
import path from 'node:path';
import { TargetSymbolResolution } from './model.js';

export interface ProductionSymbolTarget {
  canonicalFilePath: string;
  canonicalSymbolName: string;
}

export class SymbolResolver {
  private readonly checker: ts.TypeChecker;
  private readonly program?: ts.Program;
  private readonly rootDir: string;

  constructor(checker: ts.TypeChecker, rootDir: string, program?: ts.Program) {
    this.checker = checker;
    this.rootDir = path.resolve(rootDir);
    this.program = program;
  }

  resolveTargetInvocation(
    callExpr: ts.CallExpression,
    target: ProductionSymbolTarget
  ): TargetSymbolResolution {
    const expr = callExpr.expression;

    // Check for dynamic invocation patterns like eval(...) or (0, eval)(...)
    if (this.isEvalOrDynamicFunction(expr)) {
      return {
        status: 'unsupported',
        reason: 'Invocation uses dynamic eval or Function constructor',
      };
    }

    // Direct identifier call: createOrder(...) or makeOrder(...)
    if (ts.isIdentifier(expr)) {
      return this.resolveIdentifier(expr, target);
    }

    // Property access call: orderService.createOrder(...) or orderModule.makeOrder(...)
    if (ts.isPropertyAccessExpression(expr)) {
      return this.resolvePropertyAccess(expr, target);
    }

    // Element access call: orderService['createOrder'](...) or orderService[dynamicName](...)
    if (ts.isElementAccessExpression(expr)) {
      return this.resolveElementAccess(expr, target);
    }

    return {
      status: 'unresolved',
      reason: `Unhandled callee expression kind: ${ts.SyntaxKind[expr.kind]}`,
    };
  }

  private resolveIdentifier(
    id: ts.Identifier,
    target: ProductionSymbolTarget
  ): TargetSymbolResolution {
    const symbol = this.checker.getSymbolAtLocation(id);
    if (!symbol) {
      return { status: 'unresolved', reason: `No symbol found for identifier '${id.text}'` };
    }

    let resolvedSymbol = symbol;
    let isRenameAlias = false;

    // Check if the symbol is an alias (e.g. from an import statement)
    if (symbol.flags & ts.SymbolFlags.Alias) {
      const directTarget = this.checker.getAliasedSymbol(symbol);
      if (directTarget && directTarget !== symbol) {
        resolvedSymbol = directTarget;
      }

      // Check whether the import actually renamed the symbol:
      // e.g. import { createOrder as makeOrder } -> id.text is makeOrder, directTarget name is createOrder
      if (symbol.getName() !== resolvedSymbol.getName()) {
        isRenameAlias = true;
      }
    }

    return this.matchSymbolToTarget(resolvedSymbol, target, isRenameAlias ? 'aliased' : 'direct');
  }

  private resolvePropertyAccess(
    propAccess: ts.PropertyAccessExpression,
    target: ProductionSymbolTarget
  ): TargetSymbolResolution {
    const propName = propAccess.name.text;
    const propSymbol = this.checker.getSymbolAtLocation(propAccess.name);

    if (propSymbol) {
      let resolvedSymbol = propSymbol;
      if (propSymbol.flags & ts.SymbolFlags.Alias) {
        const aliased = this.checker.getAliasedSymbol(propSymbol);
        if (aliased) resolvedSymbol = aliased;
      }
      const match = this.matchSymbolToTarget(resolvedSymbol, target, 'namespace');
      if (match.status === 'resolved') {
        return match;
      }
    }

    // Verify object expression (e.g. orderService in orderService.createOrder)
    const objSymbol = this.checker.getSymbolAtLocation(propAccess.expression);
    if (objSymbol) {
      const decls = objSymbol.getDeclarations() ?? [];
      for (const decl of decls) {
        if (ts.isNamespaceImport(decl)) {
          // Namespace import: import * as orderService from './order-service';
          const moduleSpecifier = (decl.parent.parent as ts.ImportDeclaration).moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            const resolvedModule = this.resolveModuleSourceFile(decl.getSourceFile(), moduleSpecifier.text);
            if (resolvedModule && this.isMatchingFilePath(resolvedModule.fileName, target.canonicalFilePath)) {
              if (propName === target.canonicalSymbolName) {
                return {
                  status: 'resolved',
                  importKind: 'namespace',
                  canonicalFilePath: this.normalizePath(resolvedModule.fileName),
                  canonicalSymbolName: target.canonicalSymbolName,
                };
              }
            }
          }
        }
      }
    }

    return {
      status: 'unresolved',
      reason: `Property access '${propName}' does not resolve to target symbol '${target.canonicalSymbolName}'`,
    };
  }

  private resolveElementAccess(
    elemAccess: ts.ElementAccessExpression,
    target: ProductionSymbolTarget
  ): TargetSymbolResolution {
    const arg = elemAccess.argumentExpression;
    if (!arg || !ts.isStringLiteral(arg)) {
      return {
        status: 'unsupported',
        reason: 'Computed dynamic element access cannot be resolved statically',
      };
    }

    // If string literal, e.g. orderService['createOrder'](...)
    const propName = arg.text;
    if (propName !== target.canonicalSymbolName) {
      return {
        status: 'unresolved',
        reason: `Element string literal '${propName}' does not match target symbol name '${target.canonicalSymbolName}'`,
      };
    }

    const objSymbol = this.checker.getSymbolAtLocation(elemAccess.expression);
    if (objSymbol) {
      const decls = objSymbol.getDeclarations() ?? [];
      for (const decl of decls) {
        if (ts.isNamespaceImport(decl)) {
          const importDecl = decl.parent.parent as ts.ImportDeclaration;
          if (ts.isStringLiteral(importDecl.moduleSpecifier)) {
            const resolvedModule = this.resolveModuleSourceFile(decl.getSourceFile(), importDecl.moduleSpecifier.text);
            if (resolvedModule && this.isMatchingFilePath(resolvedModule.fileName, target.canonicalFilePath)) {
              return {
                status: 'resolved',
                importKind: 'namespace',
                canonicalFilePath: this.normalizePath(resolvedModule.fileName),
                canonicalSymbolName: target.canonicalSymbolName,
              };
            }
          }
        }
      }
    }

    return {
      status: 'unresolved',
      reason: `Element access '${propName}' on object could not be resolved to target module`,
    };
  }

  private matchSymbolToTarget(
    symbol: ts.Symbol,
    target: ProductionSymbolTarget,
    importKind: 'direct' | 'aliased' | 'namespace'
  ): TargetSymbolResolution {
    const decls = symbol.getDeclarations() ?? [];
    for (const decl of decls) {
      const sourceFile = decl.getSourceFile();
      const filePath = sourceFile.fileName;

      if (this.isMatchingFilePath(filePath, target.canonicalFilePath)) {
        const canonicalName = symbol.getName();
        if (canonicalName === target.canonicalSymbolName) {
          return {
            status: 'resolved',
            importKind,
            canonicalFilePath: this.normalizePath(filePath),
            canonicalSymbolName: canonicalName,
          };
        }
      }
    }

    return {
      status: 'unresolved',
      reason: `Symbol '${symbol.getName()}' does not originate from target '${target.canonicalFilePath}#${target.canonicalSymbolName}'`,
    };
  }

  private resolveModuleSourceFile(sourceFile: ts.SourceFile, moduleSpecifier: string): ts.SourceFile | undefined {
    const dir = path.dirname(sourceFile.fileName);
    const candidatePath = path.resolve(dir, moduleSpecifier);

    if (this.program) {
      const programFiles = this.program.getSourceFiles();
      for (const file of programFiles) {
        const normalized = path.resolve(file.fileName);
        if (
          normalized === candidatePath ||
          normalized === candidatePath + '.ts' ||
          normalized === candidatePath + '.js' ||
          normalized === path.join(candidatePath, 'index.ts') ||
          normalized === path.join(candidatePath, 'index.js')
        ) {
          return file;
        }
      }
    }

    return undefined;
  }

  private isMatchingFilePath(actualPath: string, expectedPath: string): boolean {
    const normActual = this.normalizePath(actualPath);
    const normExpected = this.normalizePath(expectedPath);
    return (
      normActual === normExpected ||
      normActual.endsWith('/' + normExpected) ||
      normActual.endsWith('\\' + normExpected)
    );
  }

  private normalizePath(p: string): string {
    const abs = path.resolve(this.rootDir, p);
    return path.relative(this.rootDir, abs).replace(/\\/g, '/');
  }

  private isEvalOrDynamicFunction(expr: ts.Expression): boolean {
    if (ts.isIdentifier(expr) && (expr.text === 'eval' || expr.text === 'Function')) {
      return true;
    }
    return false;
  }
}
