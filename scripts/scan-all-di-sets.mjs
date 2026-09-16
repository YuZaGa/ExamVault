import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const pdfs = [
  { name: '24 dec.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf' },
  { name: '24 june.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf' },
  { name: 'PAPER-1 (2021-2023)PYQs.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf' },
  { name: 'paper-1-2021-March-final-2.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/paper-1-2021-March-final-2.pdf' },
  { name: 'book.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/book.pdf' }
];

async function scanPdfs() {
  for (const item of pdfs) {
    if (!fs.existsSync(item.path)) continue;
    const buf = fs.readFileSync(item.path);
    const sets = [];
    await pdf(buf, {
      pagerender: async function(pageData) {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map(i => i.str).join(' ');
        // Look for pattern like (1-5) or "Questions 1-5" or DI headers
        const m = text.match(/(?:(?:[0-9]{2}[-–\s]+[0-9]{2}[-–\s]+[0-9]{4}|Shift)[^\n]{0,40}\(1\s*[-–]\s*5\))|(?:Questions?\s+(?:1\s*[-–]\s*5|1\s+to\s+5)[^\n]{0,50})/i);
        if (m) {
          sets.push({ page: pageData.pageIndex + 1, header: m[0].trim() });
        }
        return '';
      }
    });
    console.log(`=== ${item.name} ===: Found ${sets.length} DI sets`);
    for (const s of sets) {
      console.log(`  Page ${s.page}: ${s.header}`);
    }
  }
}

scanPdfs().catch(console.error);
