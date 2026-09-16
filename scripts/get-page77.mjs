import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function getPage(pdfPath, targetPage) {
  const buf = fs.readFileSync(pdfPath);
  let pageText = '';
  await pdf(buf, {
    pagerender: async function(pageData) {
      if (pageData.pageIndex + 1 === targetPage) {
        const textContent = await pageData.getTextContent();
        pageText = textContent.items.map(i => i.str).join(' ');
      }
      return '';
    }
  });
  console.log(`=== Page ${targetPage} ===`);
  console.log(pageText);
}

getPage('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf', 77).catch(console.error);
