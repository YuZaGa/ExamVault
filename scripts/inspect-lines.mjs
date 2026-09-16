import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function inspectPageDetailed(pdfPath, targetPage) {
  const buf = fs.readFileSync(pdfPath);
  let textItems = [];
  await pdf(buf, {
    pagerender: async function(pageData) {
      if (pageData.pageIndex + 1 === targetPage) {
        const textContent = await pageData.getTextContent();
        textItems = textContent.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
      }
      return '';
    }
  });

  // Group items by line (similar y)
  const lines = [];
  textItems.sort((a, b) => b.y - a.y || a.x - b.x);
  
  let currentY = null;
  let currentLine = [];
  for (const item of textItems) {
    if (currentY === null || Math.abs(item.y - currentY) > 3) {
      if (currentLine.length > 0) {
        lines.push(currentLine.map(i => i.str).join(' '));
      }
      currentY = item.y;
      currentLine = [item];
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine.map(i => i.str).join(' '));
  }

  console.log(`=== Formatted lines for Page ${targetPage} ===`);
  for (const l of lines) {
    console.log(l);
  }
}

inspectPageDetailed('/mnt/c/Users/yuman/Vault/05_Archive/Api/resources/24 dec.pdf', 77).catch(console.error);
