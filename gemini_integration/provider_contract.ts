/**
 * Planning contract for the optional Gemini provider.
 * This file is intentionally dependency-free and is not an implementation claim.
 */
export type GeminiMode =
  | "explain-finding"
  | "suggest-assertion"
  | "draft-patch"
  | "summarize-approved-evidence";

export interface GeminiRequest {
  mode: GeminiMode;
  finding?: unknown;
  mutant?: unknown;
  sourceExcerpt?: string;
  testExcerpt?: string;
  constraints: {
    maxInputBytes: number;
    maxOutputTokens: number;
    timeoutMs: number;
    allowSourceUpload: boolean;
  };
}

export interface GeminiResponse {
  provider: "gemini";
  model: string;
  schemaVersion: "mockguard.gemini.response.v1";
  kind: "explanation" | "suggestion" | "patch-proposal" | "summary" | "unknown";
  content: unknown;
  verified: false;
  needsHumanReview: true;
  requestId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface GeminiProvider {
  generate(request: GeminiRequest): Promise<GeminiResponse>;
}
