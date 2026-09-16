import fs from 'fs';

const oldData = JSON.parse(fs.readFileSync('/home/yuzaga/.gemini/antigravity-ide/brain/b90a7490-a8ae-405f-b7fb-eb4cde12f468/scratch/old_p1_unit07.json', 'utf8'));

console.log('Checking old_p1_unit07.json for questions missing question stems:');
let broken = 0;
for (const q of oldData) {
  // Check if text has "following table" but no question sentence
  // e.g. text ends with the table or has no "?", or promptText in splitContext is empty
  const lines = q.questionText.split('\n');
  const nonContext = lines.filter(l => !l.startsWith('>') && l.trim().length > 0);
  if (nonContext.length === 0) {
    broken++;
    console.log(`BROKEN (No question stem): ${q.id} | ${q.shift}`);
  }
}
console.log(`Total broken in old data: ${broken} / ${oldData.length}`);
