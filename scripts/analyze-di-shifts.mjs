import fs from 'fs';

const filePath = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/07_Data_Interpretation.md';
const content = fs.readFileSync(filePath, 'utf8');
const qBlocks = content.split(/\n(?=### Q)/);

console.log(`Total blocks in 07_Data_Interpretation.md: ${qBlocks.length}`);

// Group blocks by shift
const shifts = new Map();

for (let i = 0; i < qBlocks.length; i++) {
  const block = qBlocks[i];
  if (!block.trim().startsWith('### Q')) continue;
  const headerMatch = block.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
  if (!headerMatch) continue;

  const qLabel = headerMatch[1].trim();
  const shiftInfo = headerMatch[2] ? headerMatch[2].replace(/^\[|\]$/g, '').trim() : 'Unknown Shift';
  
  // Normalize shift (e.g. remove "Q.1", "Q.2", etc.)
  // e.g. "December 2024 Cycle | Shift: 08-01-2025 FN | Q.1" -> "December 2024 Cycle | Shift: 08-01-2025 FN"
  const shiftBase = shiftInfo.replace(/\|\s*Q\.\d+.*$/i, '').trim();

  const hasTableNote = block.includes('> [!note]') || block.includes('following table') || block.includes('Study the table') || block.includes('Based on the data');
  
  if (!shifts.has(shiftBase)) {
    shifts.set(shiftBase, []);
  }
  shifts.get(shiftBase).push({
    index: i,
    qLabel,
    shiftInfo,
    hasTableNote,
    preview: block.slice(0, 150).replace(/\n/g, ' ')
  });
}

console.log(`Total unique shifts: ${shifts.size}`);

let shiftsAllWithTables = 0;
let shiftsSomeWithTables = 0;
let shiftsNoneWithTables = 0;

const problemShifts = [];

for (const [shift, questions] of shifts.entries()) {
  const withTable = questions.filter(q => q.hasTableNote);
  if (withTable.length === questions.length) {
    shiftsAllWithTables++;
  } else if (withTable.length > 0) {
    shiftsSomeWithTables++;
    problemShifts.push({ shift, total: questions.length, withTable: withTable.length, type: 'some' });
  } else {
    shiftsNoneWithTables++;
    problemShifts.push({ shift, total: questions.length, withTable: 0, type: 'none' });
  }
}

console.log(`Shifts where ALL questions have table: ${shiftsAllWithTables}`);
console.log(`Shifts where SOME questions have table: ${shiftsSomeWithTables}`);
console.log(`Shifts where NO questions have table: ${shiftsNoneWithTables}`);

console.log('\n--- Problem shifts ---');
for (const p of problemShifts) {
  console.log(`${p.type.toUpperCase()}: ${p.shift} (Total Qs: ${p.total}, With table: ${p.withTable})`);
}
