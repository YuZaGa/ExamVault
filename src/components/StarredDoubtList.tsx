import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { questionService } from '../services/questionService';
import { StarredDoubt, Question } from '../types';
import { Star, Copy, Check, Trash2, Edit3, Save, CheckCircle2 } from 'lucide-react';
import { FormattedQuestionText } from './FormattedQuestionText';

function findMatchingQuestion(storedQ: Question, unitQuestions: Question[]): Question | null {
  if (!storedQ) return null;

  // 1. Check exact ID match if shift or options align
  const idCandidate = unitQuestions.find(uq => uq.id === storedQ.id);
  if (idCandidate) {
    const sameShift = Boolean(storedQ.shift && idCandidate.shift === storedQ.shift);
    const optionsMatch = idCandidate.options?.filter(co =>
      storedQ.options?.some(so => so.text.trim() === co.text.trim())
    ).length || 0;
    if (sameShift || optionsMatch >= 2) {
      return idCandidate;
    }
  }

  // 2. Match by shift: In NTA questions, each shift + Q.N has unique shift string
  if (storedQ.shift) {
    const shiftMatches = unitQuestions.filter(uq => uq.shift === storedQ.shift);
    if (shiftMatches.length === 1) {
      return shiftMatches[0];
    }
    if (shiftMatches.length > 1) {
      // Prioritize candidate whose options match
      for (const candidate of shiftMatches) {
        const matchCount = candidate.options?.filter(co =>
          storedQ.options?.some(so => so.text.trim() === co.text.trim())
        ).length || 0;
        if (matchCount >= 2) return candidate;
      }
      // Prioritize candidate whose correct option matches
      for (const candidate of shiftMatches) {
        if (candidate.correctOption === storedQ.correctOption) {
          return candidate;
        }
      }
      return shiftMatches[0];
    }
  }

  // 3. Match by multiple identical option texts
  if (storedQ.options && storedQ.options.length >= 2) {
    let bestCandidate: Question | null = null;
    let maxMatch = 0;
    for (const candidate of unitQuestions) {
      const matchCount = candidate.options?.filter(co =>
        storedQ.options?.some(so => so.text.trim() === co.text.trim())
      ).length || 0;
      if (matchCount > maxMatch && matchCount >= 2) {
        maxMatch = matchCount;
        bestCandidate = candidate;
      }
    }
    if (bestCandidate) return bestCandidate;
  }

  // 4. Match by question stem snippet (ignoring table context block)
  const cleanStoredText = (storedQ.questionText || '')
    .replace(/^>[\s\S]*?\n\n/i, '')
    .replace(/^>\s*/gm, '')
    .trim();

  if (cleanStoredText.length > 20) {
    const searchSub = cleanStoredText.slice(0, 50);
    for (const candidate of unitQuestions) {
      const cleanCandidateText = (candidate.questionText || '')
        .replace(/^>[\s\S]*?\n\n/i, '')
        .replace(/^>\s*/gm, '')
        .trim();
      if (
        cleanCandidateText.includes(searchSub) ||
        cleanStoredText.includes(cleanCandidateText.slice(0, 50))
      ) {
        return candidate;
      }
    }
  }

  return null;
}

