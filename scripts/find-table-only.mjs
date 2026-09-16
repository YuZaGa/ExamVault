import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/p1_unit07.json', 'utf8'));

let tableOnly = 0;
const tableOnlyQs = [];

for (const q of data) {
  // Check if questionText has table, but NO question sentence after the table
  const lines = q.questionText.split('\n');
  const nonTableLines = lines.filter(l => !l.startsWith('>') && l.trim().length > 0);
  if (nonTableLines.length === 0) {
    tableOnly++;
    tableOnlyQs.push({ id: q.id, shift: q.shift, text: q.questionText.slice(0, 80) });
  }
}

console.log(`Total questions in p1_unit07.json: ${data.length}`);
console.log(`Questions with ONLY table (NO question prompt outside >): ${tableOnly}`);
console.log('Sample table-only questions:');
for (const s of tableOnlyQs.slice(0, 20)) {
  console.log(`- ${s.id} [${s.shift}]`);
}
