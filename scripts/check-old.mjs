import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/home/yuzaga/.gemini/antigravity-ide/brain/b90a7490-a8ae-405f-b7fb-eb4cde12f468/scratch/old_p1_unit07.json', 'utf8'));
let tableOnly = 0;
for (const q of data) {
  const lines = q.questionText.split('\n');
  const nonTableLines = lines.filter(l => !l.startsWith('>') && l.trim().length > 0);
  if (nonTableLines.length === 0) tableOnly++;
}
console.log('Old table-only questions:', tableOnly, '/', data.length);
