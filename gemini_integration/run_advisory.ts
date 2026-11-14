import { GoogleGeminiProvider } from './gemini_provider.js';
import { GeminiRequest } from './provider_contract.js';

/**
 * MockGuard Gemini Advisory CLI
 * Turns deterministic mock survival evidence into actionable behavioral assertions.
 */
async function main() {
  console.log('\n============================================================');
  console.log('🤖 MockGuard + Google Gemini Advisory Bridge (Build with Gemini)');
  console.log('============================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY environment variable is not set.');
    console.error('Please set it using:');
    console.error('  $env:GEMINI_API_KEY = "your_key" (Windows PowerShell)');
    console.error('  export GEMINI_API_KEY="your_key" (Linux / macOS)\n');
    process.exit(1);
  }

  // Sample or target surviving mutant case
  const sampleTest = `
describe('PaymentProcessor', () => {
  it('processes payment successfully', async () => {
    const mockGateway = { charge: jest.fn().mockReturnValue(true) };
    const processor = new PaymentProcessor(mockGateway);
    
    // AI-generated assertion tests the mock, NOT real logic!
    const result = await processor.execute(100);
    expect(mockGateway.charge).toHaveBeenCalled();
  });
});`;

  const sampleSut = `
export class PaymentProcessor {
  constructor(private gateway: any) {}
  async execute(amount: number) {
    if (amount <= 0) throw new Error("Invalid amount");
    return this.gateway.charge(amount);
  }
}`;

  const request: GeminiRequest = {
    mode: 'suggest-assertion',
    testExcerpt: sampleTest.trim(),
    sourceExcerpt: sampleSut.trim(),
    mutant: {
      id: 'mutant_boundary_amount_le_0',
      mutator: 'EqualityOperatorReplacement',
      original: 'if (amount <= 0)',
      mutated: 'if (amount < 0)',
      status: 'SURVIVED',
      reason: 'Test does not assert rejection of zero/negative amounts; it only verifies mock was called.'
    },
    constraints: {
      maxInputBytes: 15000,
      maxOutputTokens: 1200,
      timeoutMs: 30000,
      allowSourceUpload: true
    }
  };

  console.log('🔍 [MockGuard]: Deterministic mutant survival detected:');
  console.log('   Mutant: "amount <= 0" replaced with "amount < 0"');
  console.log('   Status: SURVIVED (Test asserts mock interaction, not code behavior)\n');
  console.log('📡 [Gemini API]: Querying Google AI Studio (gemini-flash-latest)...');

  try {
    const provider = new GoogleGeminiProvider(apiKey);
    const start = Date.now();
    const response = await provider.generate(request);
    const elapsed = Date.now() - start;

    console.log(`✅ [Gemini API]: Advisory response received in ${elapsed}ms!\n`);
    console.log('------------------------------------------------------------');
    console.log('💡 GEMINI ADVISORY ROOT CAUSE:');
    console.log('------------------------------------------------------------');
    const content = response.content as any;
    console.log(content.rootCause || content.finding || JSON.stringify(content, null, 2));

    console.log('\n------------------------------------------------------------');
    console.log('🛠️  SUGGESTED BEHAVIORAL ASSERTION (KILLS THE MUTANT):');
    console.log('------------------------------------------------------------');
    console.log(content.suggestedAssertion || 'See full JSON output');

    console.log('\n------------------------------------------------------------');
    console.log('📊 VERIFICATION & HUMAN-IN-THE-LOOP SAFETY:');
    console.log('------------------------------------------------------------');
    console.log(`- Verified Status:     ${response.verified ? 'YES' : 'NO (Independent verification required)'}`);
    console.log(`- Human Review Gate:   ${response.needsHumanReview ? 'REQUIRED' : 'NO'}`);
    console.log(`- Model:               ${response.model}`);
    console.log(`- Tokens Consumed:     Prompt: ${response.usage?.inputTokens ?? 'N/A'}, Output: ${response.usage?.outputTokens ?? 'N/A'}`);
    console.log('------------------------------------------------------------\n');

  } catch (err: any) {
    console.error('❌ [Gemini API Error]:', err.message);
    process.exit(1);
  }
}

main();
