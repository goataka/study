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

/** ユーザープロフィール（複数ユーザー対応） */
export interface UserProfile {
  /** ユーザー識別子。既定（ゲスト）は "guest"。 */
  id: string;
  /** 表示名。 */
  name: string;
}

/** ゲストユーザーの固定 ID。 */
export const GUEST_USER_ID = "guest";
/** ゲストユーザーの既定表示名。 */
export const GUEST_USER_NAME = "ゲスト";

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

/** 全ユーザーをまとめてエクスポートする形式（一括管理用） */
export interface MultiUserDataExport {
  exportedAt: string;
  /** エクスポート時点でアクティブなユーザー ID。 */
  activeUserId: string;
  /** ユーザーごとの ID・名前・データ。 */
  users: Array<{ id: string; name: string; data: UserDataExport }>;
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
  // ─── 複数ユーザー対応 ──────────────────────────────────────────────
  /** 登録済みユーザー一覧を返す（先頭は常にゲスト）。 */
  listUsers(): UserProfile[];
  /** 現在アクティブなユーザー ID を返す。 */
  getActiveUserId(): string;
  /** 新しいユーザーを作成して返す（切り替えは行わない）。 */
  addUser(name: string): UserProfile;
  /** アクティブユーザーを切り替え、そのユーザーのデータを読み込む。 */
  switchUser(id: string): Promise<void>;
  /** 指定ユーザーを削除し、そのデータを消去する（ゲストは削除不可）。 */
  deleteUser(id: string): Promise<void>;
  /** アクティブユーザーのデータのみを消去する（個別管理用）。 */
  clearActiveUserData(): Promise<void>;
  /** 全ユーザーのデータをまとめてエクスポートする（一括管理用）。 */
  exportAllUsersData(): Promise<MultiUserDataExport>;
}
