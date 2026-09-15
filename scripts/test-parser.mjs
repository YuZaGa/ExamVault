import fs from 'fs';

const filePath = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank_Paper2/01_Drama.md';
const content = fs.readFileSync(filePath, 'utf8');

const rawQuestions = content.split(/\n(?=### Q\d+\.)/);
console.log('Total raw chunks:', rawQuestions.length);

for (let i = 1; i <= 3; i++) {
  console.log(`\n=================== QUESTION ${i} ===================`);
  console.log(rawQuestions[i]);
}
