import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function check(filePath) {
  console.log(`Checking ${filePath}...`);
  const buf = fs.readFileSync(filePath);
  const data = await pdf(buf, { max: 2 });
  console.log(`Pages: ${data.numpages}`);
  console.log(`Text snippet: ${data.text.slice(0, 300).replace(/\n+/g, ' ')}`);
}

async function main() {
  await check('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/2025.pdf');
  await check('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf');
}

main().catch(console.error);
