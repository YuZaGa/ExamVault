import React, { useState } from 'react';
import { AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';
import { Question, ReportReason } from '../types';
import { reportService } from '../services/reportService';

interface ReportQuestionModalProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
  onReportSuccess: (questionId: string) => void;
}

const REASONS: { key: ReportReason; label: string; icon: string }[] = [
  { key: 'broken_table', label: 'Broken Table / Layout', icon: '📊' },
  { key: 'wrong_answer', label: 'Wrong Official Answer', icon: '❌' },
  { key: 'missing_options', label: 'Missing / Cut-off Options', icon: '✂️' },
  { key: 'garbled_text', label: 'Garbled / OCR Text', icon: '📝' },
  { key: 'other', label: 'Other Issue', icon: '❓' }
];

export const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  onReportSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('broken_table');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await reportService.submitReport(question, selectedReason, details);
    setIsSubmitting(false);
    onReportSuccess(question.id);
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.82)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 100000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '16px' 
      }}
    >
      <div 
        className="modal-card" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '450px', 
          width: '100%',
          background: '#0D1424',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          padding: '22px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              background: 'rgba(239, 68, 68, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#EF4444' 
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Report Broken Question
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Immediately excludes it from your active drills
              </p>
            </div>
          </div>
          <button 
            className="icon-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Question Target Badge */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.04)', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem'
        }}>
          <span style={{ fontWeight: 600, color: '#A78BFA' }}>
            P{question.paper} • U{question.unitId} {question.unitTitle}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {question.shift || question.id}
          </span>
        </div>

        {/* Reason Selection Chips */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            What is wrong with this question?
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REASONS.map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => setSelectedReason(r.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: selectedReason === r.key 
                    ? '1.5px solid var(--color-emerald)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: selectedReason === r.key 
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  color: selectedReason === r.key ? '#34D399' : 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: selectedReason === r.key ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </div>
                {selectedReason === r.key && <Check size={16} color="#34D399" />}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Note */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Optional note for Admin:
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="e.g. Options are missing List II items, or Option C should be correct..."
            rows={2}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              resize: 'none'
            }}
          />
        </div>

        {/* Exclusion Warning Banner */}
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          color: '#FBBF24',
          fontSize: '0.78rem',
          lineHeight: '1.4'
        }}>
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            This question will be <strong>immediately removed</strong> from your active drills and tests. Once fixed and approved by admin, it will safely return to your pack.
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            style={{ flex: 1, padding: '12px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ 
              flex: 2, 
              padding: '12px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              border: 'none',
              fontWeight: 700
            }}
          >
            {isSubmitting ? 'Reporting...' : 'Report & Exclude'}
          </button>
        </div>
      </div>
    </div>
  );
};
