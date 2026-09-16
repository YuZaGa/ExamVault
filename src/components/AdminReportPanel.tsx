import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft, 
  Clock, 
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { ReportedQuestion } from '../types';
import { reportService } from '../services/reportService';
import { FormattedQuestionText } from './FormattedQuestionText';

interface AdminReportPanelProps {
  onBack: () => void;
}

export const AdminReportPanel: React.FC<AdminReportPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [pendingReports, setPendingReports] = useState<ReportedQuestion[]>([]);
  const [resolvedReports, setResolvedReports] = useState<ReportedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    const [pending, resolved] = await Promise.all([
      reportService.fetchPendingReports(),
      reportService.fetchResolvedReports()
    ]);
    setPendingReports(pending);
    setResolvedReports(resolved);
    setIsLoading(false);
  };

  const handleApprove = async (report: ReportedQuestion) => {
    if (!report.id) return;
    setActionInProgress(report.id);
    const success = await reportService.approveAndResolve(report.id, report.questionId);
    setActionInProgress(null);

    if (success) {
      setPendingReports(prev => prev.filter(r => r.id !== report.id));
      setResolvedReports(prev => [{ ...report, status: 'resolved', resolvedAt: new Date().toISOString() }, ...prev]);
      showToast(`Question ${report.shift || report.questionId} approved & restored to packs!`);
    } else {
      showToast('Failed to approve report. Please check your connection.');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopySummary = (report: ReportedQuestion) => {
    const summary = `Fix Question: ${report.questionId} (${report.shift})\nUnit: ${report.unitTitle}\nIssue: ${report.reason}\nNote: ${report.details || 'None'}\nStem:\n${report.questionText}`;
    navigator.clipboard.writeText(summary);
    setCopiedId(report.questionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="tab-container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#FFFFFF',
          padding: '10px 20px',
          borderRadius: '24px',
          fontSize: '0.85rem',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button 
          onClick={onBack}
          className="secondary-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to App</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={loadReports}
            className="icon-btn"
            title="Refresh reports from cloud"
            disabled={isLoading}
          >
            <RefreshCw size={17} className={isLoading ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={24} color="var(--color-emerald)" />
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
            Admin Question Approval
          </h2>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Review reported broken questions. Once fixed in code, click <strong>Approve</strong> to restore them to student packs.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '12px',
            border: activeTab === 'pending' ? '1.5px solid var(--color-emerald)' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeTab === 'pending' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            color: activeTab === 'pending' ? '#34D399' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>Pending Fixes ({pendingReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '12px',
            border: activeTab === 'resolved' ? '1.5px solid var(--color-emerald)' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeTab === 'resolved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            color: activeTab === 'resolved' ? '#34D399' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>Resolved Archive ({resolvedReports.length})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin-anim" style={{ margin: '0 auto 12px auto' }} />
          <p>Fetching live reports from Supabase...</p>
        </div>
      ) : activeTab === 'pending' ? (
        pendingReports.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <CheckCircle2 size={40} color="var(--color-emerald)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>All Clear!</h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              No broken questions currently pending review.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pendingReports.map(report => (
              <div key={report.id || report.questionId} className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                {/* Meta Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="unit-tag">
                        P{report.paper} • U{report.unitId} {report.unitTitle}
                      </span>
                      <span className="shift-tag" style={{ color: '#FBBF24', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                        {report.shift || report.questionId}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      <span>Reported {new Date(report.reportedAt).toLocaleDateString()} at {new Date(report.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopySummary(report)}
                    className="secondary-btn"
                    style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Copy details to paste in chat"
                  >
                    {copiedId === report.questionId ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
                    <span>{copiedId === report.questionId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Reason & Notes Banner */}
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '8px', 
                  padding: '10px 12px', 
                  marginBottom: '16px',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ fontWeight: 700, color: '#F87171', marginBottom: report.details ? '4px' : '0' }}>
                    🚨 Issue: {report.reason.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  {report.details && (
                    <div style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}>
                      <strong>User Note:</strong> "{report.details}"
                    </div>
                  )}
                </div>

                {/* Live Question Preview */}
                <div style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  borderRadius: '10px', 
                  padding: '14px', 
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={13} />
                    <span>Current Question Preview</span>
                  </div>

                  <FormattedQuestionText text={report.questionText} />

                  {/* Options List */}
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {report.options.map(opt => (
                      <div 
                        key={opt.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: opt.key === report.correctOption ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: opt.key === report.correctOption ? '1px solid var(--color-emerald)' : '1px solid rgba(255, 255, 255, 0.04)',
                          fontSize: '0.82rem',
                          color: opt.key === report.correctOption ? '#34D399' : 'var(--text-main)'
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>({opt.key})</span>
                        <span style={{ flex: 1 }}>{opt.text}</span>
                        {opt.key === report.correctOption && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--color-emerald)', color: '#000', padding: '2px 6px', borderRadius: '4px' }}>
                            KEY
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => handleApprove(report)}
                    disabled={actionInProgress === report.id}
                    className="primary-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      fontSize: '0.88rem',
                      fontWeight: 800
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>{actionInProgress === report.id ? 'Approving...' : 'Approve Fix & Restore to Pack'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        resolvedReports.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <p>No resolved questions yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resolvedReports.map(report => (
              <div key={report.id || report.questionId} className="glass-card" style={{ padding: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="unit-tag">
                        P{report.paper} • U{report.unitId}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {report.shift || report.questionId}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        Resolved
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Approved on {report.resolvedAt ? new Date(report.resolvedAt).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
