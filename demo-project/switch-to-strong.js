import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(__dirname, 'templates', 'checkout.strong.test.ts');
const targetPath = path.join(__dirname, 'tests', 'checkout.test.ts');

fs.copyFileSync(templatePath, targetPath);
console.log('Switched demo-project to STRONG behavioral test suite (templates/checkout.strong.test.ts -> tests/checkout.test.ts)');
