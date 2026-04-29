/**
 * IndexedDBProgressRepository — IndexedDBを使って進捗データを永続化する。
 * IProgressRepository の実装。
 *
 * 書き込みキャッシュ（Write-through cache）パターンを採用する。
 * - 読み込みはメモリキャッシュから同期的に行う
 * - 書き込みはキャッシュを即時更新し、IndexedDB への永続化は非同期で行う
 * - initialize() を呼び出すことで IndexedDB からキャッシュを初期化する
 */

import type { IProgressRepository, QuizRecord, UserDataExport } from "../application/ports";

const DB_NAME = "studyProgressDB";
const DB_VERSION = 1;
const STORE_NAME = "keyValue";

const KEY_WRONG_QUESTIONS = "wrongQuestions";
const KEY_CORRECT_STREAKS = "correctStreaks";
const KEY_MASTERED_IDS = "masteredIds";
const KEY_QUESTION_STATS = "questionStats";
const KEY_USER_NAME = "userName";
const KEY_QUIZ_HISTORY = "quizHistory";
const KEY_CATEGORY_VIEW_MODE = "categoryViewMode";
const KEY_FONT_SIZE_LEVEL = "fontSizeLevel";
const KEY_SHARE_URL = "overallShareUrl";

/** 保存する履歴の最大件数 */
const MAX_HISTORY = 100;

/** メモリキャッシュの型 */
interface ProgressCache {
  wrongQuestions: string[];
  correctStreaks: Record<string, number>;
  masteredIds: string[];
  questionStats: Record<string, { total: number; correct: number }>;
  userName: string | null;
  quizHistory: QuizRecord[];
  categoryViewMode: "category" | "grade";
  fontSizeLevel: "small" | "medium" | "large" | null;
  shareUrl: string;
}

