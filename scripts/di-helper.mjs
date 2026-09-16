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

export function parseDiBlock(text, shiftName, answerKeys) {
  const cleaned = fixOcrWords(cleanPdfArtifacts(text));
  
  const startIdx = cleaned.search(/\(\s*1\s*[-–]\s*5\s*\)/);
  const body = startIdx !== -1 ? cleaned.slice(startIdx).replace(/^\(\s*1\s*[-–]\s*5\s*\)/, '').trim() : cleaned;

  const q1Match = body.match(/(?:^|\s)1\.\s+/);
  if (!q1Match) return null;
  const tablePart = body.slice(0, q1Match.index).trim();
  
  // Cut off after question 5 (i.e. before question 6 starts)
  const q6Match = body.match(/(?:^|\s)6\.\s+/);
  const questionsPart = q6Match ? body.slice(q1Match.index, q6Match.index).trim() : body.slice(q1Match.index).trim();

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
      optText = optText.replace(/\s*\+?\d{8,}\s*$/, '').replace(/\s*\d{1,3}$/, '').trim();
      options.push({ key: optM[1], text: optText });
    }

    const qStem = optStart !== -1 ? qRaw.slice(0, optStart).trim() : qRaw;
    let ans = answerKeys[qNum] || 'A';
    if (ans.includes(',')) ans = ans.split(',')[0];
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
