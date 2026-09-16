import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function checkJuneAndPyqs() {
  console.log('--- Checking 24 june.pdf ---');
  const juneBuf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf');
  const juneTables = [];
  await pdf(juneBuf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      if (text.includes('(1-5)') || text.includes('table to answer') || text.includes('following table')) {
        juneTables.push({ page: pageData.pageIndex + 1, snippet: text.slice(0, 250).replace(/\n/g, ' ') });
      }
      return '';
    }
  });
  console.log(`June matches: ${juneTables.length}`);
  for (const m of juneTables.slice(0, 5)) {
    console.log(`Page ${m.page}: ${m.snippet}`);
  }

  console.log('\n--- Checking PAPER-1 (2021-2023)PYQs.pdf ---');
  const pyqBuf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf');
  const pyqTables = [];
  await pdf(pyqBuf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      if (text.includes('(1-5)') || text.includes('table to answer') || text.includes('following table')) {
        pyqTables.push({ page: pageData.pageIndex + 1, snippet: text.slice(0, 250).replace(/\n/g, ' ') });
      }
      return '';
    }
  });
  console.log(`PYQ matches: ${pyqTables.length}`);
  for (const m of pyqTables.slice(0, 5)) {
    console.log(`Page ${m.page}: ${m.snippet}`);
  }
}

checkJuneAndPyqs().catch(console.error);
