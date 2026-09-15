import fs from 'fs';
import path from 'path';

function checkDirectory(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const qMatches = content.match(/### Q\d+/g) || [];
    const ansMatches = content.match(/Official NTA Answer.*?([A-D])/gi) || [];
    console.log(`${file}: ${qMatches.length} questions, ${ansMatches.length} answers matched`);
  }
}

console.log('--- Paper 2 ---');
checkDirectory('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank_Paper2');

console.log('\n--- Paper 1 ---');
checkDirectory('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank');
