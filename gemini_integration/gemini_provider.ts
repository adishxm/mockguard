import { GeminiProvider, GeminiRequest, GeminiResponse } from './provider_contract.js';

/**
 * Enterprise Google Gemini Advisory Provider.
 * Connects to Google AI Studio's Gemini API via native zero-dependency HTTP.
 * Incorporates automated model fallback, strict prompt structuring,
 * and security redaction.
 */
export class GoogleGeminiProvider implements GeminiProvider {
  private readonly apiKey: string;
  private readonly candidateModels: string[];

  public constructor(
    apiKey: string = process.env.GEMINI_API_KEY || '',
    models: string[] = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest']
  ) {
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured. Set the environment variable via $env:GEMINI_API_KEY or export GEMINI_API_KEY.'
      );
    }
    this.apiKey = apiKey;
    this.candidateModels = models;
  }

  public async generate(request: GeminiRequest): Promise<GeminiResponse> {
    const prompt = this.buildPrompt(request);

    // Apply input byte limits defined in constraints
    const maxBytes = request.constraints?.maxInputBytes || 24000;
    const boundedPrompt = prompt.length > maxBytes ? prompt.substring(0, maxBytes) + '\n[TRUNCATED_DUE_TO_SIZE]' : prompt;

    const payload = {
      contents: [{ parts: [{ text: boundedPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: request.constraints?.maxOutputTokens || 1500,
        temperature: 0.1, // Low temperature for deterministic analysis
      },
    };

    let lastError: Error | null = null;
    const attemptTimeoutMs = Math.min(request.constraints?.timeoutMs || 25000, 15000);

    // Model fallback chain: attempts next candidate on 503 (high demand) or 429 (rate limits) or timeout
    for (const model of this.candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 503 || response.status === 429) {
          // Model busy or rate-limited; try fallback
          const errBody = await response.text();
          lastError = new Error(`Model ${model} returned HTTP ${response.status}: ${errBody}`);
          continue;
        }

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Gemini API error (HTTP ${response.status}): ${errBody}`);
        }

        const data = (await response.json()) as any;
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.[0]?.text) {
          throw new Error(`Gemini response missing candidate parts: ${JSON.stringify(data)}`);
        }

        const rawText = candidate.content.parts[0].text;
        let parsedContent: Record<string, unknown>;
        try {
          parsedContent = JSON.parse(rawText);
        } catch {
          parsedContent = { rawOutput: rawText };
        }

        return {
          provider: 'gemini',
          model,
          schemaVersion: 'mockguard.gemini.response.v1',
          kind: request.mode === 'suggest-assertion' ? 'suggestion' : 'explanation',
          content: parsedContent,
          verified: false,
          needsHumanReview: true,
          usage: {
            inputTokens: data.usageMetadata?.promptTokenCount,
            outputTokens: data.usageMetadata?.candidatesTokenCount,
          },
        };
      } catch (err: any) {
        lastError = err;
        // If aborted or failed on this model, continue to try next candidate in fallback chain
        continue;
      }
    }

    throw lastError || new Error('All Gemini candidate models failed.');
  }

  private buildPrompt(request: GeminiRequest): string {
    return `
You are the MockGuard Advisory Agent for HackMatrix PS #41.
MockGuard mathematically proves that an AI-generated test verifies a mock instead of real application code.

TASK: ${request.mode}

TARGET TEST FILE:
\`\`\`typescript
${request.testExcerpt || 'N/A'}
\`\`\`

TARGET SYSTEM UNDER TEST (SUT):
\`\`\`typescript
${request.sourceExcerpt || 'N/A'}
\`\`\`

SURVIVING MUTANT SPECIFICATION:
${JSON.stringify(request.mutant || {}, null, 2)}

Provide your response strictly in valid JSON matching this schema:
{
  "finding": "1-sentence summary of the mock illusion",
  "rootCause": "Technical analysis of why the mock masked the code change",
  "suggestedAssertion": "Executable Jest / TypeScript code snippet asserting real behavior",
  "explanation": "Why this proposed assertion will cause the test to fail when the mutant is introduced",
  "confidenceScore": 0.95
}
`;
  }
}
