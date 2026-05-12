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
  private recommendedCounts: Record<string, number>;
  private userName: string | null = null;
  private userAvatar: string | null = null;
  private categoryViewMode: "category" | "grade" = "category";
  private fontSizeLevel: "small" | "medium" | "large" | null = null;
  private shareUrl: string = "";
  private quizSettings: QuizSettings = { questionCount: 10, quizOrder: "random", includeMastered: false };
  constructor(
    initialIds: string[] = [],
    initialHistory: QuizRecord[] = [],
    initialStreaks: Record<string, number> = {},
    initialStats: Record<string, { total: number; correct: number }> = {},
    initialMasteredIds: string[] = [],
    initialRecommendedCounts: Record<string, number> = {},
  ) {
    this.ids = [...initialIds];
    this.history = [...initialHistory];
    this.streaks = { ...initialStreaks };
    this.stats = { ...initialStats };
    this.masteredIds = [...initialMasteredIds];
    this.recommendedCounts = { ...initialRecommendedCounts };
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
    return this.userName;
  }
  saveUserName(name: string): void {
    this.userName = name;
  }
  loadUserAvatar(): string | null {
    return this.userAvatar;
  }
  saveUserAvatar(dataUrl: string): void {
    this.userAvatar = dataUrl;
  }
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
    return this.categoryViewMode;
  }
  saveCategoryViewMode(mode: "category" | "grade"): void {
    this.categoryViewMode = mode;
  }
  loadFontSizeLevel(): "small" | "medium" | "large" | null {
    return this.fontSizeLevel;
  }
  saveFontSizeLevel(level: "small" | "medium" | "large"): void {
    this.fontSizeLevel = level;
  }
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
      userName: this.userName,
      wrongIds: this.loadWrongIds(),
      correctStreaks: this.loadCorrectStreaks(),
      masteredIds: this.loadMasteredIds(),
      history: this.loadHistory(),
      categoryViewMode: this.categoryViewMode,
      fontSizeLevel: this.fontSizeLevel,
    };
  }
  loadShareUrl(): string {
    return this.shareUrl;
  }
  saveShareUrl(url: string): void {
    this.shareUrl = url;
  }
  loadQuizSettings(): QuizSettings {
    return { ...this.quizSettings };
  }
  saveQuizSettings(settings: QuizSettings): void {
    this.quizSettings = { ...settings };
  }
  loadRecommendedCounts(): Record<string, number> {
    return { ...this.recommendedCounts };
  }
  saveRecommendedCounts(counts: Record<string, number>): void {
    this.recommendedCounts = { ...counts };
  }
  async clearAllData(): Promise<void> {
    this.ids = [];
    this.history = [];
    this.streaks = {};
    this.stats = {};
    this.masteredIds = [];
    this.recommendedCounts = {};
    this.userName = null;
    this.userAvatar = null;
    this.categoryViewMode = "category";
    this.fontSizeLevel = null;
    this.shareUrl = "";
    this.quizSettings = { questionCount: 10, quizOrder: "random", includeMastered: false };
  }
}
