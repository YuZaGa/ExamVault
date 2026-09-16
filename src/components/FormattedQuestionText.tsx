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

interface ParsedDITable {
  preamble: string[];
  title?: string;
  headers: string[];
  rows: string[][];
  notes: string[];
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

const STOPWORDS = new Set(['to', 'and', 'or', 'the', 'in', 'at', 'from', 'of', 'for', 'with', 'by', 'as', 'than', 'between', 'out', 'over', 'is', 'are', 'was', 'were']);

function isPureValue(val: string): boolean {
  const v = val.trim();
  return /^[₹$]?[\d.,%:\/\s-]+$/.test(v) || ['-', 'NA', 'N/A', '--'].includes(v);
}

function extractCellsFromLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map(c => c.trim()).filter(Boolean);
  }
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  if (tokens.length >= 3 && tokens.every(t => isPureValue(t))) {
    return tokens;
  }
  let numIdx = tokens.length;
  while (numIdx > 0 && isPureValue(tokens[numIdx - 1])) {
    numIdx--;
  }
  if (numIdx > 0 && numIdx < tokens.length) {
    const entity = tokens.slice(0, numIdx).join(' ');
    return [entity, ...tokens.slice(numIdx)];
  }
  return tokens;
}

// Intelligent Data Interpretation Table Parser
function parseDITable(contextText: string): ParsedDITable | null {
  if (!contextText) return null;

  const cleanedText = contextText.replace(/^>\s*\[!note\][^\n]*\n*/i, '').replace(/^>\s?/gm, '');
  const rawLines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);

  // Unwrap hyphenated line breaks in rawLines (e.g. "passed in end-\nsemester test 14 12 8 13")
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i];
    if (lines.length > 0 && lines[lines.length - 1].endsWith('-')) {
      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + cur;
    } else {
      lines.push(cur);
    }
  }

  // 1. Detect candidate data rows
  interface CandidateRow {
    lineIdx: number;
    cells: string[];
  }
  const candidateRows: CandidateRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip obvious preamble / conclusion lines
    if (/^(?:The following table|Based on the data|Study (?:carefully )?the table|Consider the following|In this table|answer the questions?|questions? that follow)/i.test(line)) {
      continue;
    }

    const cells = extractCellsFromLine(line);
    const hasStopwords = cells.some(c => c.toLowerCase().split(/\s+/).some(w => STOPWORDS.has(w)));
    const hasDigits = cells.slice(1).some(c => /\d/.test(c));
    const pureValCount = cells.slice(1).filter(c => isPureValue(c)).length;
    const isRow = (
      cells.length >= 2 &&
      !hasStopwords &&
      hasDigits &&
      pureValCount >= Math.max(1, Math.floor((cells.length - 1) * 0.6)) &&
      !cells.slice(1).some(c => c.split(/\s+/).length > 3)
    );

    if (isRow) {
      candidateRows.push({ lineIdx: i, cells });
    }
  }

  // Find contiguous blocks of rows (allowing 1 line formatting gap)
  const blocks: CandidateRow[][] = [];
  let currentBlock: CandidateRow[] = [];
  for (const cr of candidateRows) {
    if (currentBlock.length === 0) {
      currentBlock.push(cr);
    } else {
      const prev = currentBlock[currentBlock.length - 1];
      if (cr.lineIdx <= prev.lineIdx + 2) {
        currentBlock.push(cr);
      } else {
        blocks.push(currentBlock);
        currentBlock = [cr];
      }
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  const validBlocks = blocks.filter(b => b.length >= 2 || (b.length === 1 && b[0].cells.length >= 4));
  if (validBlocks.length === 0) return null;

  // Largest contiguous block
  const bestBlock = validBlocks.reduce((prev, cur) => (cur.length > prev.length ? cur : prev));
  const dataRows = bestBlock.map(b => b.cells);
  const dataRowStartIndex = bestBlock[0].lineIdx;

  const colCount = dataRows[0].length;
  const normalizedRows = dataRows.map(r => {
    if (r.length < colCount) return [...r, ...Array(colCount - r.length).fill('-')];
    return r.slice(0, colCount);
  });

  const headerSectionLines = lines.slice(0, dataRowStartIndex);
  const noteLines = lines.slice(dataRowStartIndex + dataRows.length);

  const preamble: string[] = [];
  let title = '';
  const candidateHeaderLines: string[] = [];

  for (const l of headerSectionLines) {
    if (
      l.length > 75 ||
      /^(?:The following table|Based on the data|Study (?:carefully )?the table|Consider the following|In this table|In the table|A college has)/i.test(l) ||
      /(?:answer the questions?|questions? that follow|asked here under)/i.test(l) ||
      /^(?:Note\s*:|Where\s*:)/i.test(l)
    ) {
      preamble.push(l);
    } else if (!title && /(?:details|percentage|distribution|statement|programme-wise|city-wise|year-wise|state-wise|store-wise|salesman-wise|subject|marks|students appearing|sale of|viewers|enrollment|employees|population|break-up|results)/i.test(l)) {
      title = l;
    } else {
      candidateHeaderLines.push(l);
    }
  }

  let headers: string[] = [];

  // Flatten candidate lines on tabs so that inline tabs (e.g. Shop \t 40% of the number) are split
  const flatHeaderTokens: string[] = [];
  for (const l of candidateHeaderLines) {
    if (l.includes('\t')) {
      flatHeaderTokens.push(...l.split('\t').map(c => c.trim()).filter(Boolean));
    } else {
      flatHeaderTokens.push(l);
    }
  }

  const tabLines = candidateHeaderLines.filter(l => l.includes('\t'));

  // Special Case A: Two-tier tabbed headers (e.g. 4 channels + 8 subheaders => 9 columns)
  if (tabLines.length >= 2) {
    const topCells = tabLines[0].split('\t').map(c => c.trim()).filter(Boolean);
    const subCells = tabLines[1].split('\t').map(c => c.trim()).filter(Boolean);
    if (topCells.length > 0 && subCells.length === topCells.length * 2 && colCount === 1 + subCells.length) {
      const firstCol = candidateHeaderLines.find(l => !l.includes('\t') && /^(?:City|State|Year|Store|Student|Day|Month)\b/i.test(l)) || 'Category';
      const expanded: string[] = [firstCol.split(/\s+/)[0]];
      topCells.forEach((cat, idx) => {
        expanded.push(`${cat} (${subCells[idx * 2]})`);
        expanded.push(`${cat} (${subCells[idx * 2 + 1]})`);
      });
      if (expanded.length === colCount) {
        headers = expanded;
      }
    }
  }

  // Special Case B: Two shops A and B with 2 sub-metrics each (5 cols, e.g. HDD sales table)
  if (headers.length !== colCount && tabLines.length === 1 && colCount === 5) {
    const topCells = tabLines[0].split('\t').map(c => c.trim()).filter(Boolean);
    if (topCells.length === 2 && /shop|store|college/i.test(topCells[0])) {
      const firstCol = candidateHeaderLines.find(l => !l.includes('\t') && /^(?:Day|Date|City|Year)\b/i.test(l)) || 'Day';
      headers = [
        firstCol.split(/\s+/)[0],
        `${topCells[0]} (HDDs Sold)`,
        `${topCells[0]} (% Females)`,
        `${topCells[1]} (HDDs Sold)`,
        `${topCells[1]} (% Females)`
      ];
    }
  }

  // Special Case C: Single tab line matching colCount or colCount - 1
  if (headers.length !== colCount) {
    for (const tl of tabLines) {
      const cells = tl.split('\t').map(c => c.trim()).filter(Boolean);
      if (cells.length === colCount) {
        headers = cells;
        break;
      } else if (cells.length === colCount - 1) {
        const firstCol = candidateHeaderLines.find(l => !l.includes('\t') && /^(?:City|State|Year|Store|Shop|Student|Game|Item|Department)\b/i.test(l)) || 'Category';
        headers = [firstCol.split(/\s+/)[0], ...cells];
        break;
      }
    }
  }

  // Special Case D: Space-separated subheaders matching colCount or colCount - 1
  if (headers.length !== colCount) {
    for (const cl of candidateHeaderLines) {
      const parts = cl.split(/\s+/).filter(Boolean);
      if (parts.some(p => STOPWORDS.has(p.toLowerCase()))) continue;
      if (parts.length === colCount) {
        headers = parts;
        break;
      } else if (parts.length === colCount - 1) {
        const firstCol = candidateHeaderLines.find(l => l !== cl && /^(?:Year|City|State|Store|Shop|Student|Salesman|Results?|College)\b/i.test(l)) || 'Category';
        headers = [firstCol.split(/\s+/)[0], ...parts];
        break;
      }
    }
  }

  // Special Case E: Group multi-line tokens
  if (headers.length !== colCount) {
    const grouped: string[] = [];
    for (const token of flatHeaderTokens) {
      const isNew = grouped.length < colCount && (
        grouped.length === 0 ||
        /^[A-Z][0-9]{1,2}\b/i.test(token) ||
        /^(?:Paper|Section|Dept)\b/i.test(token) ||
        /^(?:City|State|Year|Store|Shop|Salesman|Student|Game|Item|Department|Results?|Age|Day|Month)\b/i.test(token) ||
        /^(?:Number of|Percentage|Ratio|Average|Total|Marks|Score|Half of|\d+% of|Mode of|Selling Price|Cost Price|Proportion|With low income|Without low income)\b/i.test(token) ||
        /^[A-Z]\b/.test(token)
      );

      // Handle compound first token like "Student Marks obtained in subject"
      if (grouped.length === 0 && /^(?:Student|Year|Store|Shop|Salesman|Results?)\s+/i.test(token)) {
        const firstWord = token.split(/\s+/)[0];
        grouped.push(firstWord);
        continue;
      }

      if (isNew && grouped.length < colCount) {
        grouped.push(token);
      } else if (grouped.length > 0) {
        grouped[grouped.length - 1] += ' ' + token;
      } else {
        grouped.push(token);
      }
    }

    if (grouped.length === colCount) {
      headers = grouped;
    }
  }

  // Final fallback if headers still don't match colCount
  if (headers.length < colCount) {
    while (headers.length < colCount) {
      headers.push(`Column ${headers.length + 1}`);
    }
  } else if (headers.length > colCount) {
    headers = headers.slice(0, colCount);
  }

  return {
    preamble,
    title,
    headers,
    rows: normalizedRows,
    notes: noteLines
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

// Simple, reliable text formatting that unwraps accidental mid-sentence OCR line breaks
// while strictly keeping question stems, statements, sub-options, and table rows separate.
function formatSimpleText(raw: string): string {
  if (!raw) return '';

  let text = raw;

  // Clean any residual markdown note tags if present
  text = text.replace(/^>\s*\[!note\][^\n]*\n*/i, '');
  text = text.replace(/^>\s?/gm, '');

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

  // 4. Unwrap accidental single newlines that occur mid-sentence
  const lines = text.split('\n');
  const result: string[] = [];

  const isStructuralStart = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return true; // empty line (paragraph break)
    // Sub-item marker e.g. (a), (b), (1), (i), A., 1.
    if (/^(?:\([a-eA-E0-9]\)|\([ivxIVX]{1,4}\)|[a-eA-E]\.|\d+\.)\s+/i.test(trimmed)) return true;
    // Table rows with letters/numbers e.g. "A 80 50 80" or "2021 150 25"
    if (/^[A-Za-z0-9-]+\s+\d+(?:\s+\d+)+/.test(trimmed)) return true;
    // Table line with pipe or tab
    if (trimmed.startsWith('|') || trimmed.includes('\t')) return true;
    // Assertion / Reason / Statement
    if (/^(?:Assertion|Reasons?|Statement)\b/i.test(trimmed)) return true;
    // List I / List II
    if (/^List\s*[-–—]?\s*(?:I|II|1|2)\b/i.test(trimmed)) return true;
    // Concluding prompt or introductory statement
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
      // Continuation of previous line (sentence wrapped by OCR)
      const prev = result[result.length - 1];
      if (prev.endsWith('-')) {
        result[result.length - 1] = prev + current;
      } else {
        result[result.length - 1] = prev + ' ' + current;
      }
    }
  }

  // Format spacing between blocks
  let output = result.join('\n');
  output = output.replace(/([^\n])\n(Assertion\s*(?:\([A-Za-z]\)|[A-Za-z])?\s*:)/gi, '$1\n\n$2');
  output = output.replace(/([^\n])\n(Reasons?\s*(?:\([A-Za-z]\)|[A-Za-z])?\s*:)/gi, '$1\n\n$2');
  output = output.replace(/([^\n])\n(Statement\s*[-–—]?\s*(?:\(?[I12]{1,2}\)?|[12])\s*:)/gi, '$1\n\n$2');
  output = output.replace(/([^\n])\n((?:In the light of the above|Choose the (?:most appropriate|correct) answer)[^\n]*)/gi, '$1\n\n$2');
  output = output.replace(/\n{3,}/g, '\n\n').trim();

  return output;
}

export const FormattedQuestionText: React.FC<FormattedQuestionTextProps> = ({ text }) => {
  if (!text) return null;

  const { contextText, promptText } = splitContext(text);
  const matchData = promptText ? parseMatchQuestion(promptText) : null;
  const parsedTable = contextText ? parseDITable(contextText) : null;

  return (
    <div className="simple-question-container">
      {/* Context / Passage / Table Box */}
      {contextText && (
        <div className="simple-context-box">
          <div className="simple-context-label">
            {parsedTable ? 'Data Table / Reference Material:' : 'Context / Reading Passage:'}
          </div>
          
          {parsedTable ? (
            <div className="di-table-card">
              {parsedTable.preamble.length > 0 && (
                <div className="di-preamble-text">
                  {parsedTable.preamble.map((p, idx) => (
                    <p key={idx} className="mb-2">{p}</p>
                  ))}
                </div>
              )}

              {parsedTable.title && (
                <div className="di-table-title">{parsedTable.title}</div>
              )}

              <div className="di-table-scroll">
                <table className="di-html-table">
                  <thead>
                    <tr>
                      {parsedTable.headers.map((h, idx) => (
                        <th key={idx}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTable.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={cIdx === 0 ? 'di-col-header' : 'di-col-data'}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedTable.notes.length > 0 && (
                <div className="di-notes-text">
                  {parsedTable.notes.map((n, idx) => (
                    <p key={idx} className="mt-1">{n}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="simple-context-body">
              {contextText}
            </div>
          )}
        </div>
      )}

      {/* Main Question Body - Render prompt if it exists */}
      {promptText ? (
        matchData ? (
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
          <div className="simple-question-body">
            {contextText && <div className="simple-question-badge">QUESTION</div>}
            <div className="simple-question-text">
              {formatSimpleText(promptText)}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};
