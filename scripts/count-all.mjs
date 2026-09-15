import fs from 'fs';
import path from 'path';

function countQuestions(dir, label) {
  console.log(`=== ${label} ===`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
  let grandTotal = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const matches = content.match(/^### Q.*$/gm) || [];
    console.log(`${file}: ${matches.length} questions`);
    grandTotal += matches.length;
  }
  console.log(`Total ${label}: ${grandTotal}\n`);
}

countQuestions('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank_Paper2', 'Paper 2');
countQuestions('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank', 'Paper 1');
