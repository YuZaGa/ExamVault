import fs from 'fs';

const sampleP2 = fs.readFileSync('/mnt/c/Users/yuman/Vault/05_Archive/Api/Question_Bank_Paper2/01_Drama.md', 'utf8');

function parseMarkdownQuestions(content, paper, unitId, unitTitle) {
  // Split by question headers
  const qBlocks = content.split(/\n(?=### Q)/);
  const results = [];
  let skipped = 0;

  for (const block of qBlocks) {
    if (!block.trim().startsWith('### Q')) continue;

    // Header match: ### Q{...}. [{shiftInfo}]
    const headerMatch = block.match(/^### Q([^.]+)\.\s*(\[.*?\])?/);
    if (!headerMatch) {
      skipped++;
      continue;
    }

    const qLabel = headerMatch[1].trim();
    const shiftInfo = headerMatch[2] ? headerMatch[2].replace(/^\[|\]$/g, '').trim() : '';

    // Extract Answer
    // Matches: > **Official NTA Answer:** ==**D**== or ==**4**== or **B** or (D) etc.
    let correctOption = null;
    const ansMatch = block.match(/Official NTA Answer:\**\s*(?:==)?\**\s*\(?([A-D1-4])\)?/i);
    if (ansMatch) {
      let rawAns = ansMatch[1].toUpperCase();
      if (rawAns === '1') rawAns = 'A';
      else if (rawAns === '2') rawAns = 'B';
      else if (rawAns === '3') rawAns = 'C';
      else if (rawAns === '4') rawAns = 'D';
      correctOption = rawAns;
    }

    // Extract options
    // Common formats:
    // (A) ...
    // (B) ...
    // (C) ...
    // (D) ...
    // or (1), (2), (3), (4)
    const options = [];
    const optRegex = /(?:^|\n)\s*\(([A-D1-4])\)\s*([\s\S]*?)(?=(?:\n\s*\([A-D1-4]\)|\n\s*>|\n\s*---|\n\s*###|$))/g;
    let optMatch;
    while ((optMatch = optRegex.exec(block)) !== null) {
      let key = optMatch[1].toUpperCase();
      if (key === '1') key = 'A';
      else if (key === '2') key = 'B';
      else if (key === '3') key = 'C';
      else if (key === '4') key = 'D';

      const optText = optMatch[2].trim();
      options.push({ key, text: optText });
    }

    // Extract question text (between header and first option)
    let qBody = block.substring(headerMatch[0].length);
    // Find where options start
    const firstOptIdx = qBody.search(/(?:^|\n)\s*\([A-D1-4]\)/);
    let questionText = '';
    if (firstOptIdx !== -1) {
      questionText = qBody.substring(0, firstOptIdx).trim();
    } else {
      // Fallback
      questionText = qBody.split(/\n\s*>/)[0].trim();
    }

    // Clean up leading question numbers if any (e.g. "28. Which of the following...")
    questionText = questionText.replace(/^\d+\.\s*/, '').trim();

    results.push({
      id: `P${paper}-U${String(unitId).padStart(2, '0')}-${qLabel}`,
      paper,
      unitId,
      unitTitle,
      shift: shiftInfo,
      questionText,
      options: options.slice(0, 4),
      correctOption
    });
  }

  return { results, skipped };
}

const parsed = parseMarkdownQuestions(sampleP2, 2, 1, 'Drama');
console.log(`Parsed ${parsed.results.length} questions from 01_Drama.md. Skipped: ${parsed.skipped}`);
const validAns = parsed.results.filter(q => q.correctOption !== null && q.options.length === 4);
console.log(`Valid 4-option questions with answers: ${validAns.length}`);

console.log('\nSample question:');
console.log(JSON.stringify(validAns[0], null, 2));
