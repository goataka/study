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
  questionText: string;
  isCorrect: boolean;
  userAnswerIndex: number;
  correctAnswerIndex: number;
  choices: string[];
  explanation: string;
  categoryName: string;
  /** text-input 問題でユーザーが実際に入力したテキスト */
  userAnswerText?: string;
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

/** 利用者データのエクスポート形式 */
export interface UserDataExport {
  exportedAt: string;
  userName: string | null;
  wrongIds: string[];
  correctStreaks: Record<string, number>;
  masteredIds: string[];
  questionStats: Record<string, { total: number; correct: number }>;
  history: QuizRecord[];
  categoryViewMode: "category" | "grade";
  fontSizeLevel: "small" | "medium" | "large" | null;
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
  loadHistory(): QuizRecord[];
  saveHistory(records: QuizRecord[]): void;
  loadCategoryViewMode(): "category" | "grade";
  saveCategoryViewMode(mode: "category" | "grade"): void;
  loadFontSizeLevel(): "small" | "medium" | "large" | null;
  saveFontSizeLevel(level: "small" | "medium" | "large"): void;
  exportAllData(): UserDataExport;
}
