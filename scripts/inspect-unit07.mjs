import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/p1_unit07.json', 'utf8'));
console.log(`Total questions in p1_unit07.json: ${data.length}`);

// Let's check how many have table context
let hasTable = 0;
let noTable = 0;

for (let i = 0; i < data.length; i++) {
  const q = data[i];
  if (q.questionText.includes('> [!note]') || q.questionText.includes('table')) {
    hasTable++;
  } else {
    noTable++;
  }
}
console.log(`Questions with table: ${hasTable}`);
console.log(`Questions without table: ${noTable}`);

// Print sample questions without table
console.log('\n--- 5 Sample questions without table: ---');
let count = 0;
for (const q of data) {
  if (!q.questionText.includes('> [!note]') && !q.questionText.includes('table')) {
    console.log(`ID: ${q.id} | Shift: ${q.shift}`);
    console.log(`Text: ${q.questionText}`);
    console.log(`Options: ${JSON.stringify(q.options)}`);
    console.log('---');
    count++;
    if (count >= 5) break;
  }
}
