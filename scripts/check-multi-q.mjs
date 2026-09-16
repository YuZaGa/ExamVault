import fs from 'fs';

const filePath = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/07_Data_Interpretation.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find all occurrences of questions within blocks e.g. "2. ", "3. ", "4. ", "5. "
const qBlocks = content.split(/\n(?=### Q)/);

console.log(`Total blocks: ${qBlocks.length}`);

const multiQBlocks = [];
for (let i = 0; i < qBlocks.length; i++) {
  const b = qBlocks[i];
  // Match question numbers at start of line
  const qNums = [...b.matchAll(/(?:^|\n)\s*(\d+)\.\s+/g)].map(m => m[1]);
  if (qNums.length > 1) {
    const headerMatch = b.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
    multiQBlocks.push({
      index: i,
      header: headerMatch ? headerMatch[0] : 'Unknown',
      qNums,
      preview: b.slice(0, 200).replace(/\n/g, ' ')
    });
  }
}

console.log(`Blocks containing MULTIPLE questions: ${multiQBlocks.length}`);
for (const m of multiQBlocks.slice(0, 20)) {
  console.log(`${m.header} -> Questions found: [${m.qNums.join(', ')}]`);
}
