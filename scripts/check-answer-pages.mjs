import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function checkAnswerPages() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf');
  const pagesToCheck = [78, 79, 80, 81, 180, 181, 182, 183, 184, 185, 186, 187, 188];
  await pdf(buf, {
    pagerender: async function(pageData) {
      const pageNum = pageData.pageIndex + 1;
      if (pagesToCheck.includes(pageNum)) {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map(i => i.str).join(' ');
        console.log(`=== Page ${pageNum} ===`);
        console.log(text.slice(0, 300));
      }
      return '';
    }
  });
}

checkAnswerPages().catch(console.error);
