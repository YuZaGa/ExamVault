import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { MistakeItem, Question } from '../types';
import { ShieldAlert, Sparkles, Flame, CheckCircle, ArrowRight } from 'lucide-react';

interface MistakeVaultProps {
  onStartMistakeDrill: (questions: Question[]) => void;
}

export const MistakeVault: React.FC<MistakeVaultProps> = ({ onStartMistakeDrill }) => {
  const [paperFilter, setPaperFilter] = useState<1 | 2 | 'all'>('all');
  const activeMistakes = storageService.getActiveMistakes();
  const conqueredCount = storageService.getConqueredMistakesCount();

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredMistakes.map(item => {
            const streak = item.consecutiveCorrect; // 0 or 1

            return (
              <div 
                key={item.questionId}
                className="glass-card"
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="unit-tag" style={{ fontSize: '0.72rem' }}>
                    P{item.question.paper} • U{item.question.unitId} {item.question.unitTitle}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Purge Progress: 0/2 or 1/2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: streak === 1 ? '#34D399' : 'var(--text-dim)', fontWeight: 700 }}>
                        {streak === 1 ? '● ○ 1/2' : '○ ○ 0/2'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: 'var(--color-rose)', fontWeight: 600, background: 'rgba(244, 63, 94, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                      Failed {item.failCount}x
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.45, maxHeight: '64px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.question.questionText.replace(/^>[\s\S]*?\n\n/i, '').replace(/^>\s*/gm, '')}
                </p>

                {item.question.cheatSheetRule && (
                  <div style={{ fontSize: '0.78rem', color: '#FCD34D', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                    💡 {item.question.cheatSheetRule}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    onClick={() => handlePracticeSingle(item)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Practice This</span>
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
