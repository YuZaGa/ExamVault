import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/p1_unit07.json', 'utf8'));
console.log(`Total questions in p1_unit07.json: ${data.length}`);

let withTable = 0;
let withoutTable = 0;
for (const q of data) {
  if (q.questionText.includes('> [!note]') || q.questionText.includes('table') || q.questionText.includes('Table')) {
    withTable++;
  } else {
    withoutTable++;
  }
}

console.log(`Questions WITH table context: ${withTable}`);
console.log(`Questions WITHOUT table context: ${withoutTable}`);
