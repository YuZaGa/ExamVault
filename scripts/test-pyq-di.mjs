import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { parseDiBlock } from './di-helper.mjs';

async function runPyq() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf');
  const pageTexts = [];
  const answerKeysByPage = new Map();

  await pdf(buf, {
    pagerender: async function(pageData) {
      const pageNum = pageData.pageIndex + 1;
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map(i => i.str).join(' ');
      pageTexts[pageNum] = text;
      if (text.includes('ANSWER KEY') || text.includes('Answer Key') || text.includes('ANSWERS')) {
        const matches = [...text.matchAll(/(\d+)\s+([A-D]|DROPPED|[A-D],[A-D])/g)];
        const km = new Map();
        for (const m of matches) km.set(parseInt(m[1], 10), m[2]);
        answerKeysByPage.set(pageNum, km);
      }
      return '';
    }
  });

  let totalQs = 0;
  for (let p = 1; p < pageTexts.length; p++) {
    const text = pageTexts[p];
    if (!text) continue;
    const shiftMatch = text.match(/([0-9]{2}[-–\s]+[0-9]{2}[-–\s]+[0-9]{4}[_A-Za-z\s]*)\s*\(\s*1\s*[-–]\s*5\s*\)/i);
    if (shiftMatch) {
      let keyPage = -1;
      for (const akPage of [...answerKeysByPage.keys()].sort((a, b) => a - b)) {
        if (akPage >= p) {
          keyPage = akPage;
          break;
        }
      }
      const keys = answerKeysByPage.get(keyPage);
      const keyObj = keys ? Object.fromEntries(keys) : {};
      
      const combinedText = text + '\n' + (pageTexts[p + 1] || '');
      const parsed = parseDiBlock(combinedText, shiftMatch[1], keyObj);
      if (parsed) {
        totalQs += parsed.questions.length;
        console.log(`[PYQ 2021-2023] ${shiftMatch[1].replace(/\s+/g, ' ').trim()} -> ${parsed.questions.length}/5 Qs`);
      }
    }
  }
  console.log(`Total PYQ DI Questions Extracted: ${totalQs}`);
}

runPyq().catch(console.error);
