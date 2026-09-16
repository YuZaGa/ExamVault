import fs from 'fs';
import path from 'path';

const P2_DIR = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank_Paper2';
const P1_DIR = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank';
const MASTER_TABLES_P2 = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Paper_2_English_Literature_Master_Tables.md';
const ACTION_PLAN_P1 = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Unit_Wise_Action_Plan.md';
const OUTPUT_DIR = path.resolve('public/data');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Parse Master Tables & Action Plan for Cheat Sheet Rules
console.log('Loading Master Tables & Action Plan rules...');
const rulesMap = [];

function loadRules() {
  if (fs.existsSync(MASTER_TABLES_P2)) {
    const content = fs.readFileSync(MASTER_TABLES_P2, 'utf8');
    const tableRows = content.split('\n');
    for (const row of tableRows) {
      if (row.startsWith('|') && !row.includes('---') && !row.includes('Critical Term') && !row.includes('Sub-Field')) {
        const cols = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 2) {
          const term = cols[0].replace(/\*\*/g, '').replace(/"/g, '');
          const detail = cols[1].replace(/\*\*/g, '');
          const context = cols[2] ? cols[2].replace(/\*\*/g, '') : '';
          const fullRule = context ? `${term}: Coined/Proposed by ${detail} (${context})` : `${term}: ${detail}`;
          rulesMap.push({
            keyword: term.toLowerCase(),
            rule: fullRule,
            paper: 2
          });
        }
      }
    }
  }

  if (fs.existsSync(ACTION_PLAN_P1)) {
    const content = fs.readFileSync(ACTION_PLAN_P1, 'utf8');
    const tableRows = content.split('\n');
    for (const row of tableRows) {
      if (row.startsWith('|') && !row.includes('---') && !row.includes('Parameter') && !row.includes('Dimension')) {
        const cols = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 2) {
          const term = cols[0].replace(/\*\*/g, '').replace(/"/g, '');
          const detail = cols[1].replace(/\*\*/g, '');
          const extra = cols[2] ? cols[2].replace(/\*\*/g, '') : '';
          const fullRule = extra ? `${term}: ${detail} | ${extra}` : `${term}: ${detail}`;
          rulesMap.push({
            keyword: term.toLowerCase(),
            rule: fullRule,
            paper: 1
          });
        }
      }
    }
  }

  console.log(`Loaded ${rulesMap.length} high-yield cheat-sheet rules.`);
}

loadRules();

function findCheatSheetRule(text, paper) {
  const lower = text.toLowerCase();
  for (const r of rulesMap) {
    if ((r.paper === paper || !r.paper) && r.keyword.length > 3 && lower.includes(r.keyword)) {
      return r.rule;
    }
  }
  return null;
}

// Map files to units
const P2_FILES = [
  { file: '01_Drama.md', unitId: 1, title: 'Drama' },
  { file: '02_Poetry.md', unitId: 2, title: 'Poetry' },
  { file: '03_Fiction_Short_Story.md', unitId: 3, title: 'Fiction & Short Story' },
  { file: '04_Non_Fictional_Prose.md', unitId: 4, title: 'Non-Fictional Prose' },
  { file: '05_Language_Linguistics_and_ELT.md', unitId: 5, title: 'Language, Linguistics & ELT' },
  { file: '06_English_in_India.md', unitId: 6, title: 'English in India' },
  { file: '07_Cultural_Studies.md', unitId: 7, title: 'Cultural Studies' },
  { file: '08_Literary_Criticism.md', unitId: 8, title: 'Literary Criticism' },
  { file: '09_Literary_Theory.md', unitId: 9, title: 'Literary Theory' },
  { file: '10_Research_Methods_in_English.md', unitId: 10, title: 'Research Methods in English' },
];

const P1_FILES = [
  { file: '01_Teaching_Aptitude.md', unitId: 1, title: 'Teaching Aptitude' },
  { file: '02_Research_Aptitude.md', unitId: 2, title: 'Research Aptitude' },
  { file: '03_Reading_Comprehension.md', unitId: 3, title: 'Reading Comprehension' },
  { file: '04_Communication.md', unitId: 4, title: 'Communication' },
  { file: '05_Mathematical_Reasoning.md', unitId: 5, title: 'Mathematical Reasoning' },
  { file: '06_Logical_Reasoning.md', unitId: 6, title: 'Logical Reasoning' },
  { file: '07_Data_Interpretation.md', unitId: 7, title: 'Data Interpretation' },
  { file: '08_ICT.md', unitId: 8, title: 'ICT (Information & Communication Tech)' },
  { file: '09_People_and_Environment.md', unitId: 9, title: 'People, Development & Environment' },
  { file: '10_Higher_Education.md', unitId: 10, title: 'Higher Education System' },
];

