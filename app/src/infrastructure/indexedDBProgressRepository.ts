/**
 * IndexedDBProgressRepository — IndexedDBを使って進捗データを永続化する。
 * IProgressRepository の実装。
 *
 * 書き込みキャッシュ（Write-through cache）パターンを採用する。
 * - 読み込みはメモリキャッシュから同期的に行う
 * - 書き込みはキャッシュを即時更新し、IndexedDB への永続化は非同期で行う
 * - initialize() を呼び出すことで IndexedDB からキャッシュを初期化する
 */

import type { IProgressRepository, QuizRecord, QuizSettings, UserDataExport } from "../application/ports";

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
const KEY_QUIZ_SETTINGS = "quizSettings";
const KEY_RECOMMENDED_COUNTS = "recommendedCounts";

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
  quizSettings: QuizSettings;
  recommendedCounts: Record<string, number>;
}

/** プレーンオブジェクト（null 非許容、配列非許容）かどうかを判定する型ガード */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class IndexedDBProgressRepository implements IProgressRepository {
  private db: IDBDatabase | null = null;
  private cache: ProgressCache = IndexedDBProgressRepository.defaultCache();
  /** 進行中の書き込みトランザクション Promise を追跡する（テスト用 flush のため） */
  private pendingWrites: Promise<void>[] = [];

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
      quizSettings: { questionCount: 10, quizOrder: "random", includeMastered: false },
      recommendedCounts: {},
    };
  }

  /**
   * IndexedDB を開き、すべてのデータをキャッシュに読み込む。
   * アプリ起動時に一度だけ呼び出すこと。
   */
  async initialize(): Promise<void> {
    try {
      this.db = await this.openDB();
      this.cache = await this.loadAllFromDB(this.db);
    } catch (error) {
      console.error("IndexedDB の初期化に失敗しました（メモリのみで動作します）:", error);
    }
  }

  /**
   * 進行中のすべての書き込みが完了するまで待機する。
   * 主にテストで使用する。
   */
  async flush(): Promise<void> {
    await Promise.all(this.pendingWrites);
    this.pendingWrites = [];
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB のオープンに失敗しました"));
      };
    });
  }

  /** 1 つの readonly トランザクションで全キーを一括読み込みする */
  private async loadAllFromDB(db: IDBDatabase): Promise<ProgressCache> {
    const cache = IndexedDBProgressRepository.defaultCache();

    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const getValue = (key: string): Promise<unknown> =>
      new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
          reject(req.error ?? new Error(`IndexedDB から ${key} の取得に失敗しました`));
      });

    const transactionDone = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("IndexedDB の読み込みトランザクションに失敗しました"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("IndexedDB の読み込みトランザクションが中断されました"));
    });

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
      quizSettings,
      recommendedCounts,
    ] = await Promise.all([
      getValue(KEY_WRONG_QUESTIONS),
      getValue(KEY_CORRECT_STREAKS),
      getValue(KEY_MASTERED_IDS),
      getValue(KEY_QUESTION_STATS),
      getValue(KEY_USER_NAME),
      getValue(KEY_QUIZ_HISTORY),
      getValue(KEY_CATEGORY_VIEW_MODE),
      getValue(KEY_FONT_SIZE_LEVEL),
      getValue(KEY_SHARE_URL),
      getValue(KEY_QUIZ_SETTINGS),
      getValue(KEY_RECOMMENDED_COUNTS),
    ]);

    await transactionDone;

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
    if (isPlainObject(quizSettings)) {
      const qs = quizSettings as Record<string, unknown>;
      cache.quizSettings = {
        questionCount: typeof qs.questionCount === "number" ? qs.questionCount : 10,
        quizOrder: qs.quizOrder === "straight" ? "straight" : "random",
        includeMastered: typeof qs.includeMastered === "boolean" ? qs.includeMastered : false,
      };
    }
    if (isPlainObject(recommendedCounts)) {
      const result: Record<string, number> = {};
      for (const [k, v] of Object.entries(recommendedCounts as Record<string, unknown>)) {
        if (typeof v === "number" && v > 0) result[k] = v;
      }
      cache.recommendedCounts = result;
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
    const writePromise = new Promise<void>((resolve, reject) => {
      try {
        const tx = (this.db as IDBDatabase).transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          console.error(`IndexedDB 書き込みエラー (${key}):`, tx.error);
          reject(tx.error);
        };
      } catch (error) {
        console.error(`IndexedDB 書き込みエラー (${key}):`, error);
        reject(error);
      }
    });
    this.pendingWrites.push(writePromise.catch(() => undefined));
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

  loadQuizSettings(): QuizSettings {
    return this.cache.quizSettings;
  }

  saveQuizSettings(settings: QuizSettings): void {
    this.cache.quizSettings = settings;
    this.persistKey(KEY_QUIZ_SETTINGS, settings);
  }

  loadRecommendedCounts(): Record<string, number> {
    return this.cache.recommendedCounts;
  }

  saveRecommendedCounts(counts: Record<string, number>): void {
    this.cache.recommendedCounts = counts;
    this.persistKey(KEY_RECOMMENDED_COUNTS, counts);
  }

  exportAllData(): UserDataExport {
    return {
      exportedAt: new Date().toISOString(),
      userName: this.loadUserName(),
      wrongIds: this.loadWrongIds(),
      correctStreaks: this.loadCorrectStreaks(),
      masteredIds: this.loadMasteredIds(),
      history: this.loadHistory(),
      categoryViewMode: this.loadCategoryViewMode(),
      fontSizeLevel: this.loadFontSizeLevel(),
      recommendedCounts: this.loadRecommendedCounts(),
    };
  }

  async clearAllData(): Promise<void> {
    // キャッシュをリセット（DBが未初期化でもメモリ上のデータはクリアする）
    this.cache = IndexedDBProgressRepository.defaultCache();
    // IndexedDB のストアをクリア。DB が未初期化の場合は deleteDatabase で永続データも確実に削除する。
    if (!this.db) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error("IndexedDB 削除に失敗しました"));
        req.onblocked = () => {
          // blocked は完全な失敗ではないためログを残して resolve する
          console.warn("IndexedDB deleteDatabase がブロックされました（他のタブが開いている可能性があります）");
          resolve();
        };
      });
      return;
    }
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = (this.db as IDBDatabase).transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB クリアに失敗しました"));
      } catch (error) {
        reject(error);
      }
    });
  }
}
