import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function searchShift45() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/paper-1-2021-March-final-2.pdf');
  console.log('Searching paper-1-2021-March-final-2.pdf...');
  let count = 0;
  await pdf(buf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      if (text.includes('Shift_45') || text.includes('Shift 45') || text.includes('Shift-45')) {
        console.log(`Found Shift_45 on page ${pageData.pageIndex + 1}: ${text.slice(0, 200)}`);
        count++;
      }
      return '';
    }
  });
  console.log(`Matches for Shift 45: ${count}`);
}

searchShift45().catch(console.error);
