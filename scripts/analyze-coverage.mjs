import fs from 'fs';

const filePath = '/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank/07_Data_Interpretation.md';
const content = fs.readFileSync(filePath, 'utf8');
const qBlocks = content.split(/\n(?=### Q)/);

const shiftCounts = new Map();

for (const b of qBlocks) {
  if (!b.trim().startsWith('### Q')) continue;
  const m = b.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
  if (!m) continue;
  const shiftInfo = m[2] ? m[2].replace(/^\[|\]$/g, '').trim() : 'Unknown';
  const shiftBase = shiftInfo.replace(/\|\s*Q\.\d+.*$/i, '').trim();
  const hasTable = b.includes('> [!note]') || b.includes('following table') || b.includes('Study the table');
  
  if (!shiftCounts.has(shiftBase)) {
    shiftCounts.set(shiftBase, { total: 0, hasTable: 0, qLabels: [] });
  }
  const s = shiftCounts.get(shiftBase);
  s.total++;
  if (hasTable) s.hasTable++;
  s.qLabels.push(m[1].trim());
}

console.log(`Total shifts in 07_Data_Interpretation.md: ${shiftCounts.size}`);
console.log('Sample shifts and their table coverage:');
let shown = 0;
for (const [shift, data] of shiftCounts.entries()) {
  if (data.hasTable === 0 || data.total < 5) {
    console.log(`MISSING/PARTIAL: "${shift}" -> ${data.total} Qs, ${data.hasTable} tables, Qs: [${data.qLabels.join(', ')}]`);
    shown++;
    if (shown > 30) break;
  }
}
