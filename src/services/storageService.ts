import { 
  UserProfile, 
  UserAttempt, 
  MistakeItem, 
  StarredDoubt, 
  UnitHealth, 
  MockExamResult,
  Question,
  DailyHabit 
} from '../types';

const STORAGE_KEYS = {
  PROFILE: 'examvault_profile',
  ATTEMPTS: 'examvault_attempts',
  MISTAKES: 'examvault_mistakes',
  STARRED: 'examvault_starred',
  MOCKS: 'examvault_mocks',
  HABITS: 'examvault_habits',
  EXCLUDED: 'examvault_excluded_questions'
};

class StorageService {
  private profile: UserProfile | null = null;

  // Initialize or load user profile
  public getProfile(): UserProfile {
    if (this.profile) return this.profile;

    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (stored) {
      try {
        this.profile = JSON.parse(stored);
        if (this.profile) {
          this.updateLastActive();
          return this.profile;
        }
      } catch {
        // Fallback to fresh profile
      }
    }

    // Create fresh anonymous profile
    const freshProfile: UserProfile = {
      syncId: 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4),
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      streakDays: 1,
      soundEnabled: true,
      hapticEnabled: true
    };

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(freshProfile));
    this.profile = freshProfile;
    return freshProfile;
  }

  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    this.profile = updated;
    return updated;
  }

  private updateLastActive(): void {
    if (!this.profile) return;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor((now - this.profile.lastActiveAt) / oneDayMs);

    if (daysDiff === 1) {
      this.profile.streakDays += 1;
    } else if (daysDiff > 1) {
      this.profile.streakDays = 1;
    }
    this.profile.lastActiveAt = now;
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
  }

  // --- ATTEMPTS & DRILL LOGGING ---

  public getAttempts(): Record<string, UserAttempt> {
    const stored = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  public recordAttempt(attempt: UserAttempt, question: Question): { isMistakePurged: boolean } {
    const attempts = this.getAttempts();
    attempts[attempt.questionId] = attempt;
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    let isMistakePurged = false;

    // Handle Mistake Vault logic
    const mistakes = this.getMistakes();
    const existingMistake = mistakes[question.id];

    if (!attempt.isCorrect) {
      // Question answered incorrectly -> Add/Update Mistake Vault
      if (existingMistake) {
        existingMistake.failCount += 1;
        existingMistake.consecutiveCorrect = 0; // Reset streak on mistake
        existingMistake.lastAttemptedAt = Date.now();
        existingMistake.status = 'active';
      } else {
        mistakes[question.id] = {
          questionId: question.id,
          question,
          failCount: 1,
          consecutiveCorrect: 0,
          firstFailedAt: Date.now(),
          lastAttemptedAt: Date.now(),
          status: 'active'
        };
      }
    } else {
      // Question answered correctly -> check if it was in Mistake Vault
      if (existingMistake && existingMistake.status === 'active') {
        existingMistake.consecutiveCorrect += 1;
        existingMistake.lastAttemptedAt = Date.now();

        // 2x Consecutive Correct Rule: Purge!
        if (existingMistake.consecutiveCorrect >= 2) {
          existingMistake.status = 'conquered';
          isMistakePurged = true;
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
    return { isMistakePurged };
  }

  // --- MISTAKE VAULT ---

  public getMistakes(): Record<string, MistakeItem> {
    const stored = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  public getActiveMistakes(): MistakeItem[] {
    const mistakes = this.getMistakes();
    return Object.values(mistakes).filter(m => m.status === 'active');
  }

  public getConqueredMistakesCount(): number {
    const mistakes = this.getMistakes();
    return Object.values(mistakes).filter(m => m.status === 'conquered').length;
  }

  // --- STARRED DOUBTS ---

  public getStarredDoubts(): Record<string, StarredDoubt> {
    const stored = localStorage.getItem(STORAGE_KEYS.STARRED);
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  public toggleStar(question: Question, notes?: string): boolean {
    const starred = this.getStarredDoubts();
    let isNowStarred = false;
    if (starred[question.id]) {
      delete starred[question.id];
      isNowStarred = false;
    } else {
      starred[question.id] = {
        questionId: question.id,
        question,
        starredAt: Date.now(),
        notes: notes || ''
      };
      isNowStarred = true;
    }
    localStorage.setItem(STORAGE_KEYS.STARRED, JSON.stringify(starred));
    return isNowStarred;
  }

  public updateDoubtNotes(questionId: string, notes: string): void {
    const starred = this.getStarredDoubts();
    if (starred[questionId]) {
      starred[questionId].notes = notes;
      localStorage.setItem(STORAGE_KEYS.STARRED, JSON.stringify(starred));
    }
  }

  public isStarred(questionId: string): boolean {
    const starred = this.getStarredDoubts();
    return !!starred[questionId];
  }

  // --- UNIT HEALTH METERS ---

  public calculateUnitHealth(manifestUnits: { unitId: number; paper: 1 | 2; title: string }[]): UnitHealth[] {
    const attempts = Object.values(this.getAttempts());
    const healthMap: Record<string, { attempted: number; correct: number }> = {};

    for (const att of attempts) {
      const key = `${att.paper}_${att.unitId}`;
      if (!healthMap[key]) {
        healthMap[key] = { attempted: 0, correct: 0 };
      }
      healthMap[key].attempted += 1;
      if (att.isCorrect) {
        healthMap[key].correct += 1;
      }
    }

    return manifestUnits.map(u => {
      const stats = healthMap[`${u.paper}_${u.unitId}`] || { attempted: 0, correct: 0 };
      const accuracy = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
      
      let status: 'safe' | 'warning' | 'leak' = 'warning';
      if (stats.attempted === 0) {
        status = 'warning'; // Unattempted
      } else if (accuracy >= 80) {
        status = 'safe'; // Green
      } else if (accuracy >= 60) {
        status = 'warning'; // Yellow
      } else {
        status = 'leak'; // Red
      }

      return {
        unitId: u.unitId,
        paper: u.paper,
        title: u.title,
        totalAttempted: stats.attempted,
        totalCorrect: stats.correct,
        accuracyPercent: accuracy,
        status
      };
    });
  }

  // --- MOCK EXAMS ---

  public getMockResults(): MockExamResult[] {
    const stored = localStorage.getItem(STORAGE_KEYS.MOCKS);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public recordMockResult(result: MockExamResult): void {
    const mocks = this.getMockResults();
    mocks.unshift(result);
    localStorage.setItem(STORAGE_KEYS.MOCKS, JSON.stringify(mocks));
  }

  public deleteMockResult(id: string): void {
    const mocks = this.getMockResults().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MOCKS, JSON.stringify(mocks));
  }

  // --- HABIT TRACKER ---

  public getTodayHabit(): DailyHabit {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEYS.HABITS);
    let habits: Record<string, DailyHabit> = {};
    if (stored) {
      try {
        habits = JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    if (!habits[today]) {
      habits[today] = {
        date: today,
        morningCommuteDone: false,
        recessMistakeDone: false,
        eveningDrillDone: false,
        mockDone: false
      };
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    }
    return habits[today];
  }

  public updateTodayHabit(updates: Partial<DailyHabit>): DailyHabit {
    const today = new Date().toISOString().split('T')[0];
    const current = this.getTodayHabit();
    const updated = { ...current, ...updates };
    const stored = localStorage.getItem(STORAGE_KEYS.HABITS);
    const habits = stored ? JSON.parse(stored) : {};
    habits[today] = updated;
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    return updated;
  }

  // --- EXCLUDED / REPORTED QUESTIONS ---

  public getExcludedQuestionIds(): Set<string> {
    const stored = localStorage.getItem(STORAGE_KEYS.EXCLUDED);
    if (!stored) return new Set();
    try {
      const arr = JSON.parse(stored);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  public excludeQuestion(questionId: string): void {
    const ids = this.getExcludedQuestionIds();
    ids.add(questionId);
    localStorage.setItem(STORAGE_KEYS.EXCLUDED, JSON.stringify(Array.from(ids)));
  }

  public unexcludeQuestion(questionId: string): void {
    const ids = this.getExcludedQuestionIds();
    ids.delete(questionId);
    localStorage.setItem(STORAGE_KEYS.EXCLUDED, JSON.stringify(Array.from(ids)));
  }

  public isQuestionExcluded(questionId: string): boolean {
    return this.getExcludedQuestionIds().has(questionId);
  }

  // --- SYNC EXPORT & IMPORT ---

  public exportStateJson(): string {
    const state = {
      profile: this.getProfile(),
      attempts: this.getAttempts(),
      mistakes: this.getMistakes(),
      starred: this.getStarredDoubts(),
      mocks: this.getMockResults(),
      habits: localStorage.getItem(STORAGE_KEYS.HABITS) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.HABITS)!) : {},
      excluded: Array.from(this.getExcludedQuestionIds())
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  }

  public importStateJson(encodedState: string): boolean {
    try {
      const raw = decodeURIComponent(escape(atob(encodedState)));
      const state = JSON.parse(raw);
      if (state.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(state.profile));
      if (state.attempts) localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(state.attempts));
      if (state.mistakes) localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(state.mistakes));
      if (state.starred) localStorage.setItem(STORAGE_KEYS.STARRED, JSON.stringify(state.starred));
      if (state.mocks) localStorage.setItem(STORAGE_KEYS.MOCKS, JSON.stringify(state.mocks));
      if (state.habits) localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(state.habits));
      if (state.excluded) localStorage.setItem(STORAGE_KEYS.EXCLUDED, JSON.stringify(state.excluded));
      this.profile = state.profile || null;
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
