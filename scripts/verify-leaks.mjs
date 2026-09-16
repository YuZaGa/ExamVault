import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('public/data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');

let totalLeaks = 0;
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  let fileLeaks = 0;
  for (const q of content) {
    for (const opt of q.options || []) {
      if (opt.text.match(/\s+\d+\.\s+[A-Za-z]/)) {
        console.log(`[LEAK DETECTED] in ${file} -> Q ID: ${q.id} (Option ${opt.key}): "${opt.text}"`);
        fileLeaks++;
        totalLeaks++;
      }
    }
  }
  if (fileLeaks === 0) {
    console.log(`✓ ${file}: Clean (0 leaked options)`);
  }
}

console.log(`\nVerification finished: Total leaked options across entire app = ${totalLeaks}`);
