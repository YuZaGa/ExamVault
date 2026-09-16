import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function searchPdf() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/2025.pdf');
  const data = await pdf(buf);
  console.log('Total pages in 2025.pdf:', data.numpages);
  
  const text = data.text;
  const idx = text.indexOf('Fruits');
  console.log('Index of Fruits:', idx);
  if (idx !== -1) {
    console.log('--- Context around Fruits ---');
    console.log(text.slice(Math.max(0, idx - 800), idx + 800));
  }

  // Let's also check if 08-01-2025 or "08/01/2025" or "8 January" is in the text
  const matchShift = text.match(/(?:08[\/-]01[\/-]2025|8th Jan|08 Jan|Shift)/gi);
  console.log('Shift matches:', matchShift ? matchShift.slice(0, 10) : 'none');
}

searchPdf().catch(console.error);
