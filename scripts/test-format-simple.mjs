// Test formatSimpleText
function formatSimpleText(raw) {
  if (!raw) return '';

  let text = raw;

  text = text.replace(/^>\s*\[!note\][^\n]*\n*/i, '');
  text = text.replace(/^>\s?/gm, '');

  text = text.replace(/([^\n])\s*(Assertion\s*(?:\([A-Za-z]\)|[A-Za-z])?\s*:)/gi, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(Reasons?\s*(?:\([A-Za-z]\)|[A-Za-z])?\s*:)/gi, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(Statement\s*[-–—]?\s*(?:\(?[I12]{1,2}\)?|[12])\s*:)/gi, '$1\n\n$2');

  text = text.replace(/:\s*(\([a-eA-E0-9]\))/g, ':\n\n$1');
  text = text.replace(/([^\n])\s+(\([a-eA-E0-9]\))\s+/g, '$1\n$2 ');
  text = text.replace(/([^\n])\s+(\([ivxIVX]{1,4}\))\s+/g, '$1\n$2 ');

  text = text.replace(/([^\n])\s+((?:In the light of the above|Choose the (?:most appropriate|correct) answer)[^\n]*)/gi, '$1\n\n$2');

  const lines = text.split('\n');
  const result = [];

  const isStructuralStart = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (/^(?:\([a-eA-E0-9]\)|\([ivxIVX]{1,4}\)|[a-eA-E]\.|\d+\.)\s+/i.test(trimmed)) return true;
    if (/^[A-Za-z0-9-]+\s+\d+(?:\s+\d+)+/.test(trimmed)) return true;
    if (trimmed.startsWith('|') || trimmed.includes('\t')) return true;
    if (/^(?:Assertion|Reasons?|Statement)\b/i.test(trimmed)) return true;
    if (/^List\s*[-–—]?\s*(?:I|II|1|2)\b/i.test(trimmed)) return true;
    if (/^(?:Given below are two statements|In the light of the above|Choose the (?:most appropriate|correct) answer)/i.test(trimmed)) return true;
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    if (!current) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    if (result.length === 0 || isStructuralStart(current) || result[result.length - 1] === '') {
      result.push(current);
    } else {
      const prev = result[result.length - 1];
      if (prev.endsWith('-')) {
        result[result.length - 1] = prev + current;
      } else {
        result[result.length - 1] = prev + ' ' + current;
      }
    }
  }

  let output = result.join('\n');
  return output.trim();
}

const promptText = "1. The number of graduate male employees from city D is approximately _______% of the number\nof graduate male employees from city B.";
console.log('formatSimpleText output:');
console.log(formatSimpleText(promptText));
