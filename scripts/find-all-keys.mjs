import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function findAllKeys() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf');
  const keys = [];
  await pdf(buf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      if (text.includes('ANSWER KEY') || text.includes('Answer Key')) {
        keys.push({ page: pageData.pageIndex + 1, text: text.slice(0, 200).replace(/\n/g, ' ') });
      }
      return '';
    }
  });
  console.log(`Found ${keys.length} answer keys:`);
  for (const k of keys) {
    console.log(`Page ${k.page}: ${k.text}`);
  }
}

findAllKeys().catch(console.error);
