import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Share2, Copy, Check, QrCode, ShieldCheck, Download, X } from 'lucide-react';

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const profile = storageService.getProfile();
  const [copiedLink, setCopiedLink] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Generate sync payload URL
  const statePayload = storageService.exportStateJson();
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const syncUrl = `${currentUrl}?sync=${encodeURIComponent(statePayload)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleImport = () => {
    if (!importKey.trim()) return;
    let payload = importKey.trim();
    if (payload.includes('sync=')) {
      payload = payload.split('sync=')[1].split('&')[0];
    }
    const success = storageService.importStateJson(decodeURIComponent(payload));
    if (success) {
      setImportStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setImportStatus('error');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="glass-card" style={{ maxWidth: '460px', width: '100%', padding: '24px', background: '#0D1424', border: '1px solid var(--border-active)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={20} color="var(--color-indigo-light)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
              Device Cloud Sync
            </h3>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close Sync Modal">
            <X size={18} />
          </button>
        </div>

        {/* Privacy Note */}
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--color-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: '#A7F3D0', lineHeight: 1.45 }}>
            <strong>100% Private & Anonymous:</strong> Anyone else who accesses this app gets their own blank profile. Your questions, mistakes, and scores remain strictly on your devices.
          </div>
        </div>

        {/* 1-Click Sync Link */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Transfer to Laptop or New Device
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={syncUrl}
              style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                padding: '10px 12px',
                fontSize: '0.78rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              className="btn-primary"
              onClick={handleCopyLink}
              style={{ width: 'auto', padding: '0 16px', minHeight: '42px', fontSize: '0.85rem' }}
            >
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
            Copy and open this link on your computer to instantly load your exact progress & Mistake Vault.
          </p>
        </div>

        {/* Manual Restore Input */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Restore Progress from Another Device
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Paste sync link or code here..."
              value={importKey}
              onChange={e => setImportKey(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#FFFFFF',
                padding: '10px 12px',
                fontSize: '0.82rem'
              }}
            />
            <button
              className="btn-secondary"
              onClick={handleImport}
              style={{ width: 'auto', padding: '0 14px', minHeight: '42px', fontSize: '0.85rem' }}
            >
              <Download size={16} />
              <span>Restore</span>
            </button>
          </div>

          {importStatus === 'success' && (
            <p style={{ color: 'var(--color-emerald)', fontSize: '0.82rem', fontWeight: 600 }}>
              ✓ Progress successfully synced! Reloading app...
            </p>
          )}
          {importStatus === 'error' && (
            <p style={{ color: 'var(--color-rose)', fontSize: '0.82rem', fontWeight: 600 }}>
              ✕ Invalid sync data. Please verify the copied link.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
