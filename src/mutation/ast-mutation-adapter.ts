import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import ts from 'typescript';
import {
  MutationAdapter,
  MutantDefinition,
  MutantExecutionResult,
} from './adapter.js';
import { BoundedProcessSupervisor } from '../platform/process-supervisor.js';

export interface AstMutantOptions {
  maxMutants?: number;
  projectRoot?: string;
}

export class AstMutationAdapter implements MutationAdapter {
  public readonly name = 'ast-deterministic';
  private supervisor: BoundedProcessSupervisor;

  constructor(supervisor?: BoundedProcessSupervisor) {
    this.supervisor = supervisor || new BoundedProcessSupervisor();
  }

  /**
   * Scans eligible production TypeScript/JavaScript files and generates
   * deterministic AST-based mutants across 4 conservative operators:
   * 1. BooleanLiteralFlip (true <-> false)
   * 2. ComparisonOperatorReplacement (=== <-> !==, > <-> <=, < <-> >=, == <-> !=)
   * 3. NumericBoundaryMutation (0 <-> 1)
   * 4. PrimitiveReturnMutation (return true <-> return false, return 0 <-> return 1)
   */
  public async generateMutants(
    sourceFiles: string[],
    options: AstMutantOptions = {}
  ): Promise<MutantDefinition[]> {
    const mutants: MutantDefinition[] = [];

    for (const filePath of sourceFiles) {
      const resolved = path.resolve(filePath);
      if (!fs.existsSync(resolved)) continue;

      // Skip test files, type declarations, build output
      const baseName = path.basename(resolved);
      if (
        baseName.includes('.test.') ||
        baseName.includes('.spec.') ||
        baseName.endsWith('.d.ts') ||
        baseName === 'run-jest.js' ||
        baseName.includes('jest.config') ||
        baseName.includes('tsconfig') ||
        resolved.includes('node_modules') ||
        resolved.includes('dist')
      ) {
        continue;
      }

      const content = fs.readFileSync(resolved, 'utf-8');
      const sourceFile = ts.createSourceFile(
        resolved,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const fileMutants = this.extractMutantsFromSource(sourceFile, resolved);
      mutants.push(...fileMutants);
    }

    // Stable sort by file, line, column, operator
    mutants.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      if (a.line !== b.line) return a.line - b.line;
      if (a.column !== b.column) return a.column - b.column;
      return a.operator.localeCompare(b.operator);
    });

    if (options.maxMutants && options.maxMutants > 0) {
      return mutants.slice(0, options.maxMutants);
    }