function parseFile(filePath, paper, unitId, unitTitle) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const qBlocks = content.split(/\n(?=### Q)/);
  const questions = [];

  for (let idx = 0; idx < qBlocks.length; idx++) {
    const block = qBlocks[idx];
    if (!block.trim().startsWith('### Q')) continue;

    // Header extraction
    const headerMatch = block.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
    if (!headerMatch) continue;

    const qNumberLabel = headerMatch[1].trim();
    const shiftInfo = headerMatch[2] ? headerMatch[2].replace(/^\[|\]$/g, '').trim() : '';

    // Extract Answer
    let correctOption = null;
    const ansMatch = block.match(/Official NTA Answer:\**\s*(?:==)?\**\s*\(?([A-D1-4])\)?/i);
    if (ansMatch) {
      let rawAns = ansMatch[1].toUpperCase();
      if (rawAns === '1') rawAns = 'A';
      else if (rawAns === '2') rawAns = 'B';
      else if (rawAns === '3') rawAns = 'C';
      else if (rawAns === '4') rawAns = 'D';
      if (['A', 'B', 'C', 'D'].includes(rawAns)) {
        correctOption = rawAns;
      }
    }

    if (!correctOption) {
      // Skip if unknown answer or no answer provided
      continue;
    }

    // Extract Options: Look for (A)-(D), (1)-(4), or 1.-4.
    let options = [];
    let firstOptBlockIndex = -1;
    const optLetterRegex = /(?:^|\n)\s*\(([A-D1-4])\)\s*([\s\S]*?)(?=(?:\n\s*\([A-D1-4]\)|\n\s*>|\n\s*---|\n\s*###|$))/g;
    let optMatch;
    while ((optMatch = optLetterRegex.exec(block)) !== null) {
      if (firstOptBlockIndex === -1) {
        firstOptBlockIndex = optMatch.index;
      }
      let key = optMatch[1].toUpperCase();
      if (key === '1') key = 'A';
      else if (key === '2') key = 'B';
      else if (key === '3') key = 'C';
      else if (key === '4') key = 'D';
      let text = optMatch[2].replace(/==/g, '').trim();
      // Format mixed fraction newlines e.g. "13 7\n11" -> "13 7/11" or "135\n7" -> "135/7"
      text = text.replace(/^(\d+)\s+(\d+)\s*\n\s*(\d+)$/, '$1 $2/$3');
      text = text.replace(/^(\d+)\s*\n\s*(\d+)$/, '$1/$2');
      text = text.replace(/\s*\n\s*/g, ' ');
      // Clean any leaked subsequent question stems (e.g. "Article 31 48. Match List...")
      text = text.replace(/\s+\d+\.\s+[A-Za-z][\s\S]*$/, '').trim();
      options.push({ key, text });
    }

    // If (A)-(D) failed, look for 1. / 2. / 3. / 4. format
    if (options.length < 4) {
      options = [];
      firstOptBlockIndex = -1;
      const optNumberRegex = /(?:^|\n)\s*([1-4])\.\s*([\s\S]*?)(?=(?:\n\s*[1-4]\.|\n\s*>|\n\s*---|\n\s*###|$))/g;
      let numMatch;
      while ((numMatch = optNumberRegex.exec(block)) !== null) {
        if (firstOptBlockIndex === -1) {
          firstOptBlockIndex = numMatch.index;
        }
        const num = numMatch[1];
        const key = num === '1' ? 'A' : num === '2' ? 'B' : num === '3' ? 'C' : 'D';
        let text = numMatch[2].replace(/==/g, '').trim();
        text = text.replace(/^(\d+)\s+(\d+)\s*\n\s*(\d+)$/, '$1 $2/$3');
        text = text.replace(/^(\d+)\s*\n\s*(\d+)$/, '$1/$2');
        text = text.replace(/\s*\n\s*/g, ' ');
        text = text.replace(/\s+\d+\.\s+[A-Za-z][\s\S]*$/, '').trim();
        options.push({ key, text });
      }
    }

    if (options.length < 4) {
      // Skip questions where 4 distinct options could not be cleanly extracted
      continue;
    }

    // Ensure options are sorted A, B, C, D
    const optionMap = { A: '', B: '', C: '', D: '' };
    for (const opt of options.slice(0, 4)) {
      if (optionMap[opt.key] !== undefined) {
        optionMap[opt.key] = opt.text;
      }
    }
    const finalOptions = [
      { key: 'A', text: optionMap.A || options[0]?.text || '' },
      { key: 'B', text: optionMap.B || options[1]?.text || '' },
      { key: 'C', text: optionMap.C || options[2]?.text || '' },
      { key: 'D', text: optionMap.D || options[3]?.text || '' }
    ];

    // Extract Question Text: accurately slice before first option starts
    let questionText = '';
    if (firstOptBlockIndex !== -1 && firstOptBlockIndex > headerMatch[0].length) {
      questionText = block.substring(headerMatch[0].length, firstOptBlockIndex).trim();
    } else {
      let qBody = block.substring(headerMatch[0].length);
      const optStart = qBody.search(/(?:^|\n)\s*\([A-D1-4]\)/);
      questionText = optStart !== -1 ? qBody.substring(0, optStart).trim() : qBody.split(/\n\s*>/)[0].trim();
    }
    // Clean up leading question numbers e.g. "28. " at the start of questionText
    questionText = questionText.replace(/^\d+\.\s*/, '').trim();

    if (!questionText || questionText.length < 5) continue;

    const cheatSheetRule = findCheatSheetRule(questionText + ' ' + finalOptions.map(o => o.text).join(' '), paper);

    questions.push({
      id: `P${paper}-U${String(unitId).padStart(2, '0')}-${idx + 1}`,
      paper,
      unitId,
      unitTitle,
      shift: shiftInfo || `Official NTA Exam`,
      questionText,
      options: finalOptions,
      correctOption,
      cheatSheetRule: cheatSheetRule || null
    });
  }

  return questions;
}

// Process Paper 2
console.log('\n--- Processing Paper 2 (English Literature) ---');
const manifestUnits = [];
let totalP2 = 0;

for (const u of P2_FILES) {
  const filePath = path.join(P2_DIR, u.file);
  const questions = parseFile(filePath, 2, u.unitId, u.title);
  const outFileName = `p2_unit${String(u.unitId).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(OUTPUT_DIR, outFileName), JSON.stringify(questions, null, 2));
  console.log(`Unit ${u.unitId} (${u.title}): Saved ${questions.length} questions -> ${outFileName}`);
  totalP2 += questions.length;

  manifestUnits.push({
    paper: 2,
    unitId: u.unitId,
    title: u.title,
    questionCount: questions.length,
    fileName: outFileName
  });
}
console.log(`Total Paper 2 questions parsed & bundled: ${totalP2}`);

// Process Paper 1 (High-yield sets)
console.log('\n--- Processing Paper 1 (General Aptitude) ---');
let totalP1 = 0;

for (const u of P1_FILES) {
  const filePath = path.join(P1_DIR, u.file);
  // Include all authentic questions parsed from the question bank
  let questions = parseFile(filePath, 1, u.unitId, u.title);
  const outFileName = `p1_unit${String(u.unitId).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(OUTPUT_DIR, outFileName), JSON.stringify(questions, null, 2));
  console.log(`Unit ${u.unitId} (${u.title}): Saved ${questions.length} questions -> ${outFileName}`);
  totalP1 += questions.length;

  manifestUnits.push({
    paper: 1,
    unitId: u.unitId,
    title: u.title,
    questionCount: questions.length,
    fileName: outFileName
  });
}
console.log(`Total Paper 1 questions parsed & bundled: ${totalP1}`);

// Write manifest
const manifest = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  totalQuestions: totalP2 + totalP1,
  totalPaper2: totalP2,
  totalPaper1: totalP1,
  units: manifestUnits
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nManifest generated with ${manifest.totalQuestions} questions across 20 units!`);
