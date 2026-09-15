import { Question, Manifest, DrillConfig } from '../types';
import { storageService } from './storageService';

class QuestionService {
  private manifest: Manifest | null = null;
  private unitCache: Map<string, Question[]> = new Map();

  // Shuffle helper using Fisher-Yates
  private shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Intelligent Question Sampler:
  // 1. Prioritizes 100% UNSEEN questions (questions user has never answered).
  // 2. If unseen questions are exhausted, cycles through the OLDEST attempted questions (spaced repetition).
  // 3. Shuffles thoroughly so every session is unpredictable and fresh.
  private sampleIntelligently(
    pool: Question[],
    targetCount: number,
    attempts: Record<string, any>
  ): Question[] {
    if (pool.length <= targetCount) {
      return this.shuffle(pool);
    }

    const unseen: Question[] = [];
    const seen: { question: Question; timestamp: number }[] = [];

    for (const q of pool) {
      const attempt = attempts[q.id];
      if (!attempt) {
        unseen.push(q);
      } else {
        seen.push({ question: q, timestamp: attempt.timestamp || 0 });
      }
    }

    // Case 1: We have enough brand-new unseen questions
    if (unseen.length >= targetCount) {
      return this.shuffle(unseen).slice(0, targetCount);
    }

    // Case 2: We need to pull all unseen questions, then fill remainder with oldest-seen questions
    const selected: Question[] = this.shuffle(unseen);
    const needed = targetCount - selected.length;

    // Sort seen questions by timestamp ASC (oldest attempted first -> spaced repetition)
    seen.sort((a, b) => a.timestamp - b.timestamp);

    // Take the oldest seen questions and add them
    const oldestSeen = seen.slice(0, needed).map(s => s.question);
    selected.push(...oldestSeen);

    return this.shuffle(selected);
  }

  // Load manifest.json (Network-fresh with fallback)
  public async getManifest(): Promise<Manifest> {
    if (this.manifest) return this.manifest;
    try {
      const res = await fetch('/data/manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load manifest');
      this.manifest = await res.json();
      return this.manifest!;
    } catch (err) {
      console.error('Error fetching manifest:', err);
      return {
        version: '1.0.0',
        generatedAt: '',
        totalQuestions: 0,
        totalPaper2: 0,
        totalPaper1: 0,
        units: []
      };
    }
  }

  // Load a single unit file (e.g. "p2_unit01.json")
  public async loadUnitQuestions(fileName: string): Promise<Question[]> {
    if (this.unitCache.has(fileName)) {
      return this.unitCache.get(fileName)!;
    }
    try {
      const res = await fetch(`/data/${fileName}`);
      if (!res.ok) throw new Error(`Failed to load ${fileName}`);
      const questions: Question[] = await res.json();
      this.unitCache.set(fileName, questions);
      return questions;
    } catch (err) {
      console.error(`Error loading unit questions for ${fileName}:`, err);
      return [];
    }
  }

  // Generate an intelligent custom drill session based on user configuration
  public async generateDrillQuestions(config: DrillConfig): Promise<Question[]> {
    const manifest = await this.getManifest();
    const attempts = storageService.getAttempts();

    // Determine candidate unit files
    const matchingUnitFiles = manifest.units.filter(u => {
      if (config.paper !== 'mixed' && u.paper !== config.paper) return false;
      if (config.selectedUnits.length > 0 && !config.selectedUnits.includes(u.unitId)) return false;
      return true;
    });

    if (matchingUnitFiles.length === 0) {
      return [];
    }

    // Load all selected unit questions in parallel
    const unitQuestionArrays = await Promise.all(
      matchingUnitFiles.map(u => this.loadUnitQuestions(u.fileName))
    );

    // Combine pool
    let combinedPool: Question[] = [];
    unitQuestionArrays.forEach(arr => {
      combinedPool = combinedPool.concat(arr);
    });

    if (combinedPool.length === 0) return [];

    // Determine target count: either explicit count OR time-budget calculated (~1.25 mins per question)
    let targetCount = config.targetCount;
    if (config.targetMode === 'time') {
      targetCount = Math.max(5, Math.round(config.targetMinutes / 1.25));
    }

    // Intelligent selection prioritizing unseen questions & spaced repetition
    return this.sampleIntelligently(combinedPool, targetCount, attempts);
  }

  // Generate authentic NTA CBT Mock Exam:
  // Paper 1: 50 Questions (5 per unit across all 10 units)
  // Paper 2: 100 Questions (10 per unit across all 10 units)
  // Intelligent selection guarantees unseen questions first in each unit!
  public async generateMockExam(paper: 1 | 2): Promise<Question[]> {
    const manifest = await this.getManifest();
    const attempts = storageService.getAttempts();
    const paperUnits = manifest.units.filter(u => u.paper === paper);

    const questionsPerUnit = paper === 1 ? 5 : 10;
    const allUnitQuestions = await Promise.all(
      paperUnits.map(u => this.loadUnitQuestions(u.fileName))
    );

    let mockSet: Question[] = [];

    // Select authentic question quota from each unit using intelligent sampler
    allUnitQuestions.forEach((unitPool) => {
      if (unitPool.length === 0) return;
      const sampled = this.sampleIntelligently(unitPool, questionsPerUnit, attempts);
      mockSet = mockSet.concat(sampled);
    });

    // If still less than target (e.g. 50 or 100), fill from remaining pool
    const targetTotal = paper === 1 ? 50 : 100;
    if (mockSet.length < targetTotal) {
      const remainingPool = allUnitQuestions.flat().filter(q => !mockSet.some(m => m.id === q.id));
      const needed = targetTotal - mockSet.length;
      const extra = this.sampleIntelligently(remainingPool, needed, attempts);
      mockSet = mockSet.concat(extra);
    }

    // Return randomized order for authentic exam simulation
    return this.shuffle(mockSet).slice(0, targetTotal);
  }

  // Retrieve Mistake Vault questions for a practice session
  public getMistakeQuestions(paperFilter?: 1 | 2, unitFilter?: number): Question[] {
    const activeMistakes = storageService.getActiveMistakes();
    let filtered = activeMistakes.map(m => m.question);

    if (paperFilter) {
      filtered = filtered.filter(q => q.paper === paperFilter);
    }
    if (unitFilter) {
      filtered = filtered.filter(q => q.unitId === unitFilter);
    }

    return filtered.sort(() => Math.random() - 0.5);
  }
}

export const questionService = new QuestionService();
