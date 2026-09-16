import fs from 'fs';
import path from 'path';

const pdfFiles = [
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/Paper_1_Practice_Question_Bank.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 june.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/PAPER-1 (2021-2023)PYQs.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/paper-1-2021-March-final-2.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/book.pdf',
  '/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/UGCNETEnglish2023Vol2.pdf'
];

for (const p of pdfFiles) {
  if (fs.existsSync(p)) {
    const stats = fs.statSync(p);
    console.log(`${p}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log(`${p}: NOT FOUND`);
  }
}
