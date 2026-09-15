import fs from 'fs';

const content = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/01_Teaching_Aptitude.md', 'utf8');
const lines = content.split('\n');

for (let i = 2000; i < lines.length; i++) {
  if (lines[i].startsWith('#')) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
  if (i > 3000) break;
}
