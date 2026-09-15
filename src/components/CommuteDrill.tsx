import React, { useState, useEffect, useRef } from 'react';
import { Question, OptionKey } from '../types';
import { audioService } from '../services/audioService';
import { storageService } from '../services/storageService';
import { 
  ArrowLeft, 
  ArrowRight, 
  Star, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RotateCcw,
  Award,
  BookOpen
} from 'lucide-react';

interface CommuteDrillProps {
  questions: Question[];
  mode: 'practice' | 'exam';
  timeBudgetMinutes?: number;
  onFinish: () => void;
  onBack: () => void;
}

export const CommuteDrill: React.FC<CommuteDrillProps> = ({
  questions,
  mode,
  timeBudgetMinutes,
  onFinish,
  onBack
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, OptionKey>>({});
  const [purgedQuestions, setPurgedQuestions] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [finalTimeSpent, setFinalTimeSpent] = useState<number | null>(null);
  
  // Timer state
  const totalSeconds = (timeBudgetMinutes || Math.round(questions.length * 1.25)) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const timerRef = useRef<any>(null);

  const currentQ = questions[currentIndex];
  const isStarred = currentQ ? storageService.isStarred(currentQ.id) : false;
  const currentSelected = selectedAnswers[currentIndex];
  const isAnswered = currentSelected !== undefined;

  // Countdown timer effect
  useEffect(() => {
    if (isCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setFinalTimeSpent(totalSeconds);
          setIsCompleted(true);
          return 0;
        }
        if (prev === 60 || prev === 300) {
          audioService.playWarningTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCompleted]);

  if (!currentQ || questions.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No questions available for this selection.</p>
        <button className="btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
          Back to Builder
        </button>
      </div>
    );
  }

  // Handle Option Tap
  const handleSelectOption = (key: OptionKey) => {
    if (isAnswered && mode === 'practice') return; // Prevent re-tapping in practice mode

    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: key }));

    const isCorrect = key === currentQ.correctOption;

    if (mode === 'practice') {
      if (isCorrect) {
        audioService.playCorrect();
      } else {
        audioService.playIncorrect();
      }

      // Record attempt and handle 2x mistake vault purge
      const { isMistakePurged } = storageService.recordAttempt({
        questionId: currentQ.id,
        paper: currentQ.paper,
        unitId: currentQ.unitId,
        selectedOption: key,
        isCorrect,
        timeSpentSeconds: 10,
        timestamp: Date.now()
      }, currentQ);

      if (isMistakePurged) {
        audioService.playPurgeFanfare();
        setPurgedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // In exam mode, record all attempts upon completion
      if (mode === 'exam') {
        questions.forEach((q, idx) => {
          const ans = selectedAnswers[idx];
          if (ans) {
            storageService.recordAttempt({
              questionId: q.id,
              paper: q.paper,
              unitId: q.unitId,
              selectedOption: ans,
              isCorrect: ans === q.correctOption,
              timeSpentSeconds: Math.round(totalSeconds / questions.length),
              timestamp: Date.now()
            }, q);
          }
        });
      }
      const spent = Math.max(1, totalSeconds - secondsRemaining);
      setFinalTimeSpent(spent);
      if (timerRef.current) clearInterval(timerRef.current);
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const toggleStar = () => {
    storageService.toggleStar(currentQ);
    // Force re-render
    setCurrentIndex(currentIndex);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Completion Scorecard
  if (isCompleted) {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOption) {
        correctCount++;
      }
    });

    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Award size={36} color="var(--color-emerald)" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>
            Drill Complete!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {mode === 'practice' ? 'Micro-Drill Learning Session' : 'Timed Exam Session'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>SCORE</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-emerald)' }}>
                {correctCount}/{questions.length}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>ACCURACY</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: accuracy >= 80 ? '#10B981' : accuracy >= 60 ? '#F59E0B' : '#F43F5E' }}>
                {accuracy}%
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TIME</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-indigo-light)' }}>
                {formatTime(finalTimeSpent ?? Math.max(0, totalSeconds - secondsRemaining))}
              </div>
            </div>
          </div>

          {Object.keys(purgedQuestions).length > 0 && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-emerald)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--color-emerald)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34D399' }}>
                {Object.keys(purgedQuestions).length} Mistake(s) Mastered & Purged (2x Rule)!
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowReview(!showReview)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <BookOpen size={18} />
              <span>{showReview ? 'Hide Questions Review' : `Review All Questions (${questions.length} Qs)`}</span>
            </button>

            <button className="btn-primary" onClick={onFinish}>
              Return to Menu
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => {
                setSelectedAnswers({});
                setCurrentIndex(0);
                setIsCompleted(false);
                setShowReview(false);
                setFinalTimeSpent(null);
                setSecondsRemaining(totalSeconds);
              }}
            >
              <RotateCcw size={18} />
              Re-attempt This Drill
            </button>
          </div>
        </div>

        {/* Detailed Question Review List */}
        {showReview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
                Question-by-Question Review
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {correctCount}/{questions.length} Correct
              </span>
            </div>

            {questions.map((q, idx) => {
              const userAns = selectedAnswers[idx];
              const isQCorrect = userAns === q.correctOption;
              const isQAttempted = userAns !== undefined;

              return (
                <div key={q.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="unit-tag" style={{ fontSize: '0.72rem' }}>
                      Q.{idx + 1} • P{q.paper} U{q.unitId}: {q.unitTitle}
                    </span>

                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: '6px',
                      background: isQCorrect 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : isQAttempted 
                        ? 'rgba(244, 63, 94, 0.15)' 
                        : 'rgba(255, 255, 255, 0.08)',
                      color: isQCorrect ? '#34D399' : isQAttempted ? '#FB7185' : 'var(--text-muted)'
                    }}>
                      {isQCorrect ? '✓ Correct' : isQAttempted ? `✕ Selected (${userAns})` : 'Skipped'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                    {q.questionText}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                    {q.options.map(opt => {
                      const isCorrectOpt = opt.key === q.correctOption;
                      const isUserPick = userAns === opt.key;

                      let bg = 'rgba(255, 255, 255, 0.03)';
                      let border = 'var(--border-subtle)';
                      let textColor = 'var(--text-muted)';

                      if (isCorrectOpt) {
                        bg = 'rgba(16, 185, 129, 0.12)';
                        border = 'var(--color-emerald)';
                        textColor = '#34D399';
                      } else if (isUserPick) {
                        bg = 'rgba(244, 63, 94, 0.12)';
                        border = 'var(--color-rose)';
                        textColor = '#FB7185';
                      }

                      return (
                        <div 
                          key={opt.key}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: bg,
                            border: `1px solid ${border}`,
                            color: textColor,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <strong>({opt.key})</strong>
                          <span style={{ flex: 1 }}>{opt.text}</span>
                          {isCorrectOpt && <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>✓ Key</span>}
                          {isUserPick && !isCorrectOpt && <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Your Pick</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.cheatSheetRule && (
                    <div style={{ fontSize: '0.78rem', color: '#FCD34D', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                      💡 {q.cheatSheetRule}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Active Question View
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Session Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} />
          Exit
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Countdown Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', padding: '5px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-heading)', fontSize: '0.88rem', fontWeight: 700, color: secondsRemaining <= 300 ? '#F43F5E' : 'var(--text-main)' }}>
            <Clock size={15} color={secondsRemaining <= 300 ? '#F43F5E' : 'var(--color-indigo-light)'} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Star Button */}
          <button 
            onClick={toggleStar}
            className="icon-btn"
            title={isStarred ? 'Remove from Doubts' : 'Star for Revision'}
          >
            <Star 
              size={18} 
              fill={isStarred ? '#F59E0B' : 'none'} 
              color={isStarred ? '#F59E0B' : 'var(--text-muted)'} 
            />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card">
        {/* Header Tags */}
        <div className="question-header">
          <span className="unit-tag">
            P{currentQ.paper} • U{currentQ.unitId} {currentQ.unitTitle}
          </span>
          <span className="shift-tag">{currentQ.shift}</span>
        </div>

        {/* 2x Purge Notification Banner if conquered */}
        {purgedQuestions[currentQ.id] && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid var(--color-emerald)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontSize: '0.82rem', fontWeight: 700 }}>
            <Sparkles size={16} />
            <span>CONQUERED! You answered this correctly 2x in a row. Purged from Mistake Vault!</span>
          </div>
        )}

        {/* Question Text */}
        <div className="question-text-box">
          {currentQ.questionText}
        </div>

        {/* Options Grid (Thumb-friendly touch pills) */}
        <div className="options-grid">
          {currentQ.options.map(opt => {
            let btnClass = 'option-btn';
            let isCorrect = opt.key === currentQ.correctOption;
            let isUserPick = currentSelected === opt.key;

            if (mode === 'practice' && isAnswered) {
              if (isCorrect) {
                btnClass += ' correct';
              } else if (isUserPick) {
                btnClass += ' incorrect';
              }
            } else if (mode === 'exam' && isUserPick) {
              btnClass += ' selected-exam';
            }

            return (
              <button
                key={opt.key}
                className={btnClass}
                onClick={() => handleSelectOption(opt.key)}
                disabled={isAnswered && mode === 'practice'}
              >
                <div className="option-key-badge">
                  {opt.key}
                </div>
                <div style={{ flex: 1 }}>
                  {opt.text}
                </div>
                {mode === 'practice' && isAnswered && isCorrect && (
                  <CheckCircle2 size={20} color="var(--color-emerald)" style={{ flexShrink: 0 }} />
                )}
                {mode === 'practice' && isAnswered && isUserPick && !isCorrect && (
                  <XCircle size={20} color="var(--color-rose)" style={{ flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Instant Cheat Sheet Rule Popover (Practice Mode) */}
        {mode === 'practice' && isAnswered && (
          <div className="cheat-sheet-popover">
            <div className="cheat-sheet-title">
              <span>💡</span>
              <span>Master Cheat Sheet Rule</span>
            </div>
            <div className="cheat-sheet-content">
              {currentQ.cheatSheetRule ? (
                currentQ.cheatSheetRule
              ) : (
                `Exam Trap Rule: The official NTA validated answer is (${currentQ.correctOption}). Review the exact phrasing in option (${currentQ.correctOption}) to spot this recurring pattern in upcoming shifts.`
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation Controls */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            style={{ flex: 1, opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            <ArrowLeft size={18} />
            Previous
          </button>

          <button 
            className="btn-primary" 
            onClick={handleNext}
            style={{ flex: 2 }}
          >
            <span>{currentIndex === questions.length - 1 ? 'Finish Drill' : 'Next Question'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
