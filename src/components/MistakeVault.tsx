import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { questionService } from '../services/questionService';
import { MistakeItem, Question } from '../types';
import { ShieldAlert, Sparkles, Flame, CheckCircle, ArrowRight } from 'lucide-react';
import { FormattedQuestionText } from './FormattedQuestionText';

interface MistakeVaultProps {
  onStartMistakeDrill: (questions: Question[]) => void;
}

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

export const MistakeVault: React.FC<MistakeVaultProps> = ({ onStartMistakeDrill }) => {
  const [paperFilter, setPaperFilter] = useState<1 | 2 | 'all'>('all');
  const [mistakesMap, setMistakesMap] = useState<Record<string, MistakeItem>>(
    storageService.getMistakes()
  );

  // Automatically refresh stored mistakes with latest question data (tables, stems, options)
  useEffect(() => {
    const refreshMistakes = async () => {
      const stored = storageService.getMistakes();
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
      const updatedStored: Record<string, MistakeItem> = { ...stored };

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
          console.error('Error refreshing mistake item:', e);
        }
      }

      if (updated) {
        localStorage.setItem('examvault_mistakes', JSON.stringify(updatedStored));
        setMistakesMap({ ...updatedStored });
      }
    };

    refreshMistakes();
  }, []);

  const activeMistakes = Object.values(mistakesMap).filter(m => m.status === 'active');
  const conqueredCount = Object.values(mistakesMap).filter(m => m.status === 'conquered').length;

  const filteredMistakes = activeMistakes.filter(m => {
    if (paperFilter === 'all') return true;
    return m.question.paper === paperFilter;
  });

  const handlePracticeAll = () => {
    const qs = filteredMistakes.map(m => m.question);
    if (qs.length > 0) {
      onStartMistakeDrill(qs);
    }
  };

  const handlePracticeSingle = (m: MistakeItem) => {
    onStartMistakeDrill([m.question]);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(139, 92, 246, 0.12))', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid var(--color-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} color="var(--color-rose)" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
              The Mistake Vault
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Forced mastery over your recurring examiner trap questions.
            </p>
          </div>
        </div>

        {/* 2x Rule Card */}
        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Sparkles size={18} color="var(--color-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#FCD34D', lineHeight: 1.45 }}>
            <strong>The 2x Consecutive Purge Rule:</strong> Answering a failed question correctly <em>twice in a row</em> permanently purges it from the vault as &ldquo;Conquered&rdquo;.
          </div>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={22} color="var(--color-rose)" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              WAITING TO DRILL
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-rose)' }}>
              {activeMistakes.length} Qs
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} color="var(--color-emerald)" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              CONQUERED (2x)
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-emerald)' }}>
              {conqueredCount} Qs
            </div>
          </div>
        </div>
      </div>

      {/* Action Button: Practice Mistakes */}
      {filteredMistakes.length > 0 && (
        <button 
          className="btn-primary" 
          onClick={handlePracticeAll}
          style={{ minHeight: '56px', background: 'linear-gradient(135deg, #F43F5E, #BE123C)', boxShadow: '0 4px 20px -2px rgba(244, 63, 94, 0.4)' }}
        >
          <ShieldAlert size={20} />
          <span>Practice My Mistakes ({filteredMistakes.length} Questions)</span>
          <ArrowRight size={18} />
        </button>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setPaperFilter('all')}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            background: paperFilter === 'all' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            color: paperFilter === 'all' ? '#FFFFFF' : 'var(--text-muted)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          All ({activeMistakes.length})
        </button>
        <button
          onClick={() => setPaperFilter(2)}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            background: paperFilter === 2 ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            color: paperFilter === 2 ? '#34D399' : 'var(--text-muted)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Paper 2 ({activeMistakes.filter(m => m.question.paper === 2).length})
        </button>
        <button
          onClick={() => setPaperFilter(1)}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            background: paperFilter === 1 ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: paperFilter === 1 ? '#818CF8' : 'var(--text-muted)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Paper 1 ({activeMistakes.filter(m => m.question.paper === 1).length})
        </button>
      </div>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <CheckCircle size={28} color="var(--color-emerald)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
            Mistake Vault Clean!
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No active mistakes in this category. Any questions you miss in drills or mocks will automatically appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMistakes.map(item => {
            const q = item.question;
            const streak = item.consecutiveCorrect; // 0 or 1

            return (
              <div 
                key={item.questionId}
                className="glass-card"
                style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}
              >
                {/* Header Tags & Streak Indicators */}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Purge Progress: 0/2 or 1/2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: streak === 1 ? '#34D399' : 'var(--text-dim)', fontWeight: 700 }}>
                        {streak === 1 ? '● ○ 1/2' : '○ ○ 0/2'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--color-rose)', fontWeight: 700, background: 'rgba(244, 63, 94, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                      Failed {item.failCount}x
                    </span>
                  </div>
                </div>

                {/* Question Text Box with Table & Stem Highlighting */}
                <div className="question-text-box" style={{ marginBottom: '18px' }}>
                  <FormattedQuestionText text={q.questionText} />
                </div>

                {/* Neutral Options Grid — no answer revealed (recall practice) */}
                <div className="options-grid" style={{ marginBottom: '16px' }}>
                  {q.options.map(opt => (
                    <div
                      key={opt.key}
                      className="option-btn"
                      style={{ cursor: 'default' }}
                    >
                      <div className="option-key-badge">
                        {opt.key}
                      </div>
                      <div style={{ flex: 1, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {opt.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* High-Yield Rule Popover */}
                {q.cheatSheetRule && (
                  <div className="cheat-sheet-popover" style={{ marginBottom: '16px' }}>
                    <div className="cheat-sheet-title">
                      <span>💡</span>
                      <span>Master Cheat Sheet Rule</span>
                    </div>
                    <div className="cheat-sheet-content">
                      {q.cheatSheetRule}
                    </div>
                  </div>
                )}

                {/* Card Footer: Practice Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    onClick={() => handlePracticeSingle(item)}
                    className="btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(244, 63, 94, 0.12)',
                      borderColor: 'rgba(244, 63, 94, 0.3)',
                      color: '#FDA4AF',
                      cursor: 'pointer'
                    }}
                  >
                    <ShieldAlert size={16} />
                    <span>Practice This Mistake</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
