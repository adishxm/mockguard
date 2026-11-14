import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv[2]?.toLowerCase();
if (mode !== 'weak' && mode !== 'strong') {
  console.log('Usage: node switch-tests.js <weak|strong>');
  process.exit(1);
}

const sourceFile = path.join(__dirname, 'templates', `checkout.${mode}.test.ts`);
const targetFile = path.join(__dirname, 'tests', 'checkout.test.ts');

if (!fs.existsSync(sourceFile)) {
  console.error(`Error: Template file not found: ${sourceFile}`);
  process.exit(1);
}

fs.copyFileSync(sourceFile, targetFile);
console.log(`[OK] Switched your-project to ${mode.toUpperCase()} test suite:`);
console.log(`     templates/checkout.${mode}.test.ts -> tests/checkout.test.ts`);