    return mutants;
  }

  private extractMutantsFromSource(
    sourceFile: ts.SourceFile,
    filePath: string
  ): MutantDefinition[] {
    const list: MutantDefinition[] = [];

    const visit = (node: ts.Node): void => {
      // 1. BooleanLiteralFlip
      if (node.kind === ts.SyntaxKind.TrueKeyword) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        list.push(this.createMutant(filePath, line + 1, character + 1, 'true', 'false', 'BooleanLiteralFlip', node.getStart(), node.getEnd(), 'Flip boolean literal true to false'));
      } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        list.push(this.createMutant(filePath, line + 1, character + 1, 'false', 'true', 'BooleanLiteralFlip', node.getStart(), node.getEnd(), 'Flip boolean literal false to true'));
      }

      // 2. ComparisonOperatorReplacement
      if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken;
        let replacement: string | null = null;
        switch (op.kind) {
          case ts.SyntaxKind.EqualsEqualsEqualsToken:
            replacement = '!==';
            break;
          case ts.SyntaxKind.ExclamationEqualsEqualsToken:
            replacement = '===';
            break;
          case ts.SyntaxKind.EqualsEqualsToken:
            replacement = '!=';
            break;
          case ts.SyntaxKind.ExclamationEqualsToken:
            replacement = '==';
            break;
          case ts.SyntaxKind.GreaterThanToken:
            replacement = '<=';
            break;
          case ts.SyntaxKind.LessThanEqualsToken:
            replacement = '>';
            break;
          case ts.SyntaxKind.LessThanToken:
            replacement = '>=';
            break;
          case ts.SyntaxKind.GreaterThanEqualsToken:
            replacement = '<';
            break;
        }

        if (replacement) {
          const original = op.getText(sourceFile);
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(op.getStart());
          list.push(this.createMutant(
            filePath,
            line + 1,
            character + 1,
            original,
            replacement,
            'ComparisonOperatorReplacement',
            op.getStart(),
            op.getEnd(),
            `Replace conditional operator '${original}' with '${replacement}'`
          ));
        }
      }

      // 3. NumericBoundaryMutation (0 <-> 1)
      if (ts.isNumericLiteral(node)) {
        const raw = node.getText(sourceFile);
        if (raw === '0') {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          list.push(this.createMutant(filePath, line + 1, character + 1, '0', '1', 'NumericBoundaryMutation', node.getStart(), node.getEnd(), 'Mutate numeric boundary 0 to 1'));
        } else if (raw === '1') {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          list.push(this.createMutant(filePath, line + 1, character + 1, '1', '0', 'NumericBoundaryMutation', node.getStart(), node.getEnd(), 'Mutate numeric boundary 1 to 0'));
        }
      }

      // 4. PrimitiveReturnMutation
      if (ts.isReturnStatement(node) && node.expression) {
        const expr = node.expression;
        if (expr.kind === ts.SyntaxKind.TrueKeyword) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(expr.getStart());
          list.push(this.createMutant(filePath, line + 1, character + 1, 'true', 'false', 'PrimitiveReturnMutation', expr.getStart(), expr.getEnd(), 'Invert return boolean true to false'));
        } else if (expr.kind === ts.SyntaxKind.FalseKeyword) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(expr.getStart());
          list.push(this.createMutant(filePath, line + 1, character + 1, 'false', 'true', 'PrimitiveReturnMutation', expr.getStart(), expr.getEnd(), 'Invert return boolean false to true'));
        } else if (ts.isNumericLiteral(expr)) {
          const raw = expr.getText(sourceFile);
          const replacement = raw === '0' ? '1' : '0';
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(expr.getStart());
          list.push(this.createMutant(filePath, line + 1, character + 1, raw, replacement, 'PrimitiveReturnMutation', expr.getStart(), expr.getEnd(), `Invert return numeric ${raw} to ${replacement}`));
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return list;
  }

  private createMutant(
    file: string,
    line: number,
    column: number,
    originalText: string,
    mutatedText: string,
    operator: string,
    startOffset: number,
    endOffset: number,
    description: string
  ): MutantDefinition {
    const rel = path.basename(file);
    const hash = crypto
      .createHash('sha256')
      .update(`${rel}:${line}:${column}:${operator}:${mutatedText}`)
      .digest('hex')
      .slice(0, 8);

    return {
      id: `M-${hash}`,
      file,
      line,
      column,
      originalText,
      mutatedText,
      operator,
      description,
      startOffset,
      endOffset,
    } as MutantDefinition & { startOffset: number; endOffset: number };
  }

  /**
   * Applies mutant to an isolated sandbox copy and executes the test suite.
   * Original source files are NEVER modified.
   */
  public async testMutant(
    mutant: MutantDefinition,
    testCommand: string[],
    options: { timeoutMs?: number; projectRoot?: string } = {}
  ): Promise<MutantExecutionResult> {
    let root = path.resolve(options.projectRoot || path.dirname(mutant.file));
    if (!options.projectRoot) {
      let curr = path.dirname(path.resolve(mutant.file));
      while (curr && curr !== path.dirname(curr)) {
        if (fs.existsSync(path.join(curr, 'package.json'))) {
          root = curr;
          break;
        }
        curr = path.dirname(curr);
      }
    }
    const startTime = Date.now();

    // Create unique temporary sandbox directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `mg-sandbox-${mutant.id}-`));

    try {
      // 1. Copy project files into sandbox (excluding heavy/temp directories)
      this.copyDirectoryExcluding(root, tempDir, ['node_modules', '.git', 'dist', '.mockguard']);

      // 2. Link node_modules if present to avoid expensive re-installation
      const sourceNodeModules = path.join(root, 'node_modules');
      const targetNodeModules = path.join(tempDir, 'node_modules');
      if (fs.existsSync(sourceNodeModules) && !fs.existsSync(targetNodeModules)) {
        try {
          fs.symlinkSync(sourceNodeModules, targetNodeModules, 'junction');
        } catch {
          // If symlink fails, continue without throwing
        }
      }

      // 3. Apply the single mutant to target file inside the sandbox
      const relPath = path.relative(root, mutant.file);
      const targetSandboxFile = path.join(tempDir, relPath);

      if (!fs.existsSync(targetSandboxFile)) {
        return {
          mutantId: mutant.id,
          outcome: 'COMPILE_ERROR',
          durationMs: Date.now() - startTime,
          stderr: `Target file not found in sandbox: ${targetSandboxFile}`,
        };
      }

      const originalCode = fs.readFileSync(targetSandboxFile, 'utf-8');
      let mutatedCode: string;

      const extMutant = mutant as MutantDefinition & { startOffset?: number; endOffset?: number };
      if (typeof extMutant.startOffset === 'number' && typeof extMutant.endOffset === 'number') {
        mutatedCode =
          originalCode.slice(0, extMutant.startOffset) +
          mutant.mutatedText +
          originalCode.slice(extMutant.endOffset);
      } else {
        // Fallback: replace first occurrence of original text on target line
        const lines = originalCode.split('\n');
        if (lines.length >= mutant.line) {
          const targetLine = lines[mutant.line - 1];
          lines[mutant.line - 1] = targetLine.replace(mutant.originalText, mutant.mutatedText);
          mutatedCode = lines.join('\n');
        } else {
          mutatedCode = originalCode.replace(mutant.originalText, mutant.mutatedText);
        }
      }

      fs.writeFileSync(targetSandboxFile, mutatedCode, 'utf-8');

      // 4. Run test command inside the sandbox
      const executable = testCommand[0];
      const args = testCommand.slice(1);

      const processResult = await this.supervisor.execute(executable, args, {
        cwd: tempDir,
        timeoutMs: options.timeoutMs ?? 15_000,
        maxOutputBytes: 5 * 1024 * 1024,
      });

      const durationMs = Date.now() - startTime;

      if (processResult.timedOut) {
        return {
          mutantId: mutant.id,
          outcome: 'TIMEOUT',
          durationMs,
          stdout: processResult.stdout,
          stderr: processResult.stderr,
        };
      }

      if (processResult.cancelled) {
        return {
          mutantId: mutant.id,
          outcome: 'CANCELLED',
          durationMs,
        };
      }

      // Check for syntax / compiler errors
      const combined = `${processResult.stdout}\n${processResult.stderr}`;
      if (combined.includes('SyntaxError') || combined.includes('TS2304') || combined.includes('Compile Error')) {
        return {
          mutantId: mutant.id,
          outcome: 'COMPILE_ERROR',
          durationMs,
          stdout: processResult.stdout,
          stderr: processResult.stderr,
        };
      }

      // If test exits non-zero, the test caught the mutant -> KILLED
      // If test exits zero, the test still passed despite broken logic -> SURVIVED
      const outcome = processResult.exitCode !== 0 ? 'KILLED' : 'SURVIVED';

      return {
        mutantId: mutant.id,
        outcome,
        durationMs,
        stdout: processResult.stdout,
        stderr: processResult.stderr,
      };
    } catch (err) {
      return {
        mutantId: mutant.id,
        outcome: 'RUNTIME_ERROR',
        durationMs: Date.now() - startTime,
        stderr: err instanceof Error ? err.message : String(err),
      };
    } finally {
      // Clean up sandbox completely
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
  }

  private copyDirectoryExcluding(src: string, dest: string, excludeDirs: string[]): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) {
        continue;
      }

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryExcluding(srcPath, destPath, excludeDirs);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
