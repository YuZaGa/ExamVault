import React from 'react';
import { Flame, Volume2, VolumeX, Smartphone, Share2, ShieldCheck } from 'lucide-react';
import { audioService } from '../services/audioService';
import { storageService } from '../services/storageService';

interface HeaderProps {
  onOpenSync: () => void;
  onOpenAdmin?: () => void;
  streakDays: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSync, onOpenAdmin, streakDays }) => {
  const [soundOn, setSoundOn] = React.useState(audioService.soundEnabled);
  const [hapticOn, setHapticOn] = React.useState(audioService.hapticEnabled);

  const toggleSound = () => {
    const next = !soundOn;
    audioService.soundEnabled = next;
    storageService.updateProfile({ soundEnabled: next });
    setSoundOn(next);
    if (next) audioService.playCorrect();
  };

  const toggleHaptic = () => {
    const next = !hapticOn;
    audioService.hapticEnabled = next;
    storageService.updateProfile({ hapticEnabled: next });
    setHapticOn(next);
    if (next && navigator.vibrate) navigator.vibrate(50);
  };

  return (
    <header className="app-header">
      <div className="brand-area">
        <div className="brand-logo">
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>⚡</span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-name">ExamVault</span>
            <span className="brand-badge">JRF 210+</span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <div className="streak-pill" title="Daily Practice Streak">
          <Flame size={16} fill="#F59E0B" color="#F59E0B" />
          <span>{streakDays}d</span>
        </div>

        <button 
          className="icon-btn" 
          onClick={toggleSound} 
          title={soundOn ? 'Mute Sounds' : 'Enable Audio Synthesizer'}
          aria-label="Toggle Sound"
        >
          {soundOn ? <Volume2 size={18} color="#10B981" /> : <VolumeX size={18} />}
        </button>

        <button 
          className="icon-btn" 
          onClick={toggleHaptic} 
          title={hapticOn ? 'Haptics Enabled' : 'Haptics Disabled'}
          aria-label="Toggle Haptic Feedback"
        >
          <Smartphone size={17} color={hapticOn ? '#6366F1' : 'inherit'} />
        </button>

        {onOpenAdmin && (
          <button 
            className="icon-btn" 
            onClick={onOpenAdmin} 
            title="Admin Question Approval (/admin)"
            aria-label="Admin Portal"
            style={{ color: '#A78BFA' }}
          >
            <ShieldCheck size={18} />
          </button>
        )}

        <button 
          className="icon-btn" 
          onClick={onOpenSync} 
          title="Sync Devices / Multi-device profile"
          aria-label="Sync Devices"
        >
          <Share2 size={17} />
        </button>
      </div>
    </header>
  );
};
