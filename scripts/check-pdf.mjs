import fs from 'fs';
import pdf from 'pdf-parse';

const pdfPath = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Paper_1_Practice_Question_Bank.pdf';

console.log('Reading PDF info...');
const dataBuffer = fs.readFileSync(pdfPath);

// Let's get page count and info
pdf(dataBuffer, { max: 5 }).then(function(data) {
  console.log('Total pages:', data.numpages);
  console.log('First 5 pages text sample:');
  console.log(data.text.slice(0, 1000));
}).catch(err => {
  console.error('Error reading PDF:', err);
});
