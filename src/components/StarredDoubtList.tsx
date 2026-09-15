import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { StarredDoubt } from '../types';
import { Star, Copy, Check, Trash2, Edit3, Save, ExternalLink } from 'lucide-react';

export const StarredDoubtList: React.FC = () => {
  const [starredMap, setStarredMap] = useState<Record<string, StarredDoubt>>(
    storageService.getStarredDoubts()
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {starredList.map(item => {
            const q = item.question;
            const isEditing = editingId === item.questionId;

            return (
              <div 
                key={item.questionId}
                className="glass-card"
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="unit-tag" style={{ fontSize: '0.72rem' }}>
                    P{q.paper} • U{q.unitId} {q.unitTitle}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleCopy(item)}
                      className="icon-btn"
                      style={{ width: '32px', height: '32px' }}
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
                      style={{ width: '32px', height: '32px', color: 'var(--color-rose)' }}
                      title="Remove from Doubts"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {q.questionText}
                </p>

                {/* Options List */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', margin: '4px 0' }}>
                  {q.options.map(opt => (
                    <div
                      key={opt.key}
                      style={{
                        fontSize: '0.82rem',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: opt.key === q.correctOption ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${opt.key === q.correctOption ? 'var(--color-emerald)' : 'var(--border-subtle)'}`,
                        color: opt.key === q.correctOption ? '#34D399' : 'var(--text-muted)'
                      }}
                    >
                      <strong>({opt.key})</strong> {opt.text}
                    </div>
                  ))}
                </div>

                {/* Notes Section */}
                <div style={{ marginTop: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {isEditing ? (
                    <div>
                      <textarea
                        value={tempNote}
                        onChange={e => setTempNote(e.target.value)}
                        placeholder="Add your revision note or discussion point..."
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-active)',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          padding: '8px',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-body)',
                          resize: 'none',
                          marginBottom: '8px'
                        }}
                      />
                      <button
                        onClick={() => handleSaveNote(item.questionId)}
                        className="btn-primary"
                        style={{ minHeight: '36px', fontSize: '0.82rem', padding: '0 12px', width: 'auto' }}
                      >
                        <Save size={14} />
                        Save Note
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '0.82rem', color: item.notes ? '#FCD34D' : 'var(--text-dim)', fontStyle: item.notes ? 'normal' : 'italic' }}>
                        {item.notes ? `📝 Note: ${item.notes}` : 'No notes added yet'}
                      </p>
                      <button
                        onClick={() => handleStartEdit(item)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                      >
                        <Edit3 size={13} />
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
