import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// Load 07_Data_Interpretation.md
const mdContent = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/07_Data_Interpretation.md', 'utf8');
const qBlocks = mdContent.split(/\n(?=### Q)/);

const shiftQuestions = new Map();
for (let i = 0; i < qBlocks.length; i++) {
  const b = qBlocks[i];
  if (!b.trim().startsWith('### Q')) continue;
  const m = b.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
  if (!m) continue;
  const shiftInfo = m[2] ? m[2].replace(/^\[|\]$/g, '').trim() : 'Unknown';
  const shiftBase = shiftInfo.replace(/\|\s*Q\.\d+.*$/i, '').trim();
  const hasTable = b.includes('> [!note]') || b.includes('following table') || b.includes('Study the table');
  
  if (!shiftQuestions.has(shiftBase)) {
    shiftQuestions.set(shiftBase, { hasTable: false, count: 0, sampleText: '' });
  }
  const s = shiftQuestions.get(shiftBase);
  s.count++;
  if (hasTable) s.hasTable = true;
  if (!s.sampleText) {
    // Get first question line
    const qLine = b.split('\n').find(l => l.match(/^\s*\d+\.\s+/));
    if (qLine) s.sampleText = qLine.trim();
  }
}

const missingShifts = [];
for (const [shift, data] of shiftQuestions.entries()) {
  if (!data.hasTable) {
    missingShifts.push({ shift, count: data.count, sampleText: data.sampleText });
  }
}

console.log(`Total missing shifts: ${missingShifts.length}`);

// Now let's see which missing shifts match in our PDFs
const pdfs = [
  { name: '24 dec.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf' },
  { name: '24 june.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf' },
  { name: 'PAPER-1 (2021-2023)PYQs.pdf', path: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf' }
];

async function matchMissing() {
  const pdfTexts = [];
  for (const p of pdfs) {
    console.log(`Loading ${p.name}...`);
    const buf = fs.readFileSync(p.path);
    const pages = [];
    await pdf(buf, {
      pagerender: async function(pageData) {
        const textContent = await pageData.getTextContent();
        pages[pageData.pageIndex + 1] = textContent.items.map(i => i.str).join(' ');
        return '';
      }
    });
    pdfTexts.push({ name: p.name, pages });
  }

  console.log('\n--- Matching Missing Shifts against PDFs ---');
  let matchedCount = 0;
  for (const ms of missingShifts) {
    let found = false;
    // Extract key search words from sampleText
    const cleanSample = ms.sampleText.replace(/^\d+\.\s*/, '').slice(0, 40);
    // Also try shift date e.g. "08-01-2025" or "22-08-2024" or "21-02-2023"
    const dateMatch = ms.shift.match(/(\d{2}[-.\/]\d{2}[-.\/]\d{4}|\d{2}[-.\/]\d{2}[-.\/]\d{2})/);
    const dateStr = dateMatch ? dateMatch[1].replace(/[\.\/]/g, '-') : null;

    for (const pt of pdfTexts) {
      for (let pageNum = 1; pageNum < pt.pages.length; pageNum++) {
        const pText = pt.pages[pageNum];
        if (!pText) continue;
        const hasSample = cleanSample.length > 10 && pText.includes(cleanSample);
        const hasDate = dateStr && pText.includes(dateStr);
        if (hasSample || (hasDate && pText.includes('(1-5)'))) {
          console.log(`MATCH: "${ms.shift}" -> Found in ${pt.name} on Page ${pageNum}`);
          found = true;
          matchedCount++;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      console.log(`NOT FOUND: "${ms.shift}" (Sample: "${cleanSample}")`);
    }
  }
  console.log(`\nTotal matched: ${matchedCount} / ${missingShifts.length}`);
}

matchMissing().catch(console.error);
