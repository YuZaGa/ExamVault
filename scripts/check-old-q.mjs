import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/home/yuzaga/.gemini/antigravity-ide/brain/b90a7490-a8ae-405f-b7fb-eb4cde12f468/scratch/old_p1_unit07.json', 'utf8'));
const q = data.find(x => x.shift && x.shift.includes('09-01-2025 FN | Q.1'));
console.log('Old Q:');
console.log(JSON.stringify(q, null, 2));
