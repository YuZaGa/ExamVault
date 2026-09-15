import { Question, Manifest, DrillConfig } from '../types';
import { storageService } from './storageService';

class QuestionService {
  private manifest: Manifest | null = null;
  private unitCache: Map<string, Question[]> = new Map();

  // Load manifest.json
  public async getManifest(): Promise<Manifest> {
    if (this.manifest) return this.manifest;
    try {
      const res = await fetch('/data/manifest.json');
      if (!res.ok) throw new Error('Failed to load manifest');
      this.manifest = await res.json();
      return this.manifest!;
    } catch (err) {
      console.error('Error fetching manifest:', err);
      // Fallback empty manifest
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

  // Generate a custom drill session based on user configuration
  public async generateDrillQuestions(config: DrillConfig): Promise<Question[]> {
    const manifest = await this.getManifest();

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

    // Flatten and shuffle
    let combinedPool: Question[] = [];
    unitQuestionArrays.forEach(arr => {
      combinedPool = combinedPool.concat(arr);
    });

    if (combinedPool.length === 0) return [];

    // Shuffle pool using Fisher-Yates
    const shuffled = [...combinedPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Determine target count: either explicit count OR time-budget calculated (~1.25 mins per question)
    let targetCount = config.targetCount;
    if (config.targetMode === 'time') {
      // 25 mins -> ~20 questions, 15 mins -> 12 questions, etc.
      targetCount = Math.max(5, Math.round(config.targetMinutes / 1.25));
    }

    return shuffled.slice(0, targetCount);
  }

  // Generate authentic NTA CBT Mock Exam:
  // Paper 1: 50 Questions (5 per unit across all 10 units)
  // Paper 2: 100 Questions (10 per unit across all 10 units)
  public async generateMockExam(paper: 1 | 2): Promise<Question[]> {
    const manifest = await this.getManifest();
    const paperUnits = manifest.units.filter(u => u.paper === paper);

    const questionsPerUnit = paper === 1 ? 5 : 10;
    const allUnitQuestions = await Promise.all(
      paperUnits.map(u => this.loadUnitQuestions(u.fileName))
    );

    let mockSet: Question[] = [];

    allUnitQuestions.forEach((unitPool) => {
      if (unitPool.length === 0) return;
      const shuffled = [...unitPool].sort(() => Math.random() - 0.5);
      mockSet = mockSet.concat(shuffled.slice(0, questionsPerUnit));
    });

    // If still less than target (e.g. 50 or 100), fill from random pool
    const targetTotal = paper === 1 ? 50 : 100;
    if (mockSet.length < targetTotal) {
      const remainingPool = allUnitQuestions.flat().filter(q => !mockSet.some(m => m.id === q.id));
      const needed = targetTotal - mockSet.length;
      mockSet = mockSet.concat(remainingPool.sort(() => Math.random() - 0.5).slice(0, needed));
    }

    // Return randomized order
    return mockSet.sort(() => Math.random() - 0.5).slice(0, targetTotal);
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
