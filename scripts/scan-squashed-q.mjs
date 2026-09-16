import fs from 'fs';
import path from 'path';

const qbDir = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank';
const files = fs.readdirSync(qbDir).filter(f => f.endsWith('.md') && f !== 'README.md');

console.log('Scanning Question_Bank for squashed questions inside options...');

for (const file of files) {
  const filePath = path.join(qbDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = content.split(/\n(?=### Q)/);
  let leaks = 0;
  for (const b of blocks) {
    // Check if within block there is "(D) ... \d+\.\s+[A-Z]"
    const dMatch = b.match(/\(D\)\s*([\s\S]*?)(?=(?:\n\s*>|\n\s*---|\n\s*###|$))/i);
    if (dMatch) {
      const text = dMatch[1];
      if (text.match(/(?:^|\n|\s)\d+\.\s+[A-Z]/)) {
        leaks++;
      }
    }
  }
  if (leaks > 0) {
    console.log(`- ${file}: ${leaks} squashed questions found!`);
  }
}
