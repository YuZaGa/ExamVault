import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function searchAnswerKey() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf');
  const matches = [];
  await pdf(buf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      if (text.includes('08- 01-2025') || text.includes('08-01-2025') || text.includes('Answer Key')) {
        if (text.includes('Answer') || text.includes('Key') || text.includes('ANSWERS')) {
          matches.push({ page: pageData.pageIndex + 1, text: text.slice(0, 300) });
        }
      }
      return '';
    }
  });
  console.log(`Found ${matches.length} matches:`);
  for (const m of matches) {
    console.log(`Page ${m.page}: ${m.text}`);
  }
}

searchAnswerKey().catch(console.error);
