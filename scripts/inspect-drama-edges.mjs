import fs from 'fs';

const sampleP2 = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank_Paper2/01_Drama.md', 'utf8');
const qBlocks = sampleP2.split(/\n(?=### Q)/);

for (const block of qBlocks) {
  if (!block.trim().startsWith('### Q')) continue;
  const ansMatch = block.match(/Official NTA Answer:\**\s*(?:==)?\**\s*\(?([A-D1-4])\)?/i);
  const optMatches = block.match(/(?:^|\n)\s*\(([A-D1-4])\)/g) || [];
  if (!ansMatch || optMatches.length < 4) {
    const firstLine = block.split('\n')[0];
    console.log(`\nIssue in: ${firstLine}`);
    console.log(`Answer match: ${ansMatch ? ansMatch[1] : 'NONE'}, Options count: ${optMatches.length}`);
    console.log(block.substring(0, 300));
  }
}
