import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { parseDiBlock } from './di-helper.mjs';

const MD_PATH = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/07_Data_Interpretation.md';

async function extractFromPdf(pdfPath, cycleName) {
  const buf = fs.readFileSync(pdfPath);
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

  const sets = [];
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
      if (parsed && parsed.questions.length >= 4) {
        // Normalize shift name
        let cleanShift = shiftMatch[1].replace(/\s+/g, ' ').trim();
        cleanShift = cleanShift.replace(/\s*_\s*/g, ' ').replace(/\bFN\b/, 'FN').replace(/\bAN\b/, 'AN');
        sets.push({
          cycle: cycleName,
          shift: cleanShift,
          page: p,
          tablePart: parsed.tablePart,
          questions: parsed.questions
        });
      }
    }
  }
  return sets;
}

async function rebuildDi() {
  console.log('1. Extracting authentic DI sets from PDFs...');
  const decSets = await extractFromPdf('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf', 'December 2024 Cycle');
  const juneSets = await extractFromPdf('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf', 'June 2024 Cycle');
  const pyqSets = await extractFromPdf('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf', '2021-2023 PYQs');

  const allPdfSets = [...decSets, ...juneSets, ...pyqSets];
  console.log(`Extracted total ${allPdfSets.length} authentic DI sets (${allPdfSets.reduce((sum, s) => sum + s.questions.length, 0)} questions).`);

  // Index PDF sets by normalized date/shift
  function getShiftKey(str) {
    const dMatch = str.match(/(\d{2})[-.\s]+(\d{2})[-.\s]+(\d{4})/);
    if (!dMatch) return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const session = str.includes('AN') ? 'an' : 'fn';
    return `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}_${session}`;
  }

  const pdfSetsByKey = new Map();
  for (const s of allPdfSets) {
    const k = getShiftKey(s.shift);
    pdfSetsByKey.set(k, s);
  }

  console.log('\n2. Reading existing 07_Data_Interpretation.md...');
  const mdContent = fs.readFileSync(MD_PATH, 'utf8');
  const blocks = mdContent.split(/\n(?=### Q)/);
  console.log(`Original blocks: ${blocks.length}`);

  // Keep valid existing blocks (first ~73 shifts that already had tables and no leakage)
  const finalBlocks = [];
  let keptOriginal = 0;
  let replacedWithPdf = 0;
  let newlyAdded = 0;
  let skippedNonDi = 0;

  const processedKeys = new Set();

  for (const b of blocks) {
    if (!b.trim().startsWith('### Q')) continue;
    const headerMatch = b.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
    if (!headerMatch) continue;

    const shiftInfo = headerMatch[2] ? headerMatch[2].replace(/^\[|\]$/g, '').trim() : '';
    const shiftKey = getShiftKey(shiftInfo);

    // Check if this block is one of the non-DI questions at the end (e.g. teaching aptitude)
    if (b.includes('Which is the least important factor in teaching') ||
        b.includes('Team teaching has the potential to develop') ||
        b.includes('The quality of teaching is reflected') ||
        b.includes('An effective teacher is one who can') ||
        b.includes('Lecture Method can develop reasoning') ||
        b.includes('Knowledge of students’ needs') ||
        b.includes('According to Swami Vivekananda') ||
        b.includes('The teacher has been glorified') ||
        b.includes('Syllabus is a part of curriculum') ||
        b.includes('Greater the handicap of the students') ||
        b.includes('Inductive reasoning presupposes') ||
        b.includes('As per the NCTE norms')) {
      skippedNonDi++;
      continue;
    }

    const hasTable = b.includes('> [!note]') || b.includes('following table') || b.includes('Study the table');

    if (hasTable) {
      // Keep existing good block
      finalBlocks.push(b.trim());
      keptOriginal++;
      processedKeys.add(shiftKey);
    } else {
      // Missing table! Check if we have an authentic set from PDF!
      if (pdfSetsByKey.has(shiftKey) && !processedKeys.has(shiftKey)) {
        const pdfSet = pdfSetsByKey.get(shiftKey);
        // Generate 5 clean markdown blocks for this set
        for (let i = 0; i < pdfSet.questions.length; i++) {
          const q = pdfSet.questions[i];
          const qId = `[${pdfSet.cycle.slice(0, 4)}]-R${replacedWithPdf + 1}_Q${q.qNum}`;
          const qHeader = `### Q${qId}. [${pdfSet.cycle} | Shift: ${pdfSet.shift} | Q.${q.qNum}]`;
          const tableBlock = `> [!note] Context / Passage / Table\n> ${pdfSet.tablePart.replace(/\n/g, '\n> ')}`;
          const opts = q.options.map(o => `(${o.key}) ${o.text}`).join('\n');
          const ansBlock = `> **Official NTA Answer:** ==**${q.ans}**==`;
          
          const newBlock = `${qHeader}\n\n${tableBlock}\n\n${q.qNum}. ${q.qStem}\n${opts}\n\n${ansBlock}\n\n---`;
          finalBlocks.push(newBlock);
        }
        replacedWithPdf++;
        processedKeys.add(shiftKey);
      }
    }
  }

  // Also add any PDF sets that weren't in the original at all
  for (const [k, pdfSet] of pdfSetsByKey.entries()) {
    if (!processedKeys.has(k)) {
      for (let i = 0; i < pdfSet.questions.length; i++) {
        const q = pdfSet.questions[i];
        const qId = `[${pdfSet.cycle.slice(0, 4)}]-NEW${newlyAdded + 1}_Q${q.qNum}`;
        const qHeader = `### Q${qId}. [${pdfSet.cycle} | Shift: ${pdfSet.shift} | Q.${q.qNum}]`;
        const tableBlock = `> [!note] Context / Passage / Table\n> ${pdfSet.tablePart.replace(/\n/g, '\n> ')}`;
        const opts = q.options.map(o => `(${o.key}) ${o.text}`).join('\n');
        const ansBlock = `> **Official NTA Answer:** ==**${q.ans}**==`;
        
        const newBlock = `${qHeader}\n\n${tableBlock}\n\n${q.qNum}. ${q.qStem}\n${opts}\n\n${ansBlock}\n\n---`;
        finalBlocks.push(newBlock);
      }
      newlyAdded++;
      processedKeys.add(k);
    }
  }

  console.log(`\nRebuild summary:`);
  console.log(`- Kept existing valid blocks: ${keptOriginal}`);
  console.log(`- Replaced missing-table shifts with authentic PDF sets: ${replacedWithPdf} shifts (${replacedWithPdf * 5} Qs)`);
  console.log(`- Newly added PDF shifts: ${newlyAdded} shifts (${newlyAdded * 5} Qs)`);
  console.log(`- Removed non-DI (Teaching Aptitude) questions: ${skippedNonDi}`);
  console.log(`- Total resulting markdown blocks: ${finalBlocks.length}`);

  // Write rebuilt markdown file
  const newMdContent = finalBlocks.join('\n\n') + '\n';
  fs.writeFileSync(MD_PATH, newMdContent, 'utf8');
  console.log(`\nSuccessfully updated ${MD_PATH}!`);
}

rebuildDi().catch(console.error);
