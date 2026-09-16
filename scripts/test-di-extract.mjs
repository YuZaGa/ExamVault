import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function testExtraction() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf');
  
  // Extract text and answer keys
  const pageTexts = [];
  const answerKeys = new Map();

  await pdf(buf, {
    pagerender: async function(pageData) {
      const pageNum = pageData.pageIndex + 1;
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      pageTexts[pageNum] = text;
      if (text.includes('ANSWER KEY') || text.includes('Answer Key')) {
        const matches = [...text.matchAll(/(\d+)\s+([A-D]|DROPPED|[A-D],[A-D])/g)];
        const km = new Map();
        for (const m of matches) km.set(parseInt(m[1], 10), m[2]);
        answerKeys.set(pageNum, km);
      }
      return '';
    }
  });

  // Let's test page 77: Shift 08-01-2025 FN
  const p77 = pageTexts[77];
  console.log('--- Page 77 text sample ---');
  console.log(p77.slice(0, 500));
}

testExtraction().catch(console.error);
