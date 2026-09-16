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
  HelpCircle,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Info,
  Flag
} from 'lucide-react';
import { FormattedQuestionText } from './FormattedQuestionText';
import { ReportQuestionModal } from './ReportQuestionModal';

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
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);
  const [reportToast, setReportToast] = useState<string | null>(null);

  const handleReportSuccess = (_questionId: string) => {
    setReportToast('Question reported & excluded from pack');
    setTimeout(() => setReportToast(null), 3500);

    if (!isReviewMode && currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Past Mock Results & Scorecard Stats
  const [pastResults, setPastResults] = useState<MockExamResult[]>(() => storageService.getMockResults());
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [lastSubmissionStats, setLastSubmissionStats] = useState<{
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
  }>({ attempted: 0, correct: 0, incorrect: 0, unattempted: 0 });

  // Countdown timer with wall-clock deadline
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

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
      if (!qs || qs.length === 0) {
        alert('Could not generate mock exam questions. Please verify your connection and try again.');
        return;
      }
      const durationSecs = paper === 1 ? 60 * 60 : 120 * 60; // 60m for P1, 120m for P2
      const now = Date.now();
      startTimeRef.current = now;
      endTimeRef.current = now + durationSecs * 1000;
      setQuestions(qs);
      setTotalTime(durationSecs);
      setTimeRemaining(durationSecs);
      setAnswers({});
      setMarkedForReview({});
      setVisited({ 0: true });
      setCurrentIndex(0);
      setIsSubmitted(false);
      setIsReviewMode(false);
      // Set selectedMock AFTER time and questions are fully initialized so timer starts immediately
      setSelectedMock(paper);
    } catch (err) {
      console.error('Error starting mock exam:', err);
      alert('An unexpected error occurred while preparing the mock exam.');
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

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((endTimeRef.current - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 300 || remaining === 60) {
        audioService.playWarningTick();
      }

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        handleSubmitTest();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

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
    let incorrect = 0;
    let unattempted = 0;
    const unitBreakdown: Record<string, { correct: number; total: number }> = {};

    const elapsedSecs = Math.round((Date.now() - (startTimeRef.current || (Date.now() - (currTotalTime - currTimeRemaining) * 1000))) / 1000);
    const timeTaken = Math.min(currTotalTime, Math.max(1, elapsedSecs));

    currQuestions.forEach((q, idx) => {
      const userAns = currAnswers[idx];
      const isAttempted = userAns !== undefined;
      const isCorrect = isAttempted && userAns === q.correctOption;

      if (isCorrect) {
        correct++;
      } else if (isAttempted) {
        incorrect++;
      } else {
        unattempted++;
      }

      const unitKey = `Unit ${q.unitId}: ${q.unitTitle}`;
      if (!unitBreakdown[unitKey]) {
        unitBreakdown[unitKey] = { correct: 0, total: 0 };
      }
      unitBreakdown[unitKey].total++;
      if (isCorrect) unitBreakdown[unitKey].correct++;

      // Only record attempts for questions the user actually answered
      if (isAttempted) {
        storageService.recordAttempt({
          questionId: q.id,
          paper: q.paper,
          unitId: q.unitId,
          selectedOption: userAns,
          isCorrect,
          timeSpentSeconds: currQuestions.length > 0 ? Math.round(timeTaken / currQuestions.length) : 0,
          timestamp: Date.now()
        }, q);
      }
    });

    setLastSubmissionStats({
      attempted: Object.keys(currAnswers).length,
      correct,
      incorrect,
      unattempted
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
      timeTakenSeconds: timeTaken,
      completedAt: Date.now(),
      unitBreakdown
    };

    storageService.recordMockResult(mockResult);
    setPastResults(storageService.getMockResults());
    storageService.updateTodayHabit({ mockDone: true });
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formatResultDate = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return 'Earlier';
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteMockResult = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this mock exam result from history?')) {
      storageService.deleteMockResult(id);
      setPastResults(storageService.getMockResults());
      if (expandedResultId === id) {
        setExpandedResultId(null);
      }
    }
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

        {/* Past Mock Results Section */}
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} color="var(--color-indigo-light)" />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Past Mock Results
              </h3>
            </div>
            {pastResults.length > 0 && (
              <span className="brand-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-indigo-light)' }}>
                {pastResults.length} {pastResults.length === 1 ? 'Test' : 'Tests'} Completed
              </span>
            )}
          </div>

          {pastResults.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <History size={22} color="var(--text-dim)" />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: 'var(--text-main)' }}>
                No Past Mock Exams Recorded
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto' }}>
                Launch a Paper 1 or Paper 2 CBT full simulation above. All completed tests, scores, time taken, and unit-by-unit mark breakdowns will be recorded here.
              </p>
            </div>
          ) : (
            <>
              {/* Performance Overview Banner */}
              {(() => {
                const totalMocks = pastResults.length;
                const avgAccuracy = Math.round(pastResults.reduce((acc, curr) => acc + curr.accuracy, 0) / totalMocks);
                const bestScore = Math.max(...pastResults.map(r => r.score));

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>COMPLETED</div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {totalMocks}
                      </div>
                    </div>
                    <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>AVG ACCURACY</div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: avgAccuracy >= 70 ? 'var(--color-emerald)' : 'var(--color-amber)' }}>
                        {avgAccuracy}%
                      </div>
                    </div>
                    <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Trophy size={13} color="var(--color-indigo-light)" />
                        <span>BEST SCORE</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-indigo-light)' }}>
                        {bestScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>pts</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Past Mock Result Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pastResults.map(result => {
                  const isExpanded = expandedResultId === result.id;
                  const maxMarks = result.paper === 1 ? 100 : 200;
                  const unitEntries = Object.entries(result.unitBreakdown || {});

                  return (
                    <div 
                      key={result.id}
                      className="glass-card"
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      {/* Top Row: Title, Date, Trash */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span 
                              className="brand-badge" 
                              style={{ 
                                background: result.paper === 1 ? 'rgba(99, 102, 241, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                                color: result.paper === 1 ? '#818CF8' : '#34D399',
                                fontSize: '0.72rem',
                                padding: '2px 8px'
                              }}
                            >
                              Paper {result.paper}
                            </span>
                            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {result.title}
                            </h4>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {formatResultDate(result.completedAt)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteMockResult(result.id, e)}
                          title="Delete from history"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-rose)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Stat Badges Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: 'var(--bg-surface)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700 }}>SCORE</div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-emerald)' }}>
                            {result.score}/{maxMarks}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700 }}>ACCURACY</div>
                          <div style={{ 
                            fontFamily: 'var(--font-heading)', 
                            fontSize: '0.92rem', 
                            fontWeight: 800, 
                            color: result.accuracy >= 70 ? 'var(--color-emerald)' : result.accuracy >= 50 ? 'var(--color-amber)' : 'var(--color-rose)' 
                          }}>
                            {result.accuracy}%
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700 }}>CORRECT</div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {result.correctCount}/{result.totalQuestions}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700 }}>TIME</div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-indigo-light)' }}>
                            {formatTime(result.timeTakenSeconds)}
                          </div>
                        </div>
                      </div>

                      {/* Unit Breakdown Expand Button */}
                      {unitEntries.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedResultId(isExpanded ? null : result.id)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              background: isExpanded ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                              color: 'var(--text-muted)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>Unit Performance Breakdown ({unitEntries.length} Units)</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {/* Expanded Unit Performance List */}
                          {isExpanded && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                              {unitEntries.map(([unitName, uStat]) => {
                                const unitPct = uStat.total > 0 ? Math.round((uStat.correct / uStat.total) * 100) : 0;
                                const barColor = unitPct >= 70 ? 'var(--color-emerald)' : unitPct >= 50 ? 'var(--color-amber)' : 'var(--color-rose)';

                                return (
                                  <div key={unitName} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                      <span style={{ color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                        {unitName}
                                      </span>
                                      <span style={{ color: barColor, fontWeight: 700 }}>
                                        {uStat.correct}/{uStat.total} ({unitPct}%)
                                      </span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ width: `${unitPct}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
      const isCurrentInFilter = filteredIndices.includes(currentIndex);
      const currentReviewQ = isCurrentInFilter ? questions[currentIndex] : null;
      const isStarred = currentReviewQ ? (doubtStarred[currentReviewQ.id] || storageService.isStarred(currentReviewQ.id)) : false;
      const userChoice = answers[currentIndex];
      const isCorrect = userChoice === currentReviewQ?.correctOption;
      const isAttempted = userChoice !== undefined;
      const currPos = filteredIndices.indexOf(currentIndex);
      const hasPrev = currPos > 0;
      const hasNext = currPos >= 0 && currPos < filteredIndices.length - 1;

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
              Mock Review (Paper {selectedMock}) {filteredIndices.length > 0 && `• ${currPos >= 0 ? currPos + 1 : 1}/${filteredIndices.length}`}
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
                        if (!filteredIndices.includes(idx)) {
                          setReviewFilter('all');
                        }
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setReportingQuestion(currentReviewQ)}
                    className="icon-btn"
                    title="Report broken question"
                    style={{ 
                      padding: '4px 8px', 
                      height: 'auto', 
                      borderRadius: '6px', 
                      fontSize: '0.72rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      color: '#F87171', 
                      border: '1px solid rgba(239, 68, 68, 0.25)', 
                      background: 'rgba(239, 68, 68, 0.08)' 
                    }}
                  >
                    <Flag size={12} />
                    <span>Report</span>
                  </button>

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
                <FormattedQuestionText text={currentReviewQ.questionText} />
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
                    if (hasPrev) {
                      setCurrentIndex(filteredIndices[currPos - 1]);
                    }
                  }}
                  disabled={!hasPrev}
                  style={{ flex: 1, minHeight: '46px' }}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>

                <button 
                  className="btn-primary" 
                  onClick={() => {
                    if (hasNext) {
                      setCurrentIndex(filteredIndices[currPos + 1]);
                    }
                  }}
                  disabled={!hasNext}
                  style={{ flex: 2, minHeight: '46px' }}
                >
                  <span>Next Question</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                {reviewFilter === 'incorrect' 
                  ? '🎉 No Mistakes Found!' 
                  : reviewFilter === 'correct'
                  ? 'No Correct Answers'
                  : reviewFilter === 'unattempted'
                  ? 'No Skipped Questions'
                  : 'No questions in this category.'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {reviewFilter === 'incorrect' 
                  ? 'You answered every attempted question correctly in this CBT mock simulation.' 
                  : 'Select another category above or review all questions.'}
              </p>
              <button 
                className="btn-secondary" 
                onClick={() => { 
                  setReviewFilter('all'); 
                  setCurrentIndex(0); 
                }} 
                style={{ margin: '0 auto', width: 'auto' }}
              >
                Show All Questions ({questions.length})
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
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

          {/* Detailed Question Attempt Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px', background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: 700 }}>ATTEMPTED</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {lastSubmissionStats.attempted}/{questions.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: 700 }}>CORRECT</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 800, color: 'var(--color-emerald)' }}>
                {lastSubmissionStats.correct}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: 700 }}>INCORRECT</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 800, color: lastSubmissionStats.incorrect > 0 ? 'var(--color-rose)' : 'var(--text-muted)' }}>
                {lastSubmissionStats.incorrect}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: 700 }}>UNATTEMPTED</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 800, color: 'var(--text-dim)' }}>
                {lastSubmissionStats.unattempted}
              </div>
            </div>
          </div>

          {/* Context-Accurate Mistake Vault Notification */}
          {lastSubmissionStats.incorrect > 0 ? (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <ShieldAlert size={22} color="var(--color-rose)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: '#F8FAFC' }}>
                <strong>{lastSubmissionStats.incorrect}</strong> incorrect question{lastSubmissionStats.incorrect > 1 ? 's' : ''} automatically forwarded to your <strong>Mistake Vault</strong> for 2x purge drilling!
              </span>
            </div>
          ) : lastSubmissionStats.unattempted > 0 ? (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <Info size={22} color="var(--color-indigo-light)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: '#F8FAFC' }}>
                0 incorrect answers! You left <strong>{lastSubmissionStats.unattempted}</strong> question{lastSubmissionStats.unattempted > 1 ? 's' : ''} unattempted. (Unattempted questions are not counted as mistakes).
              </span>
            </div>
          ) : (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <CheckCircle2 size={22} color="var(--color-emerald)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: '#F8FAFC' }}>
                Flawless 100%! All {questions.length} questions answered correctly.
              </span>
            </div>
          )}

          {/* Unit Score Breakdown for current submission */}
          {pastResults.length > 0 && pastResults[0]?.unitBreakdown && Object.keys(pastResults[0].unitBreakdown).length > 0 && (
            <div style={{ textAlign: 'left', background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                Unit Score Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(pastResults[0].unitBreakdown).map(([unitName, uStat]) => {
                  const unitPct = uStat.total > 0 ? Math.round((uStat.correct / uStat.total) * 100) : 0;
                  const barColor = unitPct >= 70 ? 'var(--color-emerald)' : unitPct >= 50 ? 'var(--color-amber)' : 'var(--color-rose)';

                  return (
                    <div key={unitName} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {unitName}
                        </span>
                        <span style={{ color: barColor, fontWeight: 700 }}>
                          {uStat.correct}/{uStat.total} ({unitPct}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${unitPct}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                setIsSubmitted(false);
              }}
            >
              Return to Mock Selection & Past Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Question not available.</p>
        <button className="btn-secondary" onClick={() => setSelectedMock(null)} style={{ margin: '0 auto', width: 'auto' }}>
          Return to Mock Selection
        </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="shift-tag">{currentQ.shift}</span>
            <button
              onClick={() => setReportingQuestion(currentQ)}
              className="icon-btn"
              title="Report broken question"
              style={{ 
                padding: '4px 8px', 
                height: 'auto', 
                borderRadius: '6px', 
                fontSize: '0.72rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                color: '#F87171', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                background: 'rgba(239, 68, 68, 0.08)' 
              }}
            >
              <Flag size={12} />
              <span>Report</span>
            </button>
          </div>
        </div>

        {reportToast && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FCA5A5', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>{reportToast}</span>
          </div>
        )}

        <div className="question-text-box">
          <FormattedQuestionText text={currentQ.questionText} />
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

      {/* Report Broken Question Modal */}
      {reportingQuestion && (
        <ReportQuestionModal
          question={reportingQuestion}
          isOpen={!!reportingQuestion}
          onClose={() => setReportingQuestion(null)}
          onReportSuccess={handleReportSuccess}
        />
      )}
    </div>
  );
};
