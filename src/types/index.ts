export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Option {
  key: OptionKey;
  text: string;
}

export interface Question {
  id: string;
  paper: 1 | 2;
  unitId: number;
  unitTitle: string;
  shift: string;
  questionText: string;
  options: Option[];
  correctOption: OptionKey;
  cheatSheetRule?: string | null;
}

export interface UnitManifest {
  paper: 1 | 2;
  unitId: number;
  title: string;
  questionCount: number;
  fileName: string;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  totalQuestions: number;
  totalPaper2: number;
  totalPaper1: number;
  units: UnitManifest[];
}

export interface UserAttempt {
  questionId: string;
  paper: 1 | 2;
  unitId: number;
  selectedOption: OptionKey;
  isCorrect: boolean;
  timeSpentSeconds: number;
  timestamp: number;
}

export interface MistakeItem {
  questionId: string;
  question: Question;
  failCount: number;
  consecutiveCorrect: number; // 0, 1, or 2 (at 2 it is purged!)
  firstFailedAt: number;
  lastAttemptedAt: number;
  status: 'active' | 'conquered';
}

export interface StarredDoubt {
  questionId: string;
  question: Question;
  starredAt: number;
  notes?: string;
}

export interface UnitHealth {
  unitId: number;
  paper: 1 | 2;
  title: string;
  totalAttempted: number;
  totalCorrect: number;
  accuracyPercent: number;
  status: 'safe' | 'warning' | 'leak'; // Green (>=80), Yellow (60-79), Red (<60)
}

export interface DailyHabit {
  date: string; // YYYY-MM-DD
  morningCommuteDone: boolean;
  recessMistakeDone: boolean;
  eveningDrillDone: boolean;
  mockDone: boolean;
}

export interface MockExamResult {
  id: string;
  title: string;
  paper: 1 | 2 | 'mixed';
  totalQuestions: number;
  correctCount: number;
  score: number; // e.g. out of 100 or 200
  accuracy: number;
  timeTakenSeconds: number;
  completedAt: number;
  unitBreakdown: Record<string, { correct: number; total: number }>;
}

export type DrillMode = 'practice' | 'exam';

export interface DrillConfig {
  paper: 1 | 2 | 'mixed';
  selectedUnits: number[]; // Array of unit IDs
  targetMode: 'count' | 'time';
  targetCount: number; // e.g. 5, 10, 15, 20, 25, 50
  targetMinutes: number; // e.g. 10, 15, 20, 25, 30, 45, 60
  mode: DrillMode;
}

export interface UserProfile {
  syncId: string;
  createdAt: number;
  lastActiveAt: number;
  streakDays: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}
