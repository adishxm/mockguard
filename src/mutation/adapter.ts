import { MutantOutcome } from '../contracts/outcomes.js';

export interface MutantDefinition {
  id: string;
  file: string;
  line: number;
  column: number;
  originalText: string;
  mutatedText: string;
  operator: string;
  description?: string;
}

export interface MutantExecutionResult {
  mutantId: string;
  outcome: MutantOutcome;
  durationMs: number;
  testFailures?: string[];
  stdout?: string;
  stderr?: string;
}

export interface MutationAdapter {
  name: string;
  generateMutants(
    sourceFiles: string[],
    options?: Record<string, unknown>
  ): Promise<MutantDefinition[]>;
  testMutant(
    mutant: MutantDefinition,
    testCommand: string[],
    options?: { timeoutMs?: number }
  ): Promise<MutantExecutionResult>;
}
