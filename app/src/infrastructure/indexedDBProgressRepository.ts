/**
 * IndexedDBProgressRepository — IndexedDBを使って進捗データを永続化する。
 * IProgressRepository の実装。
 *
 * 書き込みキャッシュ（Write-through cache）パターンを採用する。
 * - 読み込みはメモリキャッシュから同期的に行う
 * - 書き込みはキャッシュを即時更新し、IndexedDB への永続化は非同期で行う
 * - initialize() を呼び出すことで IndexedDB からキャッシュを初期化する
 */

import type {
  IProgressRepository,
  QuizRecord,
  QuizSettings,
  UserDataExport,
  MultiUserDataExport,
  UserProfile,
  CategoryStageRecord,
} from "../application/ports";
import { GUEST_USER_ID, GUEST_USER_NAME } from "../application/ports";
import { detectDeployEnvironment } from "../shared/deployEnvironment";

export function resolveDbPrefix(pathname: string): "v1" | "rc" {
  return detectDeployEnvironment(pathname);
}

// DB 名はモジュール初期化時の URL で確定する。
// 環境切り替え（v1/rc）はフルリロード遷移を前提としており、その都度再評価される。
const DB_PREFIX = typeof window === "undefined" ? "v1" : resolveDbPrefix(window.location.pathname);
const DB_NAME = `${DB_PREFIX}-studyProgressDB`;
const DB_VERSION = 1;
const STORE_NAME = "keyValue";

const KEY_WRONG_QUESTIONS = "wrongQuestions";
const KEY_CORRECT_STREAKS = "correctStreaks";
const KEY_MASTERED_IDS = "masteredIds";
const KEY_QUESTION_STATS = "questionStats";
const KEY_USER_NAME = "userName";
const KEY_USER_AVATAR = "userAvatar";
const KEY_QUIZ_HISTORY = "quizHistory";
const KEY_CATEGORY_VIEW_MODE = "categoryViewMode";
const KEY_FONT_SIZE_LEVEL = "fontSizeLevel";
const KEY_SHARE_URL = "overallShareUrl";
const KEY_QUIZ_SETTINGS = "quizSettings";
const KEY_RECOMMENDED_COUNTS = "recommendedCounts";
const KEY_CATEGORY_STAGES = "categoryStages";
const KEY_GLOBAL_RECOMMENDED_COUNT = "globalRecommendedCount";

/** ユーザープロフィール一覧とアクティブユーザーを保持するグローバルキー（ユーザー名前空間の対象外）。 */
const KEY_USER_PROFILES = "userProfiles";

/** ユーザーごとに名前空間を分けて永続化する基底キー一覧。 */
const PER_USER_KEYS = [
  KEY_WRONG_QUESTIONS,
  KEY_CORRECT_STREAKS,
  KEY_MASTERED_IDS,
  KEY_QUESTION_STATS,
  KEY_USER_NAME,
  KEY_USER_AVATAR,
  KEY_QUIZ_HISTORY,
  KEY_CATEGORY_VIEW_MODE,
  KEY_FONT_SIZE_LEVEL,
  KEY_SHARE_URL,
  KEY_QUIZ_SETTINGS,
  KEY_RECOMMENDED_COUNTS,
  KEY_CATEGORY_STAGES,
  KEY_GLOBAL_RECOMMENDED_COUNT,
] as const;

/** 保存する履歴の最大件数 */
const MAX_HISTORY = 100;

/** メモリキャッシュの型 */
interface ProgressCache {
  wrongQuestions: string[];
  correctStreaks: Record<string, number>;
  masteredIds: string[];
  questionStats: Record<string, { total: number; correct: number }>;
  userName: string | null;
  userAvatar: string | null;
  quizHistory: QuizRecord[];
  categoryViewMode: "category" | "grade";
  fontSizeLevel: "small" | "medium" | "large" | null;
  shareUrl: string;
  quizSettings: QuizSettings;
  recommendedCounts: Record<string, number>;
  categoryStages: Record<string, CategoryStageRecord>;
  globalRecommendedCount: number;
}

