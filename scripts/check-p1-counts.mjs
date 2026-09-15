import fs from 'fs';
import path from 'path';

const P1_DIR = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank';
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

function parseCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const qBlocks = content.split(/\n(?=### Q)/);
  let count = 0;
  for (const block of qBlocks) {
    if (!block.trim().startsWith('### Q')) continue;
    const headerMatch = block.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
    if (!headerMatch) continue;
    const ansMatch = block.match(/Official NTA Answer:\**\s*(?:==)?\**\s*\(?([A-D1-4])\)?/i);
    if (!ansMatch) continue;
    let optCount = 0;
    const optLetterRegex = /(?:^|\n)\s*\(([A-D1-4])\)\s*([\s\S]*?)(?=(?:\n\s*\([A-D1-4]\)|\n\s*>|\n\s*---|\n\s*###|$))/g;
    while (optLetterRegex.exec(block) !== null) optCount++;
    if (optCount < 4) {
      const optNumberRegex = /(?:^|\n)\s*([1-4])\.\s*([\s\S]*?)(?=(?:\n\s*[1-4]\.|\n\s*>|\n\s*---|\n\s*###|$))/g;
      optCount = 0;
      while (optNumberRegex.exec(block) !== null) optCount++;
    }
    if (optCount >= 4) count++;
  }
  return count;
}

for (const u of P1_FILES) {
  const c = parseCount(path.join(P1_DIR, u.file));
  console.log(`Unit ${u.unitId} (${u.title}): ${c} total valid questions`);
}
