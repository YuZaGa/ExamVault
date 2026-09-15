import fs from 'fs';

const content = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/01_Teaching_Aptitude.md', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

let qHeaders = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('#')) {
    qHeaders.push({ line: i, text: lines[i] });
    if (qHeaders.length > 25) break;
  }
}
console.log('Headers:', qHeaders);
