import React, { useState } from 'react';
import { DailyHabit } from '../types';
import { 
  Flame, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Sun, 
  Coffee, 
  Moon, 
  Trophy 
} from 'lucide-react';

interface RoutineTrackerProps {
  habit: DailyHabit;
  streakDays: number;
  activeMistakesCount: number;
  onLaunchMorning: () => void;
  onLaunchMidday: () => void;
  onLaunchEvening: () => void;
  onLaunchMock: () => void;
}

export const RoutineTracker: React.FC<RoutineTrackerProps> = ({
  habit,
  streakDays,
  activeMistakesCount,
  onLaunchMorning,
  onLaunchMidday,
  onLaunchEvening,
  onLaunchMock
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = [
    habit.morningCommuteDone,
    habit.recessMistakeDone,
    habit.eveningDrillDone,
    habit.mockDone
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedCount / 4) * 100);

  const routineItems = [
    {
      id: 'morning',
      title: 'Morning Commute',
      subtitle: '10 Qs Paper 1 (General Aptitude)',
      icon: <Sun size={18} color="#FBBF24" />,
      isDone: habit.morningCommuteDone,
      actionText: habit.morningCommuteDone ? 'Drill Again' : 'Start 10 Qs',
      onAction: onLaunchMorning,
      color: '#FBBF24',
      badge: '10 mins'
    },
    {
      id: 'midday',
      title: 'Midday Recess',
      subtitle: activeMistakesCount > 0 
        ? `5 Qs Mistake Vault (${activeMistakesCount} waiting)` 
        : 'Mistake Vault (Clean & Mastered!)',
      icon: <Coffee size={18} color="#F43F5E" />,
      isDone: habit.recessMistakeDone,
      actionText: habit.recessMistakeDone 
        ? 'Drill Again' 
        : (activeMistakesCount > 0 ? 'Clear 5 Qs' : 'All Clear ✨'),
      onAction: onLaunchMidday,
      color: '#F43F5E',
      badge: '5 mins',
      disabled: activeMistakesCount === 0 && !habit.recessMistakeDone
    },
    {
      id: 'evening',
      title: 'Evening Study',
      subtitle: '15 Qs Paper 2 (English Literature)',
      icon: <Moon size={18} color="#818CF8" />,
      isDone: habit.eveningDrillDone,
      actionText: habit.eveningDrillDone ? 'Drill Again' : 'Start 15 Qs',
      onAction: onLaunchEvening,
      color: '#818CF8',
      badge: '15 mins'
    },
    {
      id: 'mock',
      title: 'Weekend / Mock Drill',
      subtitle: 'Timed NTA CBT Simulation',
      icon: <Trophy size={18} color="#34D399" />,
      isDone: habit.mockDone,
      actionText: habit.mockDone ? 'Retake Mock' : 'Launch Mock',
      onAction: onLaunchMock,
      color: '#34D399',
      badge: 'Full CBT'
    }
  ];

  return (
    <div className="glass-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Tracker Header */}
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'rgba(245, 158, 11, 0.15)', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Flame size={20} color="#F59E0B" fill="#F59E0B" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
                Daily Routine Tracker
              </h3>
              <span style={{ 
                fontSize: '0.72rem', 
                fontWeight: 700, 
                color: '#F59E0B', 
                background: 'rgba(245, 158, 11, 0.15)', 
                padding: '2px 8px', 
                borderRadius: '6px' 
              }}>
                🔥 {streakDays}d Streak
              </span>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '999px', 
                background: completedCount === 4 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: completedCount === 4 ? '#34D399' : 'var(--text-muted)'
              }}>
                {completedCount}/4 Goals
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {completedCount === 4 ? '🎉 All daily targets completed! Excellent consistency!' : '4 bite-sized routines to lock 210+ score'}
            </p>
          </div>
        </div>

        <button 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          aria-label={isExpanded ? 'Collapse Routine Tracker' : 'Expand Routine Tracker'}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: '12px' }}>
        <div className="progress-bar-track" style={{ height: '6px' }}>
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${progressPercent}%`,
              background: progressPercent === 100 ? 'var(--color-emerald)' : 'linear-gradient(90deg, #F59E0B, #10B981)'
            }} 
          />
        </div>
      </div>

      {/* Routine Task List */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {routineItems.map(item => (
            <div 
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                background: item.isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${item.isDone ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ flexShrink: 0 }}>
                  {item.isDone ? (
                    <CheckCircle2 size={20} color="var(--color-emerald)" />
                  ) : (
                    <Circle size={20} color="var(--text-dim)" />
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: item.isDone ? '#34D399' : '#FFFFFF' }}>
                      {item.title}
                    </span>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      background: 'rgba(255, 255, 255, 0.06)', 
                      padding: '1px 6px', 
                      borderRadius: '4px', 
                      color: 'var(--text-dim)' 
                    }}>
                      {item.badge}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    margin: 0
                  }}>
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={item.onAction}
                disabled={item.disabled}
                style={{
                  flexShrink: 0,
                  minWidth: '118px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: item.isDone 
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : item.disabled
                      ? 'rgba(255, 255, 255, 0.03)'
                      : `rgba(${item.id === 'morning' ? '245, 158, 11' : item.id === 'midday' ? '244, 63, 94' : item.id === 'evening' ? '99, 102, 241' : '16, 185, 129'}, 0.14)`,
                  border: item.isDone
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : item.disabled
                      ? '1px solid rgba(255, 255, 255, 0.08)'
                      : `1px solid ${item.color}`,
                  color: item.isDone
                    ? '#34D399'
                    : item.disabled
                      ? 'var(--text-dim)'
                      : item.color,
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  opacity: item.disabled ? 0.6 : 1,
                  marginLeft: '10px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{item.actionText}</span>
                {!item.disabled && <ArrowRight size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
