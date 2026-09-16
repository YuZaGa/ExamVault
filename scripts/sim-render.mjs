import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/p1_unit07.json', 'utf8'));
const q = data.find(x => x.shift.includes('09-01-2025 FN | Q.1'));

console.log('--- Question Text ---');
console.log(q.questionText);

// Let's see what FormattedQuestionText produces for this question:
// 1. splitContext(text)
function splitContext(rawText) {
  if (!rawText.includes('>')) {
    return { contextText: null, promptText: rawText };
  }

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

  return {
    contextText: contextText.length > 0 ? contextText : null,
    promptText: promptText
  };
}

const { contextText, promptText } = splitContext(q.questionText);

console.log('\n--- splitContext Output ---');
console.log('contextText length:', contextText?.length);
console.log('promptText length:', promptText?.length);
console.log('promptText value:', JSON.stringify(promptText));
