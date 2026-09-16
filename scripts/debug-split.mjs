import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/p1_unit07.json', 'utf8'));
const q = data.find(x => x.shift.includes('09-01-2025 FN'));

console.log('--- raw questionText ---');
console.log(JSON.stringify(q.questionText));

// Let's run splitContext logic
const rawText = q.questionText;
const lines = rawText.split('\n');
const contextLines = [];
const promptLines = [];
let inContext = false;
let contextDone = false;

for (let i = 0; i < lines.length; i++) {
  const rawLine = lines[i];
  const trimmed = rawLine.trim();

  if (!contextDone && (trimmed.startsWith('>') || (inContext && trimmed === ''))) {
    inContext = true;
    const cleaned = trimmed.replace(/^>\s?/, '');
    if (!cleaned.startsWith('[!note]')) {
      contextLines.push(cleaned);
    }
  } else {
    if (inContext) {
      inContext = false;
      contextDone = true;
    }
    const cleaned = trimmed.startsWith('>') ? trimmed.replace(/^>\s?/, '') : rawLine;
    if (!cleaned.startsWith('[!note]')) {
      promptLines.push(cleaned);
    }
  }
}

const contextText = contextLines.join('\n').trim();
const promptText = promptLines.join('\n').trim();

console.log('--- contextText ---');
console.log(contextText);
console.log('--- promptText ---');
console.log(promptText);
