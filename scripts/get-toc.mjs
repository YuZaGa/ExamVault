import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function getToc() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Paper_1_Practice_Question_Bank.pdf');
  await pdf(buf, {
    pagerender: async function(pageData) {
      const pageNum = pageData.pageIndex + 1;
      if (pageNum >= 1 && pageNum <= 5) {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map(i => i.str).join(' ');
        console.log(`=== Page ${pageNum} ===`);
        console.log(text);
      }
      return '';
    }
  });
}

getToc().catch(console.error);
