import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function extractDecSets() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf');
  
  // First, extract all answer keys from 24 dec.pdf
  const answerKeysByPage = new Map();
  const pageTexts = [];

  console.log('Parsing 24 dec.pdf pages...');
  const data = await pdf(buf, {
    pagerender: async function(pageData) {
      const pageNum = pageData.pageIndex + 1;
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      pageTexts[pageNum] = text;
      
      if (text.includes('ANSWER KEY') || text.includes('Answer Key')) {
        // Parse Q.NO ANS
        const keyMap = new Map();
        const matches = [...text.matchAll(/(\d+)\s+([A-D]|DROPPED|[A-D],[A-D])/g)];
        for (const m of matches) {
          const qn = parseInt(m[1], 10);
          const ans = m[2];
          keyMap.set(qn, ans);
        }
        answerKeysByPage.set(pageNum, keyMap);
      }
      return '';
    }
  });

  console.log(`Extracted text for ${pageTexts.length - 1} pages.`);
  console.log(`Found answer keys on pages:`, [...answerKeysByPage.keys()]);

  // Now find DI sets: Look for "(1-5)"
  const diSets = [];
  for (let p = 1; p < pageTexts.length; p++) {
    const text = pageTexts[p];
    if (!text) continue;
    const shiftMatch = text.match(/([0-9]{2}[-–\s]+[0-9]{2}[-–\s]+[0-9]{4}[_A-Za-z\s]+)\s*\(\s*1\s*[-–]\s*5\s*\)/i);
    if (shiftMatch) {
      // Find corresponding answer key (first answer key page that is >= p)
      let keyPage = -1;
      for (const akPage of [...answerKeysByPage.keys()].sort((a, b) => a - b)) {
        if (akPage >= p) {
          keyPage = akPage;
          break;
        }
      }
      const keys = answerKeysByPage.get(keyPage);
      diSets.push({
        startPage: p,
        shift: shiftMatch[1].replace(/\s+/g, ' ').trim(),
        text: text,
        nextPageText: pageTexts[p + 1] || '',
        keyPage,
        keys: keys ? Object.fromEntries(keys) : {}
      });
    }
  }

  console.log(`Found ${diSets.length} DI sets in 24 dec.pdf:`);
  for (const s of diSets) {
    console.log(`- Shift: ${s.shift} (Page ${s.startPage}, Keys Page ${s.keyPage}) -> Q1-5 Keys: 1:${s.keys['1']} 2:${s.keys['2']} 3:${s.keys['3']} 4:${s.keys['4']} 5:${s.keys['5']}`);
  }
}

extractDecSets().catch(console.error);
