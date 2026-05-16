/**
 * アプリケーション層のポート（インターフェース） — 依存性逆転の境界。
 * インフラ層の実装に依存せず、このインターフェースを通じてやり取りする。
 */

import type { Question } from "../domain/question";

/** 問題データ取得の抽象インターフェース */
export interface IQuestionRepository {
  loadAll(): Promise<Question[]>;
}

/** 1問分の回答記録 */
export interface QuizRecordEntry {
  questionId: string;
  isCorrect: boolean;
  userAnswerIndex: number;
  /** text-input 問題でユーザーが実際に入力したテキスト */
  userAnswerText?: string;
  /** 回答時点の選択肢テキスト（multiple-choice 用） */
  userAnswerChoiceText?: string;
  /** 回答時点の正解テキスト */
  correctAnswerText?: string;
}

/** 1回のクイズセッションの回答記録 */
export interface QuizRecord {
  id: string;
  date: string;
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  mode: string;
  totalCount: number;
  correctCount: number;
  entries: QuizRecordEntry[];
}

/** クイズ設定（確認タブで選択した問題数・並び順・学習済み含む/含まない） */
export interface QuizSettings {
  questionCount: number;
  quizOrder: "random" | "straight";
  includeMastered: boolean;
}

/** 単元の学習ステージ (0=未学習, 1=学習済, 2=復習済, 3=検定済) */
export type CategoryStage = 0 | 1 | 2 | 3;

/** 単元ごとのステージ記録 */
export interface CategoryStageRecord {
  stage: CategoryStage;
  /** ステージが最後に進んだ日時（ISO 8601 文字列） */
  lastCompletedAt: string;
}

/** 利用者データのエクスポート形式 */
export interface UserDataExport {
  exportedAt: string;
  userName: string | null;
  wrongIds: string[];
  correctStreaks: Record<string, number>;
  masteredIds: string[];
  history: QuizRecord[];
  categoryViewMode: "category" | "grade";
  fontSizeLevel: "small" | "medium" | "large" | null;
  recommendedCounts?: Record<string, number>;
  categoryStages?: Record<string, CategoryStageRecord>;
  globalRecommendedCount?: number;
}

/** 進捗データ永続化の抽象インターフェース */
export interface IProgressRepository {
  loadWrongIds(): string[];
  saveWrongIds(ids: string[]): void;
  loadCorrectStreaks(): Record<string, number>;
  saveCorrectStreaks(streaks: Record<string, number>): void;
  loadMasteredIds(): string[];
  saveMasteredIds(ids: string[]): void;
  loadQuestionStats(): Record<string, { total: number; correct: number }>;
  saveQuestionStats(stats: Record<string, { total: number; correct: number }>): void;
  loadUserName(): string | null;
  saveUserName(name: string): void;
  loadUserAvatar(): string | null;
  saveUserAvatar(dataUrl: string): void;
  loadHistory(): QuizRecord[];
  saveHistory(records: QuizRecord[]): void;
  loadCategoryViewMode(): "category" | "grade";
  saveCategoryViewMode(mode: "category" | "grade"): void;
  loadFontSizeLevel(): "small" | "medium" | "large" | null;
  saveFontSizeLevel(level: "small" | "medium" | "large"): void;
  loadShareUrl(): string;
  saveShareUrl(url: string): void;
  loadQuizSettings(): QuizSettings;
  saveQuizSettings(settings: QuizSettings): void;
  loadRecommendedCounts(): Record<string, number>;
  saveRecommendedCounts(counts: Record<string, number>): void;
  loadCategoryStages(): Record<string, CategoryStageRecord>;
  saveCategoryStages(stages: Record<string, CategoryStageRecord>): void;
  loadGlobalRecommendedCount(): number;
  saveGlobalRecommendedCount(count: number): void;
  exportAllData(): UserDataExport;
  clearAllData(): Promise<void>;
}
