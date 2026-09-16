import React from 'react';

interface FormattedQuestionTextProps {
  text: string;
}

interface MatchItem {
  leftKey: string;
  leftText: string;
  rightKey: string;
  rightText: string;
}

interface ParsedMatchQuestion {
  intro: string;
  headerList1: string;
  headerList2: string;
  items: MatchItem[];
  outro: string;
}

// Regex to detect individual match rows e.g. (a) Kyoto protocol \t(I) Global warming
const MATCH_ROW_REGEX = /^\s*(?:\(([a-eA-E0-9])\)|([a-eA-E0-9])\.)\s+(.+?)\s*(?:\t|\s{2,}|\s+)(?:\(([IVXivx1-9]+)\)|([IVXivx1-9]+)\.?)\s+(.+)$/;

function parseMatchQuestion(rawText: string): ParsedMatchQuestion | null {
  if (!/match\s+(?:the\s+)?list/i.test(rawText)) return null;

  const lines = rawText.split('\n');
  const items: MatchItem[] = [];
  const introLines: string[] = [];
  const outroLines: string[] = [];
  let headerList1 = 'List I';
  let headerList2 = 'List II';

  let parsingItems = false;
  let finishedItems = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const m = line.match(MATCH_ROW_REGEX);
    if (m) {
      parsingItems = true;
      const leftKey = m[1] || m[2];
      const leftText = m[3].trim();
      const rightKey = m[4] || m[5];
      const rightText = m[6].trim();
      items.push({ leftKey, leftText, rightKey, rightText });
      continue;
    }

    if (!parsingItems) {
      introLines.push(line);
    } else {
      if (
        /choose\s+the\s+(?:most\s+appropriate|correct)\s+answer/i.test(line) ||
        /options\s+given/i.test(line) ||
        finishedItems
      ) {
        finishedItems = true;
        outroLines.push(line);
      } else {
        if (items.length > 0 && !finishedItems) {
          items[items.length - 1].rightText += ' ' + line;
        } else {
          outroLines.push(line);
        }
      }
    }
  }

  if (items.length < 3) return null;

  const fullIntro = introLines.join('\n');
  const h1Match = fullIntro.match(/List\s*[-–—]?\s*I\b(?:\s*\(([^)]+)\)|\n\s*\(([^)]+)\))?/i);
  const h2Match = fullIntro.match(/List\s*[-–—]?\s*II\b(?:\s*\(([^)]+)\)|\n\s*\(([^)]+)\))?/i);

  const sub1 = h1Match ? (h1Match[1] || h1Match[2]) : null;
  const sub2 = h2Match ? (h2Match[1] || h2Match[2]) : null;

  if (sub1) headerList1 = `List I (${sub1.trim()})`;
  else headerList1 = 'List I';

  if (sub2) headerList2 = `List II (${sub2.trim()})`;
  else headerList2 = 'List II';

  let cleanIntro = introLines[0] || 'Match List I with List II';
  cleanIntro = cleanIntro.replace(/\s*:\s*$/, '.');

  return {
    intro: cleanIntro,
    headerList1,
    headerList2,
    items,
    outro: outroLines.join(' ') || 'Choose the correct answer from the options given below:'
  };
}

// Split context block (> [!note] ...) from the question prompt
function splitContext(rawText: string): { contextText: string | null; promptText: string } {
  if (!rawText.includes('>')) {
    return { contextText: null, promptText: rawText };
  }

  const lines = rawText.split('\n');
  const contextLines: string[] = [];
  const promptLines: string[] = [];
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
      promptLines.push(rawLine);
    }
  }

  const contextText = contextLines.join('\n').trim();
  const promptText = promptLines.join('\n').trim();

  return {
    contextText: contextText.length > 0 ? contextText : null,
    promptText: promptText.length > 0 ? promptText : rawText
  };
}

// Simple, reliable text formatting that separates question, statements, sub-options, and conclusions
function formatSimpleText(raw: string): string {
  let text = raw;

  // 1. Separate Assertion / Reason / Statement onto their own lines with clean spacing
  text = text.replace(/([^\n])\s*(Assertion\s*(?:\([A-Za-z]\)|[A-Za-z])?\s*:)/gi, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(Reasons?\s*(?:\([A-Za-z]\)|[A-Za-z])?\s*:)/gi, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(Statement\s*[-–—]?\s*(?:\(?[I12]{1,2}\)?|[12])\s*:)/gi, '$1\n\n$2');

  // 2. Separate sub-options (a), (b), (c), (d), (e) or (i), (ii), etc. onto their own lines
  text = text.replace(/:\s*(\([a-eA-E0-9]\))/g, ':\n\n$1');
  text = text.replace(/([^\n])\s+(\([a-eA-E0-9]\))\s+/g, '$1\n$2 ');
  text = text.replace(/([^\n])\s+(\([ivxIVX]{1,4}\))\s+/g, '$1\n$2 ');

  // 3. Separate conclusion prompt onto its own line
  text = text.replace(/([^\n])\s+((?:In the light of the above|Choose the (?:most appropriate|correct) answer)[^\n]*)/gi, '$1\n\n$2');

  // 4. Normalize clean spacing (max 2 consecutive newlines)
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

export const FormattedQuestionText: React.FC<FormattedQuestionTextProps> = ({ text }) => {
  if (!text) return null;

  const { contextText, promptText } = splitContext(text);
  const matchData = parseMatchQuestion(promptText);

  return (
    <div className="simple-question-container">
      {/* Context / Passage Box if present */}
      {contextText && (
        <div className="simple-context-box">
          <div className="simple-context-label">Context / Reading Passage / Data Table:</div>
          <div className="simple-context-body">{contextText}</div>
        </div>
      )}

      {/* Match The Following Layout */}
      {matchData ? (
        <div className="simple-match-box">
          <div className="simple-match-intro">{matchData.intro}</div>

          <div className="simple-match-table-wrapper">
            <table className="simple-match-table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>{matchData.headerList1}</th>
                  <th style={{ width: '50%' }}>{matchData.headerList2}</th>
                </tr>
              </thead>
              <tbody>
                {matchData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="simple-match-key">({item.leftKey})</span> {item.leftText}
                    </td>
                    <td>
                      <span className="simple-match-key roman">({item.rightKey})</span> {item.rightText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {matchData.outro && (
            <div className="simple-match-outro">{matchData.outro}</div>
          )}
        </div>
      ) : (
        /* Simple, clean standard question with properly separated lines */
        <div className="simple-question-body">
          {formatSimpleText(promptText)}
        </div>
      )}
    </div>
  );
};