/** プレーンオブジェクト（null 非許容、配列非許容）かどうかを判定する型ガード */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class IndexedDBProgressRepository implements IProgressRepository {
  private db: IDBDatabase | null = null;
  private cache: ProgressCache = IndexedDBProgressRepository.defaultCache();
  /** 登録済みユーザー一覧（先頭は常にゲスト）。 */
  private profiles: UserProfile[] = IndexedDBProgressRepository.defaultProfiles();
  /** 現在アクティブなユーザー ID。 */
  private activeUserId: string = GUEST_USER_ID;
  /** 進行中の書き込みトランザクション Promise を追跡する（テスト用 flush のため） */
  private pendingWrites: Promise<void>[] = [];

  private static defaultProfiles(): UserProfile[] {
    return [{ id: GUEST_USER_ID, name: GUEST_USER_NAME }];
  }

  /** アクティブユーザーの名前空間を考慮した実キーを返す。ゲストは互換のため接頭辞なし。 */
  private namespacedKey(baseKey: string): string {
    return IndexedDBProgressRepository.keyForUser(this.activeUserId, baseKey);
  }

  /** 指定ユーザーの名前空間キーを返す。ゲストは互換のため接頭辞なし。 */
  private static keyForUser(userId: string, baseKey: string): string {
    return userId === GUEST_USER_ID ? baseKey : `u_${userId}_${baseKey}`;
  }

  private static defaultCache(): ProgressCache {
    return {
      wrongQuestions: [],
      correctStreaks: {},
      masteredIds: [],
      questionStats: {},
      userName: null,
      userAvatar: null,
      quizHistory: [],
      categoryViewMode: "category",
      fontSizeLevel: null,
      shareUrl: "",
      quizSettings: { questionCount: 5, quizOrder: "random", includeMastered: false },
      recommendedCounts: {},
      categoryStages: {},
      globalRecommendedCount: 3,
    };
  }

  /**
   * IndexedDB を開き、すべてのデータをキャッシュに読み込む。
   * アプリ起動時に一度だけ呼び出すこと。
   */
  async initialize(): Promise<void> {
    try {
      this.db = await this.openDB();
      await this.loadProfilesFromDB(this.db);
      this.cache = await this.loadAllFromDB(this.db);
    } catch (error) {
      console.error("IndexedDB の初期化に失敗しました（メモリのみで動作します）:", error);
    }
  }

  /** ユーザープロフィール一覧とアクティブユーザーをグローバルキーから読み込む。 */
  private async loadProfilesFromDB(db: IDBDatabase): Promise<void> {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY_USER_PROFILES);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB からユーザー情報の取得に失敗しました"));
    });
    const parsed = IndexedDBProgressRepository.parseProfilesMeta(raw);
    this.profiles = parsed.profiles;
    this.activeUserId = parsed.activeId;
  }

  /** 永続化されたプロフィールメタを検証し、正規化して返す。 */
  private static parseProfilesMeta(raw: unknown): { profiles: UserProfile[]; activeId: string } {
    const profiles = IndexedDBProgressRepository.defaultProfiles();
    let activeId = GUEST_USER_ID;
    if (isPlainObject(raw)) {
      const list = raw.profiles;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (isPlainObject(item) && typeof item.id === "string" && typeof item.name === "string") {
            if (item.id === GUEST_USER_ID) continue; // ゲストは常に先頭に固定済み
            if (profiles.some((p) => p.id === item.id)) continue;
            profiles.push({ id: item.id, name: item.name });
          }
        }
      }
      if (typeof raw.activeId === "string" && profiles.some((p) => p.id === raw.activeId)) {
        activeId = raw.activeId;
      }
      // ゲストの表示名が保存されていれば反映する
      if (Array.isArray(list)) {
        const guest = list.find((p) => isPlainObject(p) && p.id === GUEST_USER_ID) as
          | Record<string, unknown>
          | undefined;
        if (guest && typeof guest.name === "string" && guest.name) {
          profiles[0] = { id: GUEST_USER_ID, name: guest.name };
        }
      }
    }
    return { profiles, activeId };
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
  private async loadAllFromDB(db: IDBDatabase, userId: string = this.activeUserId): Promise<ProgressCache> {
    const cache = IndexedDBProgressRepository.defaultCache();
    const keyFor = (base: string): string => IndexedDBProgressRepository.keyForUser(userId, base);

    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const getValue = (key: string): Promise<unknown> =>
      new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error(`IndexedDB から ${key} の取得に失敗しました`));
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
      userAvatar,
      quizHistory,
      categoryViewMode,
      fontSizeLevel,
      shareUrl,
      quizSettings,
      recommendedCounts,
      categoryStages,
      globalRecommendedCount,
    ] = await Promise.all([
      getValue(keyFor(KEY_WRONG_QUESTIONS)),
      getValue(keyFor(KEY_CORRECT_STREAKS)),
      getValue(keyFor(KEY_MASTERED_IDS)),
      getValue(keyFor(KEY_QUESTION_STATS)),
      getValue(keyFor(KEY_USER_NAME)),
      getValue(keyFor(KEY_USER_AVATAR)),
      getValue(keyFor(KEY_QUIZ_HISTORY)),
      getValue(keyFor(KEY_CATEGORY_VIEW_MODE)),
      getValue(keyFor(KEY_FONT_SIZE_LEVEL)),
      getValue(keyFor(KEY_SHARE_URL)),
      getValue(keyFor(KEY_QUIZ_SETTINGS)),
      getValue(keyFor(KEY_RECOMMENDED_COUNTS)),
      getValue(keyFor(KEY_CATEGORY_STAGES)),
      getValue(keyFor(KEY_GLOBAL_RECOMMENDED_COUNT)),
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
    if (typeof userAvatar === "string") {
      cache.userAvatar = userAvatar;
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
    if (isPlainObject(categoryStages)) {
      const result: Record<string, CategoryStageRecord> = {};
      for (const [k, v] of Object.entries(categoryStages as Record<string, unknown>)) {
        if (
          isPlainObject(v) &&
          (v.stage === 0 || v.stage === 1 || v.stage === 2 || v.stage === 3) &&
          // 明示的な比較で TypeScript が stage の型（0|1|2|3）を絞り込めるようにする
          typeof v.lastCompletedAt === "string"
        ) {
          result[k] = { stage: v.stage as CategoryStageRecord["stage"], lastCompletedAt: v.lastCompletedAt };
        }
      }
      cache.categoryStages = result;
    }
    if (typeof globalRecommendedCount === "number" && globalRecommendedCount > 0) {
      cache.globalRecommendedCount = globalRecommendedCount;
    }

    return cache;
  }

  /** 壊れたデータや旧形式を検証して正規化する */
  private normalizeStats(raw: Record<string, unknown>): Record<string, { total: number; correct: number }> {
    const normalized: Record<string, { total: number; correct: number }> = {};
    for (const [id, val] of Object.entries(raw)) {
      if (val !== null && typeof val === "object") {
        const { total, correct } = val as Record<string, unknown>;
        normalized[id] = {
          total: Number.isFinite(total) && (total as number) >= 0 ? Math.trunc(total as number) : 0,
          correct: Number.isFinite(correct) && (correct as number) >= 0 ? Math.trunc(correct as number) : 0,
        };
      }
    }
    return normalized;
  }

  /** キャッシュを更新し、IndexedDB に非同期で書き込む（アクティブユーザーの名前空間で保存する） */
  private persistKey(key: string, value: unknown): void {
    this.putRaw(this.namespacedKey(key), value);
  }

  /** 完全修飾キーで IndexedDB に非同期書き込みする低レベルヘルパー。 */
  private putRaw(fullKey: string, value: unknown): void {
    if (!this.db) return;
    const writePromise = new Promise<void>((resolve, reject) => {
      try {
        const tx = (this.db as IDBDatabase).transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(value, fullKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          console.error(`IndexedDB 書き込みエラー (${fullKey}):`, tx.error);
          reject(tx.error);
        };
      } catch (error) {
        console.error(`IndexedDB 書き込みエラー (${fullKey}):`, error);
        reject(error);
      }
    });
    this.pendingWrites.push(writePromise.catch(() => undefined));
  }

  /** 完全修飾キーを IndexedDB から削除する低レベルヘルパー。 */
  private deleteRaw(fullKey: string): void {
    if (!this.db) return;
    const writePromise = new Promise<void>((resolve, reject) => {
      try {
        const tx = (this.db as IDBDatabase).transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(fullKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (error) {
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
    // アクティブユーザーのプロフィール表示名も同期する
    const profile = this.profiles.find((p) => p.id === this.activeUserId);
    if (profile && profile.name !== name && name) {
      profile.name = name;
      this.persistProfiles();
    }
  }

  loadUserAvatar(): string | null {
    return this.cache.userAvatar;
  }

  saveUserAvatar(dataUrl: string): void {
    this.cache.userAvatar = dataUrl;
    this.persistKey(KEY_USER_AVATAR, dataUrl);
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

  loadCategoryStages(): Record<string, CategoryStageRecord> {
    return this.cache.categoryStages;
  }

  saveCategoryStages(stages: Record<string, CategoryStageRecord>): void {
    this.cache.categoryStages = stages;
    this.persistKey(KEY_CATEGORY_STAGES, stages);
  }

  loadGlobalRecommendedCount(): number {
    return this.cache.globalRecommendedCount;
  }

  saveGlobalRecommendedCount(count: number): void {
    this.cache.globalRecommendedCount = count;
    this.persistKey(KEY_GLOBAL_RECOMMENDED_COUNT, count);
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
      categoryStages: this.loadCategoryStages(),
      globalRecommendedCount: this.loadGlobalRecommendedCount(),
    };
  }

  async clearAllData(): Promise<void> {
    // キャッシュとユーザー情報をリセット（DBが未初期化でもメモリ上のデータはクリアする）
    this.cache = IndexedDBProgressRepository.defaultCache();
    this.profiles = IndexedDBProgressRepository.defaultProfiles();
    this.activeUserId = GUEST_USER_ID;
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

  // ─── 複数ユーザー対応 ────────────────────────────────────────────────────────

  /** ユーザープロフィール一覧を IndexedDB に永続化する。 */
  private persistProfiles(): void {
    this.putRaw(KEY_USER_PROFILES, { activeId: this.activeUserId, profiles: this.profiles });
  }

  listUsers(): UserProfile[] {
    return this.profiles.map((p) => ({ ...p }));
  }

  getActiveUserId(): string {
    return this.activeUserId;
  }

  addUser(name: string): UserProfile {
    const trimmed = name.trim() || GUEST_USER_NAME;
    const id = IndexedDBProgressRepository.generateUserId();
    const profile: UserProfile = { id, name: trimmed };
    this.profiles.push(profile);
    // 新規ユーザーの表示名を事前に保存し、切り替え後の名前表示と一致させる
    this.putRaw(IndexedDBProgressRepository.keyForUser(id, KEY_USER_NAME), trimmed);
    this.persistProfiles();
    return { ...profile };
  }

  /** 衝突しにくいユーザー ID を生成する（利用可能なら crypto.randomUUID を使う）。 */
  private static generateUserId(): string {
    const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return `user-${cryptoObj.randomUUID()}`;
    }
    // randomUUID が無い環境向けのフォールバック。短時間に連続生成すると衝突する可能性は
    // 残るが、UI 操作で 1 件ずつ追加する想定のため実用上は十分。
    return `user-${Date.now().toString(36)}-${performance.now().toString(36).replace(".", "")}`;
  }

  async switchUser(id: string): Promise<void> {
    if (!this.profiles.some((p) => p.id === id)) return;
    this.activeUserId = id;
    this.persistProfiles();
    if (this.db) {
      this.cache = await this.loadAllFromDB(this.db);
    } else {
      this.cache = IndexedDBProgressRepository.defaultCache();
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (id === GUEST_USER_ID) return; // ゲストは削除しない
    if (!this.profiles.some((p) => p.id === id)) return;
    this.profiles = this.profiles.filter((p) => p.id !== id);
    // 削除対象ユーザーのデータを消去し、完了を待ってからメタ情報を更新する
    for (const baseKey of PER_USER_KEYS) {
      this.deleteRaw(IndexedDBProgressRepository.keyForUser(id, baseKey));
    }
    await this.flush();
    // アクティブユーザーを削除した場合はゲストへ切り替える
    if (this.activeUserId === id) {
      await this.switchUser(GUEST_USER_ID);
    } else {
      this.persistProfiles();
    }
  }

  async clearActiveUserData(): Promise<void> {
    const target = this.activeUserId;
    for (const baseKey of PER_USER_KEYS) {
      this.deleteRaw(IndexedDBProgressRepository.keyForUser(target, baseKey));
    }
    this.cache = IndexedDBProgressRepository.defaultCache();
    await this.flush();
  }

  async exportAllUsersData(): Promise<MultiUserDataExport> {
    const users: MultiUserDataExport["users"] = [];
    for (const profile of this.profiles) {
      const data = profile.id === this.activeUserId ? this.exportAllData() : await this.readUserExport(profile.id);
      users.push({ id: profile.id, name: profile.name, data });
    }
    return {
      exportedAt: new Date().toISOString(),
      activeUserId: this.activeUserId,
      users,
    };
  }

  /** アクティブでないユーザーのデータを IndexedDB から読み出してエクスポート形式に整える。 */
  private async readUserExport(userId: string): Promise<UserDataExport> {
    const cache = this.db ? await this.loadAllFromDB(this.db, userId) : IndexedDBProgressRepository.defaultCache();
    return {
      exportedAt: new Date().toISOString(),
      userName: cache.userName,
      wrongIds: cache.wrongQuestions,
      correctStreaks: cache.correctStreaks,
      masteredIds: cache.masteredIds,
      history: cache.quizHistory,
      categoryViewMode: cache.categoryViewMode,
      fontSizeLevel: cache.fontSizeLevel,
      recommendedCounts: cache.recommendedCounts,
      categoryStages: cache.categoryStages,
      globalRecommendedCount: cache.globalRecommendedCount,
    };
  }
}
