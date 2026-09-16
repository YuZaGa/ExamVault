import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

function cleanPdfArtifacts(text) {
  return text
    .replace(/To get free NTA NET study materials send "JOIN " Via WhatsApp \+\d+/gi, '')
    .replace(/www\.aifer\.in\s*\d*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDiPage(rawText, shiftName, answerKeys) {
  const text = cleanPdfArtifacts(rawText);
  
  // Cut after "(1-5)"
  const startIdx = text.search(/\(\s*1\s*[-–]\s*5\s*\)/);
  const body = startIdx !== -1 ? text.slice(startIdx).replace(/^\(\s*1\s*[-–]\s*5\s*\)/, '').trim() : text;

  // Split into table context and 5 questions
  // Find where "1. " starts
  const q1Match = body.match(/(?:^|\s)1\.\s+/);
  if (!q1Match) return null;
  const tablePart = body.slice(0, q1Match.index).trim();
  const questionsPart = body.slice(q1Match.index).trim();

  // Extract questions 1 to 5
  const qRegex = /(?:^|\s)([1-5])\.\s+([\s\S]*?)(?=(?:\s+[1-5]\.\s+|$))/g;
  const questions = [];
  let m;
  while ((m = qRegex.exec(questionsPart)) !== null) {
    const qNum = m[1];
    const qRaw = m[2].trim();

    // Extract options (A)-(D)
    const optRegex = /\(([A-D])\s*\)\s*([\s\S]*?)(?=(?:\([A-D]\s*\)|$))/g;
    let optM;
    let optStart = -1;
    const options = [];
    while ((optM = optRegex.exec(qRaw)) !== null) {
      if (optStart === -1) optStart = optM.index;
      options.push({ key: optM[1], text: optM[2].trim() });
    }

    const qStem = optStart !== -1 ? qRaw.slice(0, optStart).trim() : qRaw;
    const ans = answerKeys[qNum] || 'A';

    questions.push({
      qNum,
      qStem,
      options,
      ans
    });
  }

  return {
    tablePart,
    questions
  };
}

async function test() {
  const buf = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf');
  let p77 = '';
  await pdf(buf, {
    pagerender: async function(pageData) {
      if (pageData.pageIndex + 1 === 77) {
        const textContent = await pageData.getTextContent();
        p77 = textContent.items.map(i => i.str).join(' ');
      }
      return '';
    }
  });

  const parsed = parseDiPage(p77, '08-01-2025 FN', { '1': 'A', '2': 'C', '3': 'C', '4': 'D', '5': 'B' });
  console.log('--- TABLE CONTEXT ---');
  console.log(parsed.tablePart);
  console.log('\n--- QUESTIONS EXTRACTED ---');
  for (const q of parsed.questions) {
    console.log(`Q${q.qNum}: ${q.qStem} [Ans: ${q.ans}]`);
    for (const opt of q.options) {
      console.log(`  (${opt.key}) ${opt.text}`);
    }
  }
}

test().catch(console.error);
