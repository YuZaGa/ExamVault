import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

function cleanPdfArtifacts(text) {
  return text
    .replace(/To get free NTA NET study materials send "JOIN " Via WhatsApp \+?\d+/gi, '')
    .replace(/www\.aifer\.in\s*\d*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixOcrWords(text) {
  return text
    .replace(/\bS\s+tudy\b/g, 'Study')
    .replace(/\bwhi\s+ch\b/g, 'which')
    .replace(/\bWhi\s+ch\b/g, 'Which')
    .replace(/\bCompa\s+red\b/g, 'Compared')
    .replace(/\bfollowi\s+ng\b/g, 'following')
    .replace(/\bIn\s+ternational\b/g, 'International')
    .replace(/\bpercent\s+age\b/g, 'percentage');
}

function parseDiPage(rawText, shiftName, answerKeys) {
  const text = fixOcrWords(cleanPdfArtifacts(rawText));
  
  const startIdx = text.search(/\(\s*1\s*[-–]\s*5\s*\)/);
  const body = startIdx !== -1 ? text.slice(startIdx).replace(/^\(\s*1\s*[-–]\s*5\s*\)/, '').trim() : text;

  const q1Match = body.match(/(?:^|\s)1\.\s+/);
  if (!q1Match) return null;
  const tablePart = body.slice(0, q1Match.index).trim();
  const questionsPart = body.slice(q1Match.index).trim();

  const qRegex = /(?:^|\s)([1-5])\.\s+([\s\S]*?)(?=(?:\s+[1-5]\.\s+|$))/g;
  const questions = [];
  let m;
  while ((m = qRegex.exec(questionsPart)) !== null) {
    const qNum = m[1];
    const qRaw = m[2].trim();

    const optRegex = /\(([A-D])\s*\)\s*([\s\S]*?)(?=(?:\([A-D]\s*\)|$))/g;
    let optM;
    let optStart = -1;
    const options = [];
    while ((optM = optRegex.exec(qRaw)) !== null) {
      if (optStart === -1) optStart = optM.index;
      let optText = optM[2].trim();
      // clean trailing phone or page numbers
      optText = optText.replace(/\s*\+?\d{8,}\s*$/, '').replace(/\s*\d{1,3}$/, '').trim();
      options.push({ key: optM[1], text: optText });
    }

    const qStem = optStart !== -1 ? qRaw.slice(0, optStart).trim() : qRaw;
    let ans = answerKeys[qNum] || 'A';
    if (ans.includes(',')) ans = ans.split(',')[0]; // take first if multiple key
    if (ans === 'DROPPED') ans = 'A';

    if (options.length === 4) {
      questions.push({
        qNum,
        qStem,
        options,
        ans
      });
    }
  }

  if (questions.length >= 4 && tablePart.length > 20) {
    return { tablePart, questions };
  }
  return null;
}

async function extractAllPdfs() {
  const pdfConfigs = [
    { name: 'Dec 2024 Cycle', file: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf' },
    { name: 'June 2024 Cycle', file: '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf' }
  ];

  const allSets = [];

  for (const cfg of pdfConfigs) {
    console.log(`Processing ${cfg.name}...`);
    const buf = fs.readFileSync(cfg.file);
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
        const parsed = parseDiPage(text, shiftMatch[1], keyObj);
        if (parsed) {
          allSets.push({
            cycle: cfg.name,
            shiftRaw: shiftMatch[1].replace(/\s+/g, ' ').trim(),
            page: p,
            ...parsed
          });
        }
      }
    }
  }

  console.log(`\nSuccessfully extracted ${allSets.length} complete DI sets!`);
  for (const s of allSets) {
    console.log(`- [${s.cycle}] Shift: ${s.shiftRaw} (Page ${s.page}) -> ${s.questions.length} questions. Table snippet: ${s.tablePart.slice(0, 60)}...`);
  }
}

extractAllPdfs().catch(console.error);
