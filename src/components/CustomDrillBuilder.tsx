import React, { useState } from 'react';
import { UnitManifest, DrillConfig, UnitHealth } from '../types';
import { Zap, Clock, BookOpen, Layers, CheckSquare, Square, AlertTriangle, ArrowRight } from 'lucide-react';

interface CustomDrillBuilderProps {
  manifestUnits: UnitManifest[];
  unitHealths: UnitHealth[];
  onStartDrill: (config: DrillConfig) => void;
  initialUnitId?: number;
  initialPaper?: 1 | 2;
}

export const CustomDrillBuilder: React.FC<CustomDrillBuilderProps> = ({
  manifestUnits,
  unitHealths,
  onStartDrill,
  initialUnitId,
  initialPaper = 2
}) => {
  const [paper, setPaper] = useState<1 | 2 | 'mixed'>(initialPaper);
  const [selectedUnits, setSelectedUnits] = useState<number[]>(
    initialUnitId ? [initialUnitId] : []
  );
  const [targetMode, setTargetMode] = useState<'count' | 'time'>('count');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');

  // Filter units for current paper selection
  const availableUnits = manifestUnits.filter(u => paper === 'mixed' || u.paper === paper);

  const toggleUnit = (unitId: number) => {
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter(id => id !== unitId));
    } else {
      setSelectedUnits([...selectedUnits, unitId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedUnits(availableUnits.map(u => u.unitId));
  };

  const handleClearAll = () => {
    setSelectedUnits([]);
  };

  const handleSelectLeakUnits = () => {
    const leakUnitIds = unitHealths
      .filter(h => h.status === 'leak' && (paper === 'mixed' || h.paper === paper))
      .map(h => h.unitId);
    if (leakUnitIds.length > 0) {
      setSelectedUnits(leakUnitIds);
    } else {
      // If no leak units, select units with lowest accuracy
      const sorted = [...unitHealths]
        .filter(h => paper === 'mixed' || h.paper === paper)
        .sort((a, b) => a.accuracyPercent - b.accuracyPercent);
      setSelectedUnits(sorted.slice(0, 3).map(u => u.unitId));
    }
  };

  // Calculate effective questions count if in time mode (~1.25 min / question)
  const effectiveQuestions = targetMode === 'time'
    ? Math.max(5, Math.round(targetMinutes / 1.25))
    : targetCount;

  const handleStart = () => {
    onStartDrill({
      paper,
      selectedUnits,
      targetMode,
      targetCount: effectiveQuestions,
      targetMinutes,
      mode
    });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Title & Habit Prompt */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(99, 102, 241, 0.15))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ background: '#10B981', padding: '6px', borderRadius: '8px', color: '#090D16' }}>
            <Zap size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              Commute & Custom Drill Builder
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Pick single or multi-units, set your time budget, and master examiner traps.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Paper Selector */}
      <div className="glass-card">
        <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          1. Choose Paper
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <button
            className={`btn-secondary ${paper === 2 ? 'active-tab-btn' : ''}`}
            onClick={() => { setPaper(2); setSelectedUnits([]); }}
            style={{
              borderColor: paper === 2 ? 'var(--color-emerald)' : 'var(--border-subtle)',
              background: paper === 2 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
              color: paper === 2 ? '#34D399' : 'var(--text-main)',
              padding: '10px',
              fontSize: '0.88rem'
            }}
          >
            Paper 2 (Lit)
          </button>
          <button
            className={`btn-secondary ${paper === 1 ? 'active-tab-btn' : ''}`}
            onClick={() => { setPaper(1); setSelectedUnits([]); }}
            style={{
              borderColor: paper === 1 ? 'var(--color-indigo)' : 'var(--border-subtle)',
              background: paper === 1 ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
              color: paper === 1 ? '#818CF8' : 'var(--text-main)',
              padding: '10px',
              fontSize: '0.88rem'
            }}
          >
            Paper 1 (General)
          </button>
          <button
            className={`btn-secondary ${paper === 'mixed' ? 'active-tab-btn' : ''}`}
            onClick={() => { setPaper('mixed'); setSelectedUnits([]); }}
            style={{
              borderColor: paper === 'mixed' ? 'var(--color-amber)' : 'var(--border-subtle)',
              background: paper === 'mixed' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
              color: paper === 'mixed' ? '#FBBF24' : 'var(--text-main)',
              padding: '10px',
              fontSize: '0.88rem'
            }}
          >
            Mixed
          </button>
        </div>
      </div>

      {/* 2. Unit Selection & Combinations */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <label style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            2. Select Units ({selectedUnits.length === 0 ? 'All Units' : `${selectedUnits.length} Selected`})
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleSelectAll} 
              style={{ background: 'none', border: 'none', color: 'var(--color-indigo-light)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Select All
            </button>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <button 
              onClick={handleClearAll} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <button 
              onClick={handleSelectLeakUnits} 
              style={{ background: 'none', border: 'none', color: 'var(--color-rose)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              title="Select your lowest accuracy units"
            >
              Weak Units ⚡
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
          {availableUnits.map(unit => {
            const isSelected = selectedUnits.includes(unit.unitId);
            const health = unitHealths.find(h => h.unitId === unit.unitId && h.paper === unit.paper);
            const accuracy = health?.totalAttempted ? `${health.accuracyPercent}%` : 'Unattempted';
            const healthColor = health?.status === 'safe' ? '#10B981' : health?.status === 'leak' ? '#F43F5E' : '#F59E0B';

            return (
              <div
                key={`${unit.paper}_${unit.unitId}`}
                onClick={() => toggleUnit(unit.unitId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1.5px solid ${isSelected ? 'var(--color-indigo)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isSelected ? (
                    <CheckSquare size={18} color="var(--color-indigo-light)" />
                  ) : (
                    <Square size={18} color="var(--text-dim)" />
                  )}
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isSelected ? '#FFFFFF' : 'var(--text-main)' }}>
                    U{unit.unitId}: {unit.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: healthColor, fontWeight: 600 }}>
                    {accuracy}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    ({unit.questionCount} Qs)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Session Target: Question Count OR Time Budget (e.g. 25 Mins) */}
      <div className="glass-card">
        <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          3. Session Goal & Time Limit
        </label>

        {/* Tab Toggle: By Count vs By Time */}
        <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setTargetMode('count')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: targetMode === 'count' ? 'var(--color-indigo)' : 'transparent',
              color: targetMode === 'count' ? '#FFFFFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={16} />
            Question Count
          </button>
          <button
            onClick={() => setTargetMode('time')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: targetMode === 'time' ? 'var(--color-indigo)' : 'transparent',
              color: targetMode === 'time' ? '#FFFFFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} />
            Time Budget (e.g. 25m)
          </button>
        </div>

        {targetMode === 'count' ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {[5, 10, 15, 20, 25].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setTargetCount(cnt)}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '10px',
                    background: targetCount === cnt ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-surface)',
                    border: `1.5px solid ${targetCount === cnt ? 'var(--color-emerald)' : 'var(--border-subtle)'}`,
                    color: targetCount === cnt ? '#34D399' : 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  {cnt} Qs
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              ⚡ 10 Qs = Standard 12-minute commute drill.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {[10, 15, 20, 25, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => setTargetMinutes(mins)}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '10px',
                    background: targetMinutes === mins ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
                    border: `1.5px solid ${targetMinutes === mins ? 'var(--color-indigo)' : 'var(--border-subtle)'}`,
                    color: targetMinutes === mins ? '#818CF8' : 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: '#C7D2FE' }}>
                ⏱️ <strong>{targetMinutes} Minutes:</strong> serves ~<strong>{effectiveQuestions} Questions</strong>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                @ 1.25 min/Q pace
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Execution Mode: Practice vs Timed Exam */}
      <div className="glass-card">
        <label style={{ display: 'block', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          4. Mode Style
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div
            onClick={() => setMode('practice')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: mode === 'practice' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
              border: `1.5px solid ${mode === 'practice' ? 'var(--color-emerald)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
              <strong style={{ fontFamily: 'var(--font-heading)', color: mode === 'practice' ? '#34D399' : 'var(--text-main)' }}>
                Practice Mode
              </strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Instant green/red feedback + 1-line cheat sheet rule after every tap.
            </p>
          </div>

          <div
            onClick={() => setMode('exam')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: mode === 'exam' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
              border: `1.5px solid ${mode === 'exam' ? 'var(--color-indigo)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.1rem' }}>⏱️</span>
              <strong style={{ fontFamily: 'var(--font-heading)', color: mode === 'exam' ? '#818CF8' : 'var(--text-main)' }}>
                Exam Mode
              </strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Countdown timer, answers hidden until end, scorecard review.
            </p>
          </div>
        </div>
      </div>

      {/* Big Action Button */}
      <button 
        className="btn-primary" 
        onClick={handleStart}
        style={{ minHeight: '58px', fontSize: '1.05rem' }}
      >
        <span>
          Start {targetMode === 'time' ? `${targetMinutes}-Min Drill` : `${targetCount} Qs Drill`}
          {selectedUnits.length > 0 ? ` (${selectedUnits.length} Units)` : ' (All Units)'}
        </span>
        <ArrowRight size={20} />
      </button>
    </div>
  );
};
