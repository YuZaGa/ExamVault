import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const pdfs = [
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/paper-1-2021-March-final-2.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/Paper_1_Practice_Question_Bank.pdf'
];

async function searchPhrase(phrase) {
  console.log(`Searching for "${phrase}"...`);
  for (const p of pdfs) {
    const buf = fs.readFileSync(p);
    let foundPage = -1;
    let snippet = '';
    await pdf(buf, {
      pagerender: async function(pageData) {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map(i => i.str).join(' ');
        if (text.includes('female workforce') || text.includes('CM sector')) {
          foundPage = pageData.pageIndex + 1;
          snippet = text.slice(0, 400).replace(/\n/g, ' ');
        }
        return '';
      }
    });
    if (foundPage !== -1) {
      console.log(`FOUND in ${p} on page ${foundPage}: ${snippet}`);
    }
  }
}

searchPhrase('CM sector').catch(console.error);