export const StarredDoubtList: React.FC = () => {
  const [starredMap, setStarredMap] = useState<Record<string, StarredDoubt>>(
    storageService.getStarredDoubts()
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Automatically refresh stored doubts with the latest question data (tables, stems, options)
  useEffect(() => {
    const refreshStarred = async () => {
      const stored = storageService.getStarredDoubts();
      const values = Object.values(stored);
      if (values.length === 0) return;

      const unitsNeeded = new Set<string>();
      for (const item of values) {
        const q = item.question;
        if (q && q.paper && q.unitId) {
          const fileName = `p${q.paper}_unit${String(q.unitId).padStart(2, '0')}.json`;
          unitsNeeded.add(fileName);
        }
      }

      let updated = false;
      const updatedStored: Record<string, StarredDoubt> = { ...stored };

      for (const fileName of unitsNeeded) {
        try {
          const unitQuestions = await questionService.loadUnitQuestions(fileName);
          for (const key of Object.keys(updatedStored)) {
            const item = updatedStored[key];
            const freshQ = findMatchingQuestion(item.question, unitQuestions);
            if (freshQ) {
              const textChanged = item.question.questionText !== freshQ.questionText;
              const optionsChanged = JSON.stringify(item.question.options) !== JSON.stringify(freshQ.options);
              const idChanged = item.questionId !== freshQ.id;

              if (textChanged || optionsChanged || idChanged) {
                if (idChanged) {
                  delete updatedStored[key];
                  item.questionId = freshQ.id;
                }
                item.question = freshQ;
                updatedStored[freshQ.id] = item;
                updated = true;
              }
            }
          }
        } catch (e) {
          console.error('Error refreshing doubt item:', e);
        }
      }

      if (updated) {
        localStorage.setItem('examvault_starred', JSON.stringify(updatedStored));
        setStarredMap({ ...updatedStored });
      }
    };

    refreshStarred();
  }, []);

  const starredList = Object.values(starredMap).sort((a, b) => b.starredAt - a.starredAt);

  const handleRemoveStar = (qId: string) => {
    storageService.toggleStar(starredMap[qId].question);
    setStarredMap(storageService.getStarredDoubts());
  };

  const handleStartEdit = (item: StarredDoubt) => {
    setEditingId(item.questionId);
    setTempNote(item.notes || '');
  };

  const handleSaveNote = (qId: string) => {
    storageService.updateDoubtNotes(qId, tempNote);
    setStarredMap(storageService.getStarredDoubts());
    setEditingId(null);
  };

  const handleCopy = (item: StarredDoubt) => {
    const q = item.question;
    const text = `📌 UGC-NET Doubt (${q.paper === 1 ? 'Paper 1' : 'Paper 2'} - ${q.unitTitle}):\n\n` +
      `Question: ${q.questionText}\n\n` +
      q.options.map(o => `(${o.key}) ${o.text}`).join('\n') +
      `\n\nOfficial Answer: (${q.correctOption})` +
      (item.notes ? `\n\nMy Revision Notes: ${item.notes}` : '');

    navigator.clipboard.writeText(text);
    setCopiedId(item.questionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(99, 102, 241, 0.12))', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--color-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={24} color="#F59E0B" fill="#F59E0B" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
              Starred Doubts Basket
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tricky quotes, obscure terms, and questions saved for revision.
            </p>
          </div>
        </div>
      </div>

      {starredList.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid var(--color-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Star size={28} color="#F59E0B" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
            No Starred Doubts Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Tap the star icon during any drill or mock to save questions to this revision basket.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {starredList.map(item => {
            const q = item.question;
            const isEditing = editingId === item.questionId;

            return (
              <div 
                key={item.questionId}
                className="glass-card"
                style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}
              >
                {/* Question Header */}
                <div className="question-header" style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="unit-tag">
                      P{q.paper} • U{q.unitId} {q.unitTitle}
                    </span>
                    {q.shift && (
                      <span className="shift-tag">
                        {q.shift}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleCopy(item)}
                      className="icon-btn"
                      style={{ width: '34px', height: '34px' }}
                      title="Copy Question & Notes to Clipboard"
                    >
                      {copiedId === item.questionId ? (
                        <Check size={16} color="var(--color-emerald)" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => handleRemoveStar(item.questionId)}
                      className="icon-btn"
                      style={{ width: '34px', height: '34px', color: 'var(--color-rose)' }}
                      title="Remove from Doubts"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Formatted Question Text (DI Tables, Reading Comprehension, Match Lists, Stems) */}
                <div className="question-text-box" style={{ marginBottom: '18px' }}>
                  <FormattedQuestionText text={q.questionText} />
                </div>

                {/* Tactile Options Grid with Official Key Badge */}
                <div className="options-grid" style={{ marginBottom: '16px' }}>
                  {q.options.map(opt => {
                    const isCorrect = opt.key === q.correctOption;
                    return (
                      <div
                        key={opt.key}
                        className={`option-btn ${isCorrect ? 'correct' : ''}`}
                        style={{ cursor: 'default' }}
                      >
                        <div className="option-key-badge">
                          {opt.key}
                        </div>
                        <div style={{ flex: 1, fontSize: '0.95rem', color: isCorrect ? '#FFFFFF' : 'var(--text-main)' }}>
                          {opt.text}
                        </div>
                        {isCorrect && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#34D399', letterSpacing: '0.04em' }}>
                              OFFICIAL KEY
                            </span>
                            <CheckCircle2 size={18} color="var(--color-emerald)" style={{ flexShrink: 0 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* High-Yield Rule Popover */}
                {q.cheatSheetRule && (
                  <div className="cheat-sheet-popover" style={{ marginBottom: '16px' }}>
                    <div className="cheat-sheet-title">
                      <span>💡</span>
                      <span>High-Yield Revision Rule</span>
                    </div>
                    <div className="cheat-sheet-content">
                      {q.cheatSheetRule}
                    </div>
                  </div>
                )}

                {/* Revision Notes Section */}
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  {isEditing ? (
                    <div>
                      <textarea
                        value={tempNote}
                        onChange={e => setTempNote(e.target.value)}
                        placeholder="Add your revision note, trap alert, or mnemonic..."
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-active)',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          padding: '10px',
                          fontSize: '0.88rem',
                          fontFamily: 'var(--font-body)',
                          resize: 'none',
                          marginBottom: '10px'
                        }}
                      />
                      <button
                        onClick={() => handleSaveNote(item.questionId)}
                        className="btn-primary"
                        style={{ minHeight: '36px', fontSize: '0.82rem', padding: '0 14px', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Save size={14} />
                        Save Note
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{ fontSize: '0.85rem', color: item.notes ? '#FCD34D' : 'var(--text-dim)', fontStyle: item.notes ? 'normal' : 'italic', margin: 0, lineHeight: 1.45 }}>
                        {item.notes ? `📝 Note: ${item.notes}` : 'No personal notes added yet'}
                      </p>
                      <button
                        onClick={() => handleStartEdit(item)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px' }}
                      >
                        <Edit3 size={14} />
                        {item.notes ? 'Edit' : 'Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
