import React, { useState } from 'react';
import { UnitHealth } from '../types';
import { BarChart3, Zap, ShieldCheck, AlertCircle, TrendingUp } from 'lucide-react';

interface HealthMeterProps {
  unitHealths: UnitHealth[];
  onDrillUnit: (paper: 1 | 2, unitId: number) => void;
}

export const HealthMeter: React.FC<HealthMeterProps> = ({ unitHealths, onDrillUnit }) => {
  const [activePaper, setActivePaper] = useState<1 | 2>(2);

  const filtered = unitHealths.filter(u => u.paper === activePaper);

  const safeCount = filtered.filter(u => u.status === 'safe').length;
  const warningCount = filtered.filter(u => u.status === 'warning').length;
  const leakCount = filtered.filter(u => u.status === 'leak').length;

  const totalAttempted = filtered.reduce((acc, u) => acc + u.totalAttempted, 0);
  const totalCorrect = filtered.reduce((acc, u) => acc + u.totalCorrect, 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Hero Overview */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(16, 185, 129, 0.12))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
              Unit Health & Confidence Meter
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time accuracy diagnostic across all 10 exam units.
            </p>
          </div>
        </div>

        {/* Paper Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
          <button
            onClick={() => setActivePaper(2)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: activePaper === 2 ? 'var(--color-emerald)' : 'transparent',
              color: activePaper === 2 ? '#042F1A' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Paper 2 (Literature)
          </button>
          <button
            onClick={() => setActivePaper(1)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: activePaper === 1 ? 'var(--color-indigo)' : 'transparent',
              color: activePaper === 1 ? '#FFFFFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Paper 1 (General Aptitude)
          </button>
        </div>

        {/* Health Breakdown Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 700 }}>SAFE (≥80%)</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>
              {safeCount} Units
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#FBBF24', fontWeight: 700 }}>NEEDS DRILL</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B' }}>
              {warningCount} Units
            </div>
          </div>

          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#FB7185', fontWeight: 700 }}>LEAKS (&lt;60%)</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#F43F5E' }}>
              {leakCount} Units
            </div>
          </div>
        </div>
      </div>

      {/* Unit Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(unit => {
          const isUnattempted = unit.totalAttempted === 0;
          const statusText = isUnattempted
            ? 'Not Yet Attempted'
            : unit.status === 'safe'
            ? 'Exam Ready — Safe!'
            : unit.status === 'leak'
            ? 'Leak Detected'
            : 'Needs Practice';

          const statusColor = isUnattempted
            ? 'var(--text-dim)'
            : unit.status === 'safe'
            ? '#10B981'
            : unit.status === 'leak'
            ? '#F43F5E'
            : '#F59E0B';

          return (
            <div 
              key={`${unit.paper}_${unit.unitId}`}
              className={`health-meter-card ${unit.status}`}
            >
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Unit {unit.unitId}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    {unit.title}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span style={{ color: statusColor, fontWeight: 700 }}>
                    {statusText}
                  </span>
                  <span>•</span>
                  <span>{unit.totalCorrect}/{unit.totalAttempted} Correct</span>
                </div>

                {/* Accuracy Bar */}
                <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${isUnattempted ? 0 : unit.accuracyPercent}%`,
                      background: statusColor,
                      borderRadius: '999px',
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Drill This Unit Button */}
              <button
                onClick={() => onDrillUnit(unit.paper, unit.unitId)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34D399',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={14} />
                <span>Drill Unit</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
