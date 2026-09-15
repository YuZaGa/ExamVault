import React, { useState, useEffect, useRef } from 'react';
import { Question, OptionKey, MockExamResult } from '../types';
import { questionService } from '../services/questionService';
import { storageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { 
  Clock, 
  Grid, 
  CheckCircle2, 
  Bookmark, 
  ArrowLeft, 
  ArrowRight, 
  ShieldAlert, 
  Award,
  AlertTriangle,
  Star,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface MockSimulatorProps {
  onBack: () => void;
}

type PaletteStatus = 'answered' | 'review' | 'answered-review' | 'unvisited';
type ReviewFilterType = 'all' | 'incorrect' | 'correct' | 'unattempted';

export const MockSimulator: React.FC<MockSimulatorProps> = ({ onBack }) => {
  const [selectedMock, setSelectedMock] = useState<1 | 2 | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({ 0: true });
  const [showPalette, setShowPalette] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterType>('all');
  const [doubtStarred, setDoubtStarred] = useState<Record<string, boolean>>({});

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<any>(null);

  // Maintain fresh refs for timer-triggered callbacks
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;

  const totalTimeRef = useRef(totalTime);
  totalTimeRef.current = totalTime;

  const selectedMockRef = useRef(selectedMock);
  selectedMockRef.current = selectedMock;

  const toggleStar = (q: Question) => {
    const isNowStarred = storageService.toggleStar(q);
    setDoubtStarred(prev => ({ ...prev, [q.id]: isNowStarred }));
  };

  const startMock = async (paper: 1 | 2) => {
    setLoading(true);
    try {
      const qs = await questionService.generateMockExam(paper);
      const durationSecs = paper === 1 ? 60 * 60 : 120 * 60; // 60m for P1, 120m for P2
      setQuestions(qs);
      setTotalTime(durationSecs);
      setTimeRemaining(durationSecs);
      setAnswers({});
      setMarkedForReview({});
      setVisited({ 0: true });
      setCurrentIndex(0);
      setIsSubmitted(false);
      // Set selectedMock AFTER time and questions are fully initialized so timer starts immediately
      setSelectedMock(paper);
    } catch (err) {
      console.error('Error starting mock exam:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedMock || isSubmitted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleSubmitTest();
          return 0;
        }
        if (prev === 300 || prev === 60) {
          audioService.playWarningTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [selectedMock, isSubmitted]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (key: OptionKey) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: key }));
  };

  const handleClearResponse = () => {
    const next = { ...answers };
    delete next[currentIndex];
    setAnswers(next);
  };

  const handleToggleReview = () => {
    setMarkedForReview(prev => ({
      ...prev,
      [currentIndex]: !prev[currentIndex]
    }));
  };

  const handleNavigate = (newIdx: number) => {
    if (newIdx >= 0 && newIdx < questions.length) {
      setCurrentIndex(newIdx);
      setVisited(prev => ({ ...prev, [newIdx]: true }));
      setShowPalette(false);
    }
  };

  const getStatus = (idx: number): PaletteStatus => {
    const isAns = answers[idx] !== undefined;
    const isRev = !!markedForReview[idx];

    if (isAns && isRev) return 'answered-review';
    if (isRev) return 'review';
    if (isAns) return 'answered';
    if (visited[idx]) return 'unvisited';
    return 'unvisited';
  };

  const handleSubmitTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowConfirmSubmit(false);
    setIsSubmitted(true);

    const currQuestions = questionsRef.current;
    const currAnswers = answersRef.current;
    const currTimeRemaining = timeRemainingRef.current;
    const currTotalTime = totalTimeRef.current;
    const currSelectedMock = selectedMockRef.current;

    // Record attempts & Mistake Vault updates
    let correct = 0;
    const unitBreakdown: Record<string, { correct: number; total: number }> = {};

    currQuestions.forEach((q, idx) => {
      const userAns = currAnswers[idx];
      const isCorrect = userAns === q.correctOption;
      if (isCorrect) correct++;

      const unitKey = `Unit ${q.unitId}: ${q.unitTitle}`;
      if (!unitBreakdown[unitKey]) {
        unitBreakdown[unitKey] = { correct: 0, total: 0 };
      }
      unitBreakdown[unitKey].total++;
      if (isCorrect) unitBreakdown[unitKey].correct++;

      if (userAns !== undefined) {
        storageService.recordAttempt({
          questionId: q.id,
          paper: q.paper,
          unitId: q.unitId,
          selectedOption: userAns,
          isCorrect,
          timeSpentSeconds: currQuestions.length > 0 ? Math.round((currTotalTime - currTimeRemaining) / currQuestions.length) : 0,
          timestamp: Date.now()
        }, q);
      }
    });

    const marksEarned = correct * 2;
    const accuracy = currQuestions.length > 0 ? Math.round((correct / currQuestions.length) * 100) : 0;

    const mockResult: MockExamResult = {
      id: 'mock_' + Date.now(),
      title: currSelectedMock === 1 ? 'Paper 1 CBT Mock (50 Qs)' : 'Paper 2 CBT Mock (100 Qs)',
      paper: currSelectedMock || 1,
      totalQuestions: currQuestions.length,
      correctCount: correct,
      score: marksEarned,
      accuracy,
      timeTakenSeconds: currTotalTime - currTimeRemaining,
      completedAt: Date.now(),
      unitBreakdown
    };

    storageService.recordMockResult(mockResult);
    storageService.updateTodayHabit({ mockDone: true });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Launch Screen (Presets)
  if (!selectedMock) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(139, 92, 246, 0.12))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--color-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color="#FFFFFF" />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Weekend CBT Mock Simulator
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Timed, full-length simulations with authentic NTA exam palette.
                </p>
              </div>
            </div>

            <button 
              onClick={onBack}
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', minHeight: '36px', fontSize: '0.8rem' }}
            >
              Back
            </button>
          </div>
        </div>

        {/* Mock Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Paper 1 Mock */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="brand-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818CF8' }}>
                Paper 1 Full Simulation
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ⏱️ 60 Minutes
              </span>
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
                50 General Aptitude Questions
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Authentic distribution: 5 questions across each of the 10 units (Teaching, Research, Logical Reasoning, ICT, Environment, Higher Ed).
              </p>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => startMock(1)}
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              <span>Launch Paper 1 Mock (50 Qs)</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Paper 2 Mock */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="brand-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                Paper 2 Full Simulation
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ⏱️ 120 Minutes
              </span>
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
                100 English Literature Questions
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Full exam experience: Drama, Poetry, Fiction, Prose, Linguistics, Cultural Studies, Literary Criticism, Theory & Research Methods.
              </p>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => startMock(2)}
            >
              <span>Launch Paper 2 Mock (100 Qs)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Preparing authentic NTA CBT test session...</p>
      </div>
    );
  }

  // Scorecard View & Review Mode
  if (isSubmitted) {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOption) correct++;
    });
    const maxMarks = selectedMock === 1 ? 100 : 200;
    const score = correct * 2;
    const accuracy = Math.round((correct / questions.length) * 100);

    const incorrectIndices = questions.map((_, i) => i).filter(i => answers[i] !== undefined && answers[i] !== questions[i].correctOption);
    const correctIndices = questions.map((_, i) => i).filter(i => answers[i] === questions[i].correctOption);
    const unattemptedIndices = questions.map((_, i) => i).filter(i => answers[i] === undefined);

    const filteredIndices = reviewFilter === 'all' 
      ? questions.map((_, i) => i)
      : reviewFilter === 'incorrect'
      ? incorrectIndices
      : reviewFilter === 'correct'
      ? correctIndices
      : unattemptedIndices;

    if (isReviewMode) {
      const currentReviewQ = questions[currentIndex];
      const isStarred = currentReviewQ ? (doubtStarred[currentReviewQ.id] || storageService.isStarred(currentReviewQ.id)) : false;
      const userChoice = answers[currentIndex];
      const isCorrect = userChoice === currentReviewQ?.correctOption;
      const isAttempted = userChoice !== undefined;

      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Review Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button 
              onClick={() => setIsReviewMode(false)}
              className="btn-secondary"
              style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.82rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} />
              <span>Scorecard</span>
            </button>

            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Mock Review (Paper {selectedMock})
            </span>

            <button 
              className="icon-btn"
              onClick={() => setShowPalette(!showPalette)}
              title="Open Question Palette"
            >
              <Grid size={18} color="var(--color-indigo-light)" />
            </button>
          </div>

          {/* Filter Toolbar */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)', gap: '4px' }}>
            <button
              onClick={() => {
                setReviewFilter('all');
                setCurrentIndex(0);
              }}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                border: 'none',
                background: reviewFilter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: reviewFilter === 'all' ? '#FFFFFF' : 'var(--text-muted)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              All ({questions.length})
            </button>

            <button
              onClick={() => {
                setReviewFilter('incorrect');
                if (incorrectIndices.length > 0) setCurrentIndex(incorrectIndices[0]);
              }}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                border: 'none',
                background: reviewFilter === 'incorrect' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                color: reviewFilter === 'incorrect' ? '#FB7185' : 'var(--text-muted)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Mistakes ({incorrectIndices.length})
            </button>

            <button
              onClick={() => {
                setReviewFilter('correct');
                if (correctIndices.length > 0) setCurrentIndex(correctIndices[0]);
              }}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                border: 'none',
                background: reviewFilter === 'correct' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: reviewFilter === 'correct' ? '#34D399' : 'var(--text-muted)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Correct ({correctIndices.length})
            </button>

            <button
              onClick={() => {
                setReviewFilter('unattempted');
                if (unattemptedIndices.length > 0) setCurrentIndex(unattemptedIndices[0]);
              }}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                border: 'none',
                background: reviewFilter === 'unattempted' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: reviewFilter === 'unattempted' ? '#FFFFFF' : 'var(--text-muted)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Skipped ({unattemptedIndices.length})
            </button>
          </div>

          {/* Question Palette Drawer (In Review Mode) */}
          {showPalette && (
            <div className="glass-card" style={{ padding: '16px', background: 'rgba(10, 15, 26, 0.98)', border: '1.5px solid var(--color-indigo)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>Review Question Palette</strong>
                <button onClick={() => setShowPalette(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Close ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                {questions.map((q, idx) => {
                  const ans = answers[idx];
                  let bg = 'rgba(255, 255, 255, 0.08)';
                  let color = 'var(--text-muted)';
                  if (ans === q.correctOption) {
                    bg = 'var(--color-emerald)';
                    color = '#042F1A';
                  } else if (ans !== undefined) {
                    bg = 'var(--color-rose)';
                    color = '#FFFFFF';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowPalette(false);
                      }}
                      style={{
                        padding: '8px 0',
                        borderRadius: '6px',
                        border: idx === currentIndex ? '2px solid white' : 'none',
                        background: bg,
                        color,
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--color-emerald)', borderRadius: '2px' }} /> Correct
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--color-rose)', borderRadius: '2px' }} /> Incorrect
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }} /> Unattempted
                </span>
              </div>
            </div>
          )}

          {/* Current Question Review Card */}
          {currentReviewQ ? (
            <div className="glass-card">
              {/* Header Tags & Star Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="unit-tag">
                    Q.{currentIndex + 1} • U{currentReviewQ.unitId}: {currentReviewQ.unitTitle}
                  </span>
                  <span className="shift-tag">{currentReviewQ.shift}</span>
                </div>

                <button 
                  onClick={() => toggleStar(currentReviewQ)}
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

              {/* Status Outcome Banner */}
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: isCorrect 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : isAttempted 
                  ? 'rgba(244, 63, 94, 0.15)' 
                  : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${isCorrect ? 'var(--color-emerald)' : isAttempted ? 'var(--color-rose)' : 'var(--border-subtle)'}`,
                color: isCorrect ? '#34D399' : isAttempted ? '#FB7185' : 'var(--text-muted)'
              }}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 size={18} color="var(--color-emerald)" />
                    <span>Correct (+2 Marks) — You selected ({userChoice})</span>
                  </>
                ) : isAttempted ? (
                  <>
                    <XCircle size={18} color="var(--color-rose)" />
                    <span>Incorrect (0 Marks) — You selected ({userChoice}) | Official Key: ({currentReviewQ.correctOption})</span>
                  </>
                ) : (
                  <>
                    <HelpCircle size={18} color="var(--text-muted)" />
                    <span>Unattempted (0 Marks) — Official Key is ({currentReviewQ.correctOption})</span>
                  </>
                )}
              </div>

              {/* Question Text */}
              <div className="question-text-box">
                {currentReviewQ.questionText}
              </div>

              {/* Options Grid */}
              <div className="options-grid">
                {currentReviewQ.options.map(opt => {
                  const isOfficial = opt.key === currentReviewQ.correctOption;
                  const isUserPick = userChoice === opt.key;

                  let optBorder = 'var(--border-subtle)';
                  let optBg = 'var(--bg-surface)';
                  let optTextColor = 'var(--text-main)';

                  if (isOfficial) {
                    optBorder = 'var(--color-emerald)';
                    optBg = 'rgba(16, 185, 129, 0.12)';
                    optTextColor = '#34D399';
                  } else if (isUserPick) {
                    optBorder = 'var(--color-rose)';
                    optBg = 'rgba(244, 63, 94, 0.12)';
                    optTextColor = '#FB7185';
                  }

                  return (
                    <div
                      key={opt.key}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${optBorder}`,
                        background: optBg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div className="option-key-badge" style={{
                        background: isOfficial ? 'var(--color-emerald)' : isUserPick ? 'var(--color-rose)' : undefined,
                        color: isOfficial ? '#042F1A' : isUserPick ? '#FFFFFF' : undefined
                      }}>
                        {opt.key}
                      </div>

                      <div style={{ flex: 1, fontSize: '0.9rem', color: optTextColor }}>
                        {opt.text}
                      </div>

                      {isOfficial && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34D399', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                          Official Answer
                        </span>
                      )}

                      {isUserPick && !isOfficial && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FB7185', background: 'rgba(244, 63, 94, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                          Your Selection
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cheat Sheet Rule Popover */}
              <div className="cheat-sheet-popover" style={{ marginTop: '16px' }}>
                <div className="cheat-sheet-title">
                  <span>💡</span>
                  <span>Master Cheat Sheet Rule & Examiner Trap</span>
                </div>
                <div className="cheat-sheet-content">
                  {currentReviewQ.cheatSheetRule ? (
                    currentReviewQ.cheatSheetRule
                  ) : (
                    `Exam Trap Rule: The official NTA validated answer is (${currentReviewQ.correctOption}). Review option (${currentReviewQ.correctOption}) carefully to spot this recurring pattern in upcoming shifts.`
                  )}
                </div>
              </div>

              {/* Navigation Bar */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    const currPos = filteredIndices.indexOf(currentIndex);
                    if (currPos > 0) {
                      setCurrentIndex(filteredIndices[currPos - 1]);
                    } else if (currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                    }
                  }}
                  disabled={currentIndex === 0}
                  style={{ flex: 1, minHeight: '46px' }}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>

                <button 
                  className="btn-primary" 
                  onClick={() => {
                    const currPos = filteredIndices.indexOf(currentIndex);
                    if (currPos >= 0 && currPos < filteredIndices.length - 1) {
                      setCurrentIndex(filteredIndices[currPos + 1]);
                    } else if (currentIndex < questions.length - 1) {
                      setCurrentIndex(currentIndex + 1);
                    }
                  }}
                  disabled={currentIndex === questions.length - 1}
                  style={{ flex: 2, minHeight: '46px' }}
                >
                  <span>Next Question</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No questions in this filter.</p>
              <button className="btn-secondary" onClick={() => setReviewFilter('all')} style={{ marginTop: '12px' }}>
                Show All Questions
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', border: '2px solid var(--color-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Award size={36} color="var(--color-indigo-light)" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>
            CBT Mock Scorecard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Paper {selectedMock} Official Simulation
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>SCORE</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-emerald)' }}>
                {score} / {maxMarks}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>ACCURACY</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: accuracy >= 70 ? '#10B981' : '#F59E0B' }}>
                {accuracy}%
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>TIME SPENT</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-indigo-light)' }}>
                {formatTime(totalTime - timeRemaining)}
              </div>
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <ShieldAlert size={22} color="var(--color-rose)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: '#F8FAFC' }}>
              All {questions.length - correct} missed questions have been automatically forwarded to your <strong>Mistake Vault</strong> for 2x purge drilling!
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              className="btn-primary" 
              onClick={() => {
                setIsReviewMode(true);
                setCurrentIndex(0);
                setReviewFilter('all');
              }}
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              <span>Review Questions & Solutions ({questions.length} Qs)</span>
              <ArrowRight size={18} />
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => {
                setSelectedMock(null);
                setIsReviewMode(false);
              }}
            >
              Return to Mock Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active CBT Simulator Test Interface
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top CBT Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="brand-badge">Paper {selectedMock} Mock</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Q.{currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Live Countdown Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 800, color: timeRemaining <= 300 ? '#F43F5E' : '#34D399' }}>
          <Clock size={18} />
          <span>{formatTime(timeRemaining)}</span>
        </div>

        {/* Question Palette Trigger */}
        <button 
          className="icon-btn" 
          onClick={() => setShowPalette(!showPalette)}
          title="Open Question Palette"
        >
          <Grid size={18} color="var(--color-indigo-light)" />
        </button>
      </div>

      {/* Floating Question Palette Drawer */}
      {showPalette && (
        <div className="glass-card" style={{ padding: '16px', background: 'rgba(10, 15, 26, 0.98)', border: '1.5px solid var(--color-indigo)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>Question Palette</strong>
            <button onClick={() => setShowPalette(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Close ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
            {questions.map((_, idx) => {
              const status = getStatus(idx);
              let bg = 'rgba(255, 255, 255, 0.08)';
              let color = 'var(--text-muted)';
              if (status === 'answered') {
                bg = 'var(--color-emerald)';
                color = '#042F1A';
              } else if (status === 'review') {
                bg = 'var(--color-indigo)';
                color = '#FFFFFF';
              } else if (status === 'answered-review') {
                bg = 'var(--color-violet)';
                color = '#FFFFFF';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleNavigate(idx)}
                  style={{
                    padding: '8px 0',
                    borderRadius: '6px',
                    border: idx === currentIndex ? '2px solid white' : 'none',
                    background: bg,
                    color,
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--color-emerald)', borderRadius: '2px' }} /> Answered
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--color-indigo)', borderRadius: '2px' }} /> Marked Review
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }} /> Unvisited
            </span>
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="glass-card">
        <div className="question-header">
          <span className="unit-tag">
            U{currentQ.unitId}: {currentQ.unitTitle}
          </span>
          <span className="shift-tag">{currentQ.shift}</span>
        </div>

        <div className="question-text-box">
          {currentQ.questionText}
        </div>

        {/* Options Grid */}
        <div className="options-grid">
          {currentQ.options.map(opt => {
            const isSelected = answers[currentIndex] === opt.key;
            return (
              <button
                key={opt.key}
                className={`option-btn ${isSelected ? 'selected-exam' : ''}`}
                onClick={() => handleSelectOption(opt.key)}
              >
                <div className="option-key-badge">{opt.key}</div>
                <div style={{ flex: 1 }}>{opt.text}</div>
              </button>
            );
          })}
        </div>

        {/* CBT Bottom Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button 
            className="btn-secondary" 
            onClick={handleClearResponse}
            style={{ flex: 1, minHeight: '44px', fontSize: '0.8rem' }}
          >
            Clear Response
          </button>
          <button 
            className="btn-secondary" 
            onClick={handleToggleReview}
            style={{ 
              flex: 1, 
              minHeight: '44px', 
              fontSize: '0.8rem',
              borderColor: markedForReview[currentIndex] ? 'var(--color-indigo)' : 'var(--border-subtle)',
              color: markedForReview[currentIndex] ? 'var(--color-indigo-light)' : 'inherit'
            }}
          >
            <Bookmark size={14} />
            {markedForReview[currentIndex] ? 'Unmark Review' : 'Mark Review'}
          </button>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => handleNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={{ flex: 1, minHeight: '48px' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button 
            className="btn-primary" 
            onClick={() => {
              if (currentIndex < questions.length - 1) {
                handleNavigate(currentIndex + 1);
              } else {
                setShowConfirmSubmit(true);
              }
            }}
            style={{ flex: 2, minHeight: '48px' }}
          >
            <span>{currentIndex === questions.length - 1 ? 'Review & Submit' : 'Save & Next'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* End of test submit button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={() => setShowConfirmSubmit(true)}
          style={{ background: 'none', border: 'none', color: 'var(--color-rose)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '8px' }}
        >
          Submit Exam Early
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center', background: '#0F1626', border: '1px solid var(--border-active)' }}>
            <AlertTriangle size={36} color="var(--color-amber)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
              Submit CBT Exam?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              You have answered <strong>{Object.keys(answers).length}</strong> of {questions.length} questions. Are you ready to view your score and detailed analysis?
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowConfirmSubmit(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSubmitTest}
                style={{ flex: 1 }}
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
