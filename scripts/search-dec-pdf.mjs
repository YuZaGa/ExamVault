import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function testPdf(pdfPath) {
  console.log(`Loading ${pdfPath}...`);
  const buf = fs.readFileSync(pdfPath);
  console.log(`Buffer loaded: ${buf.length} bytes`);
  const start = Date.now();
  
  let foundPage = -1;
  let foundText = '';
  
  const data = await pdf(buf, {
    pagerender: async function(pageData) {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map(i => i.str).join(' ');
      if (pageText.includes('ratio of demand for Fruits') || pageText.includes('demand for Fruits') || pageText.includes('Fruits : Vegetables')) {
        foundPage = pageData.pageIndex + 1;
        foundText = pageText;
      }
      return ''; // save memory
    }
  });
  
  console.log(`Parsed ${data.numpages} pages in ${(Date.now() - start) / 1000}s`);
  console.log(`Found on page: ${foundPage}`);
  if (foundPage !== -1) {
    console.log('Snippet:', foundText.slice(0, 1000));
  }
}

testPdf('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf').catch(console.error);
