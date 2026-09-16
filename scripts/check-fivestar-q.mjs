import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/p1_unit07.json', 'utf8'));
const q = data.find(x => x.shift && x.shift.includes('06-03-2023 POLI_SC_AN | Q.1'));

console.log('Testing Five Star question:');
console.log('ID:', q.id);
console.log('Shift:', q.shift);
console.log('Text:', q.questionText);
