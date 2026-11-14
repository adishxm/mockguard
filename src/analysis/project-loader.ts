import ts from 'typescript';
import path from 'node:path';
import fs from 'node:fs';

export interface TypeScriptProjectContext {
  program: ts.Program;
  checker: ts.TypeChecker;
  configPath: string;
  rootDir: string;
}

export class TypeScriptProjectLoader {
  static load(configPath: string): TypeScriptProjectContext {
    const resolvedConfigPath = path.resolve(configPath);
    if (!fs.existsSync(resolvedConfigPath)) {
      throw new Error(`TypeScript config file not found at: ${resolvedConfigPath}`);
    }

    const configFile = ts.readConfigFile(resolvedConfigPath, ts.sys.readFile);
    if (configFile.error) {
      const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
      throw new Error(`Failed to read tsconfig: ${message}`);
    }

    const basePath = path.dirname(resolvedConfigPath);
    const parsedCommandLine = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      basePath
    );

    if (parsedCommandLine.errors.length > 0) {
      const firstError = parsedCommandLine.errors[0];
      const message = ts.flattenDiagnosticMessageText(firstError.messageText, '\n');
      throw new Error(`Failed to parse tsconfig content: ${message}`);
    }

    const program = ts.createProgram({
      rootNames: parsedCommandLine.fileNames,
      options: parsedCommandLine.options,
    });

    return {
      program,
      checker: program.getTypeChecker(),
      configPath: resolvedConfigPath,
      rootDir: basePath,
    };
  }
}
