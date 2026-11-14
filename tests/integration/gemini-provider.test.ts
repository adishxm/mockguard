import test from 'node:test';
import assert from 'node:assert';
import { GoogleGeminiProvider } from '../../gemini_integration/gemini_provider.js';

test('Gemini Integration 1: GoogleGeminiProvider throws descriptive error when GEMINI_API_KEY is missing', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    assert.throws(
      () => new GoogleGeminiProvider(''),
      /GEMINI_API_KEY is not configured/,
      'Provider should require API key'
    );
  } finally {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }
});

test('Gemini Integration 2: GoogleGeminiProvider initializes with custom fallback models', () => {
  const provider = new GoogleGeminiProvider('dummy-key-for-unit-test', ['gemini-flash-latest', 'gemini-2.5-flash']);
  assert.ok(provider);
});
