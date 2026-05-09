/**
 * QuizUseCase 仕様テスト用の共通テストダブル（スタブ）。
 *
 * `application/ports.ts` のインターフェースを満たす最小限のインメモリ実装を提供し、
 * 各仕様テストファイルから再利用する。
 */

import type { IQuestionRepository, IProgressRepository, QuizRecord, QuizSettings, UserDataExport } from "../ports";
import type { Question } from "../../domain/question";

export const makeQuestion = (id: string, subject = "english", category = "phonics"): Question => ({
  id,
  question: `Q ${id}`,
  choices: ["A", "B", "C", "D"],
  correct: 0,
  explanation: `Exp ${id}`,
  subject,
  subjectName: subject === "english" ? "英語" : "数学",
  category,
  categoryName: category,
});

export const makeQuestionWithGuide = (id: string, subject: string, category: string, guideUrl: string): Question => ({
  ...makeQuestion(id, subject, category),
  guideUrl,
});

export class StubQuestionRepository implements IQuestionRepository {
  constructor(private readonly questions: Question[]) {}
  async loadAll(): Promise<Question[]> {
    return this.questions;
  }
}

export class StubProgressRepository implements IProgressRepository {
  private ids: string[];
  private history: QuizRecord[];
  private streaks: Record<string, number>;
  private stats: Record<string, { total: number; correct: number }>;
  private masteredIds: string[];
  constructor(
    initialIds: string[] = [],
    initialHistory: QuizRecord[] = [],
    initialStreaks: Record<string, number> = {},
    initialStats: Record<string, { total: number; correct: number }> = {},
    initialMasteredIds: string[] = [],
  ) {
    this.ids = [...initialIds];
    this.history = [...initialHistory];
    this.streaks = { ...initialStreaks };
    this.stats = { ...initialStats };
    this.masteredIds = [...initialMasteredIds];
  }
  loadWrongIds(): string[] {
    return [...this.ids];
  }
  saveWrongIds(ids: string[]): void {
    this.ids = [...ids];
  }
  getStoredIds(): string[] {
    return [...this.ids];
  }
  loadCorrectStreaks(): Record<string, number> {
    return { ...this.streaks };
  }
  saveCorrectStreaks(streaks: Record<string, number>): void {
    this.streaks = { ...streaks };
  }
  getStoredStreaks(): Record<string, number> {
    return { ...this.streaks };
  }
  loadMasteredIds(): string[] {
    return [...this.masteredIds];
  }
  saveMasteredIds(ids: string[]): void {
    this.masteredIds = [...ids];
  }
  getStoredMasteredIds(): string[] {
    return [...this.masteredIds];
  }
  loadUserName(): string | null {
    return null;
  }
  saveUserName(_name: string): void {}
  loadHistory() {
    return [...this.history];
  }
  saveHistory(records: QuizRecord[]): void {
    this.history = [...records];
  }
  getStoredHistory(): QuizRecord[] {
    return [...this.history];
  }
  loadCategoryViewMode(): "category" | "grade" {
    return "category";
  }
  saveCategoryViewMode(_mode: "category" | "grade"): void {}
  loadFontSizeLevel(): "small" | "medium" | "large" | null {
    return null;
  }
  saveFontSizeLevel(_level: "small" | "medium" | "large"): void {}
  loadQuestionStats(): Record<string, { total: number; correct: number }> {
    return { ...this.stats };
  }
  saveQuestionStats(stats: Record<string, { total: number; correct: number }>): void {
    this.stats = { ...stats };
  }
  getStoredStats(): Record<string, { total: number; correct: number }> {
    return { ...this.stats };
  }
  exportAllData(): UserDataExport {
    return {
      exportedAt: new Date().toISOString(),
      userName: null,
      wrongIds: this.loadWrongIds(),
      correctStreaks: this.loadCorrectStreaks(),
      masteredIds: this.loadMasteredIds(),
      history: this.loadHistory(),
      categoryViewMode: "category",
      fontSizeLevel: null,
    };
  }
  loadShareUrl(): string {
    return "";
  }
  saveShareUrl(_url: string): void {}
  loadUserAvatar(): string | null {
    return null;
  }
  saveUserAvatar(_dataUrl: string): void {}
  loadQuizSettings(): QuizSettings {
    return { questionCount: 10, quizOrder: "random", includeMastered: false };
  }
  saveQuizSettings(_settings: QuizSettings): void {}
  async clearAllData(): Promise<void> {
    this.ids = [];
    this.history = [];
    this.streaks = {};
    this.stats = {};
    this.masteredIds = [];
  }
}