/** プレーンオブジェクト（null 非許容、配列非許容）かどうかを判定する型ガード */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class IndexedDBProgressRepository implements IProgressRepository {
  private db: IDBDatabase | null = null;
  private cache: ProgressCache = IndexedDBProgressRepository.defaultCache();

  private static defaultCache(): ProgressCache {
    return {
      wrongQuestions: [],
      correctStreaks: {},
      masteredIds: [],
      questionStats: {},
      userName: null,
      quizHistory: [],
      categoryViewMode: "category",
      fontSizeLevel: null,
      shareUrl: "",
    };
  }

  /**
   * IndexedDB を開き、すべてのデータをキャッシュに読み込む。
   * アプリ起動時に一度だけ呼び出すこと。
   */
  async initialize(): Promise<void> {
    try {
      this.db = await this.openDB();
      this.cache = await this.loadAllFromDB();
    } catch (error) {
      console.error("IndexedDB の初期化に失敗しました（メモリのみで動作します）:", error);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private getFromDB(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(undefined);
        return;
      }
      const request = this.db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadAllFromDB(): Promise<ProgressCache> {
    const cache = IndexedDBProgressRepository.defaultCache();

    const [
      wrongQuestions,
      correctStreaks,
      masteredIds,
      questionStats,
      userName,
      quizHistory,
      categoryViewMode,
      fontSizeLevel,
      shareUrl,
    ] = await Promise.all([
      this.getFromDB(KEY_WRONG_QUESTIONS),
      this.getFromDB(KEY_CORRECT_STREAKS),
      this.getFromDB(KEY_MASTERED_IDS),
      this.getFromDB(KEY_QUESTION_STATS),
      this.getFromDB(KEY_USER_NAME),
      this.getFromDB(KEY_QUIZ_HISTORY),
      this.getFromDB(KEY_CATEGORY_VIEW_MODE),
      this.getFromDB(KEY_FONT_SIZE_LEVEL),
      this.getFromDB(KEY_SHARE_URL),
    ]);

    if (Array.isArray(wrongQuestions)) {
      cache.wrongQuestions = wrongQuestions as string[];
    }
    if (isPlainObject(correctStreaks)) {
      cache.correctStreaks = correctStreaks as Record<string, number>;
    }
    if (Array.isArray(masteredIds)) {
      cache.masteredIds = masteredIds as string[];
    }
    if (isPlainObject(questionStats)) {
      cache.questionStats = this.normalizeStats(questionStats);
    }
    if (typeof userName === "string") {
      cache.userName = userName;
    }
    if (Array.isArray(quizHistory)) {
      cache.quizHistory = quizHistory as QuizRecord[];
    }
    if (categoryViewMode === "grade") {
      cache.categoryViewMode = "grade";
    }
    if (fontSizeLevel === "small" || fontSizeLevel === "medium" || fontSizeLevel === "large") {
      cache.fontSizeLevel = fontSizeLevel;
    }
    if (typeof shareUrl === "string") {
      cache.shareUrl = shareUrl;
    }

    return cache;
  }

  /** 壊れたデータや旧形式を検証して正規化する */
  private normalizeStats(
    raw: Record<string, unknown>
  ): Record<string, { total: number; correct: number }> {
    const normalized: Record<string, { total: number; correct: number }> = {};
    for (const [id, val] of Object.entries(raw)) {
      if (val !== null && typeof val === "object") {
        const { total, correct } = val as Record<string, unknown>;
        normalized[id] = {
          total:
            Number.isFinite(total) && (total as number) >= 0
              ? Math.trunc(total as number)
              : 0,
          correct:
            Number.isFinite(correct) && (correct as number) >= 0
              ? Math.trunc(correct as number)
              : 0,
        };
      }
    }
    return normalized;
  }

  /** キャッシュを更新し、IndexedDB に非同期で書き込む */
  private persistKey(key: string, value: unknown): void {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.onerror = (event) => {
        console.error(
          `IndexedDB 書き込みエラー (${key}):`,
          (event.target as IDBTransaction).error
        );
      };
    } catch (error) {
      console.error(`IndexedDB 書き込みエラー (${key}):`, error);
    }
  }

  // ─── IProgressRepository 実装 ───────────────────────────────────────────────

  loadWrongIds(): string[] {
    return this.cache.wrongQuestions;
  }

  saveWrongIds(ids: string[]): void {
    this.cache.wrongQuestions = ids;
    this.persistKey(KEY_WRONG_QUESTIONS, ids);
  }

  loadCorrectStreaks(): Record<string, number> {
    return this.cache.correctStreaks;
  }

  saveCorrectStreaks(streaks: Record<string, number>): void {
    this.cache.correctStreaks = streaks;
    this.persistKey(KEY_CORRECT_STREAKS, streaks);
  }

  loadMasteredIds(): string[] {
    return this.cache.masteredIds;
  }

  saveMasteredIds(ids: string[]): void {
    this.cache.masteredIds = ids;
    this.persistKey(KEY_MASTERED_IDS, ids);
  }

  loadQuestionStats(): Record<string, { total: number; correct: number }> {
    return this.cache.questionStats;
  }

  saveQuestionStats(stats: Record<string, { total: number; correct: number }>): void {
    this.cache.questionStats = stats;
    this.persistKey(KEY_QUESTION_STATS, stats);
  }

  loadUserName(): string | null {
    return this.cache.userName;
  }

  saveUserName(name: string): void {
    this.cache.userName = name;
    this.persistKey(KEY_USER_NAME, name);
  }

  loadHistory(): QuizRecord[] {
    return this.cache.quizHistory;
  }

  saveHistory(records: QuizRecord[]): void {
    const trimmed = records.slice(0, MAX_HISTORY);
    this.cache.quizHistory = trimmed;
    this.persistKey(KEY_QUIZ_HISTORY, trimmed);
  }

  loadCategoryViewMode(): "category" | "grade" {
    return this.cache.categoryViewMode;
  }

  saveCategoryViewMode(mode: "category" | "grade"): void {
    this.cache.categoryViewMode = mode;
    this.persistKey(KEY_CATEGORY_VIEW_MODE, mode);
  }

  loadFontSizeLevel(): "small" | "medium" | "large" | null {
    return this.cache.fontSizeLevel;
  }

  saveFontSizeLevel(level: "small" | "medium" | "large"): void {
    this.cache.fontSizeLevel = level;
    this.persistKey(KEY_FONT_SIZE_LEVEL, level);
  }

  loadShareUrl(): string {
    return this.cache.shareUrl;
  }

  saveShareUrl(url: string): void {
    this.cache.shareUrl = url;
    this.persistKey(KEY_SHARE_URL, url);
  }

  exportAllData(): UserDataExport {
    return {
      exportedAt: new Date().toISOString(),
      userName: this.loadUserName(),
      wrongIds: this.loadWrongIds(),
      correctStreaks: this.loadCorrectStreaks(),
      masteredIds: this.loadMasteredIds(),
      questionStats: this.loadQuestionStats(),
      history: this.loadHistory(),
      categoryViewMode: this.loadCategoryViewMode(),
      fontSizeLevel: this.loadFontSizeLevel(),
    };
  }
}
