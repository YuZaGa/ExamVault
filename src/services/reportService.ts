import { Question, ReportedQuestion, ReportReason } from '../types';
import { storageService } from './storageService';

const SUPABASE_URL = ((import.meta.env?.VITE_SUPABASE_URL as string | undefined) || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

class ReportService {
  public isConfigured(): boolean {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  private getHeaders(): HeadersInit {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // Submit a broken question report:
  // 1. Instantly excludes it on the user's phone
  // 2. Silently inserts a row into Supabase
  public async submitReport(
    question: Question,
    reason: ReportReason,
    details?: string
  ): Promise<boolean> {
    // 1. Exclude locally right away
    storageService.excludeQuestion(question.id);

    if (!this.isConfigured()) {
      return true;
    }

    // 2. Post to Supabase cloud
    try {
      const payload = {
        question_id: question.id,
        paper: question.paper,
        unit_id: question.unitId,
        unit_title: question.unitTitle || '',
        shift: question.shift || '',
        reason,
        details: details?.trim() || null,
        question_text: question.questionText,
        correct_option: question.correctOption,
        options: question.options,
        status: 'pending',
        reported_at: new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/reported_questions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      return res.ok;
    } catch (err) {
      console.warn('Network error logging report to cloud (excluded locally):', err);
      return false;
    }
  }

  // Fetch pending reports for Admin review
  public async fetchPendingReports(): Promise<ReportedQuestion[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reported_questions?status=eq.pending&order=reported_at.desc`,
        {
          headers: this.getHeaders()
        }
      );
      if (!res.ok) throw new Error('Failed to fetch pending reports');
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        questionId: d.question_id,
        paper: d.paper,
        unitId: d.unit_id,
        unitTitle: d.unit_title,
        shift: d.shift,
        reason: d.reason,
        details: d.details,
        questionText: d.question_text,
        correctOption: d.correct_option,
        options: d.options,
        status: d.status,
        reportedAt: d.reported_at,
        resolvedAt: d.resolved_at
      }));
    } catch (err) {
      console.error('Error fetching pending reports:', err);
      return [];
    }
  }

  // Fetch resolved reports for Admin history
  public async fetchResolvedReports(): Promise<ReportedQuestion[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reported_questions?status=eq.resolved&order=resolved_at.desc&limit=50`,
        {
          headers: this.getHeaders()
        }
      );
      if (!res.ok) throw new Error('Failed to fetch resolved reports');
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        questionId: d.question_id,
        paper: d.paper,
        unitId: d.unit_id,
        unitTitle: d.unit_title,
        shift: d.shift,
        reason: d.reason,
        details: d.details,
        questionText: d.question_text,
        correctOption: d.correct_option,
        options: d.options,
        status: d.status,
        reportedAt: d.reported_at,
        resolvedAt: d.resolved_at
      }));
    } catch (err) {
      console.error('Error fetching resolved reports:', err);
      return [];
    }
  }

  // Admin approves fix & restores question:
  // ONLY called when Admin physically clicks "Approve Fix & Restore to Pack" on /admin
  public async approveAndResolve(reportId: string, questionId: string): Promise<boolean> {
    storageService.unexcludeQuestion(questionId);
    if (!this.isConfigured()) return true;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reported_questions?id=eq.${reportId}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
        }
      );

      return res.ok;
    } catch (err) {
      console.error('Error approving report:', err);
      return false;
    }
  }

  // Client-side Auto-Restoration:
  // Runs silently on student's phone to un-exclude any questions that Admin has approved
  public async checkAndRestoreApprovedFixes(): Promise<string[]> {
    const excludedIds = storageService.getExcludedQuestionIds();
    if (excludedIds.size === 0 || !this.isConfigured()) return [];

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reported_questions?status=eq.resolved&select=question_id`,
        {
          headers: this.getHeaders()
        }
      );
      if (!res.ok) return [];
      const data: { question_id: string }[] = await res.json();
      const resolvedSet = new Set(data.map(d => d.question_id));

      const restored: string[] = [];
      for (const id of excludedIds) {
        if (resolvedSet.has(id)) {
          storageService.unexcludeQuestion(id);
          restored.push(id);
        }
      }

      return restored;
    } catch {
      return [];
    }
  }
}

export const reportService = new ReportService();
