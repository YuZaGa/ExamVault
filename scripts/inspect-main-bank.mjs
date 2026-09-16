import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function inspectMainBank() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Paper_1_Practice_Question_Bank.pdf');
  console.log('Buffer loaded:', buf.length);
  
  let totalPages = 0;
  const unitMatches = [];
  
  await pdf(buf, {
    pagerender: async function(pageData) {
      totalPages++;
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      if (text.includes('Data Interpretation') || text.includes('DATA INTERPRETATION') || text.includes('Unit-VII') || text.includes('Unit 7') || text.includes('Unit VII')) {
        unitMatches.push({ page: pageData.pageIndex + 1, text: text.slice(0, 200).replace(/\n/g, ' ') });
      }
      return '';
    }
  });
  
  console.log(`Total pages: ${totalPages}`);
  console.log(`Found ${unitMatches.length} unit matches:`);
  for (const u of unitMatches.slice(0, 15)) {
    console.log(`Page ${u.page}: ${u.text}`);
  }
}

inspectMainBank().catch(console.error);
