/**
 * IndexedDBProgressRepository — IndexedDBを使って進捗データを永続化する。
 * IProgressRepository の実装。
 *
 * 書き込みキャッシュ（Write-through cache）パターンを採用する。
 * - 読み込みはメモリキャッシュから同期的に行う
 * - 書き込みはキャッシュを即時更新し、IndexedDB への永続化は非同期で行う
 * - initialize() を呼び出すことで IndexedDB からキャッシュを初期化する
 */
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
/** プレーンオブジェクト（null 非許容、配列非許容）かどうかを判定する型ガード */
function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
export class IndexedDBProgressRepository {
    constructor() {
        this.db = null;
        this.cache = IndexedDBProgressRepository.defaultCache();
        /** 進行中の書き込みトランザクション Promise を追跡する（テスト用 flush のため） */
        this.pendingWrites = [];
    }
    static defaultCache() {
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
    async initialize() {
        try {
            this.db = await this.openDB();
            this.cache = await this.loadAllFromDB(this.db);
        }
        catch (error) {
            console.error("IndexedDB の初期化に失敗しました（メモリのみで動作します）:", error);
        }
    }
    /**
     * 進行中のすべての書き込みが完了するまで待機する。
     * 主にテストで使用する。
     */
    async flush() {
        await Promise.all(this.pendingWrites);
        this.pendingWrites = [];
    }
    openDB() {
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
    async loadAllFromDB(db) {
        const cache = IndexedDBProgressRepository.defaultCache();
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const getValue = (key) => new Promise((resolve, reject) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error ?? new Error(`IndexedDB から ${key} の取得に失敗しました`));
        });
        const transactionDone = new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB の読み込みトランザクションに失敗しました"));
            transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB の読み込みトランザクションが中断されました"));
        });
        const [wrongQuestions, correctStreaks, masteredIds, questionStats, userName, quizHistory, categoryViewMode, fontSizeLevel, shareUrl, quizSettings, recommendedCounts,] = await Promise.all([
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
            cache.wrongQuestions = wrongQuestions;
        }
        if (isPlainObject(correctStreaks)) {
            cache.correctStreaks = correctStreaks;
        }
        if (Array.isArray(masteredIds)) {
            cache.masteredIds = masteredIds;
        }
        if (isPlainObject(questionStats)) {
            cache.questionStats = this.normalizeStats(questionStats);
        }
        if (typeof userName === "string") {
            cache.userName = userName;
        }
        if (Array.isArray(quizHistory)) {
            cache.quizHistory = quizHistory;
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
            const qs = quizSettings;
            cache.quizSettings = {
                questionCount: typeof qs.questionCount === "number" ? qs.questionCount : 10,
                quizOrder: qs.quizOrder === "straight" ? "straight" : "random",
                includeMastered: typeof qs.includeMastered === "boolean" ? qs.includeMastered : false,
            };
        }
        if (isPlainObject(recommendedCounts)) {
            const result = {};
            for (const [k, v] of Object.entries(recommendedCounts)) {
                if (typeof v === "number" && v > 0)
                    result[k] = v;
            }
            cache.recommendedCounts = result;
        }
        return cache;
    }
    /** 壊れたデータや旧形式を検証して正規化する */
    normalizeStats(raw) {
        const normalized = {};
        for (const [id, val] of Object.entries(raw)) {
            if (val !== null && typeof val === "object") {
                const { total, correct } = val;
                normalized[id] = {
                    total: Number.isFinite(total) && total >= 0
                        ? Math.trunc(total)
                        : 0,
                    correct: Number.isFinite(correct) && correct >= 0
                        ? Math.trunc(correct)
                        : 0,
                };
            }
        }
        return normalized;
    }
    /** キャッシュを更新し、IndexedDB に非同期で書き込む */
    persistKey(key, value) {
        if (!this.db)
            return;
        const writePromise = new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                store.put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => {
                    console.error(`IndexedDB 書き込みエラー (${key}):`, tx.error);
                    reject(tx.error);
                };
            }
            catch (error) {
                console.error(`IndexedDB 書き込みエラー (${key}):`, error);
                reject(error);
            }
        });
        this.pendingWrites.push(writePromise.catch(() => undefined));
    }
    // ─── IProgressRepository 実装 ───────────────────────────────────────────────
    loadWrongIds() {
        return this.cache.wrongQuestions;
    }
    saveWrongIds(ids) {
        this.cache.wrongQuestions = ids;
        this.persistKey(KEY_WRONG_QUESTIONS, ids);
    }
    loadCorrectStreaks() {
        return this.cache.correctStreaks;
    }
    saveCorrectStreaks(streaks) {
        this.cache.correctStreaks = streaks;
        this.persistKey(KEY_CORRECT_STREAKS, streaks);
    }
    loadMasteredIds() {
        return this.cache.masteredIds;
    }
    saveMasteredIds(ids) {
        this.cache.masteredIds = ids;
        this.persistKey(KEY_MASTERED_IDS, ids);
    }
    loadQuestionStats() {
        return this.cache.questionStats;
    }
    saveQuestionStats(stats) {
        this.cache.questionStats = stats;
        this.persistKey(KEY_QUESTION_STATS, stats);
    }
    loadUserName() {
        return this.cache.userName;
    }
    saveUserName(name) {
        this.cache.userName = name;
        this.persistKey(KEY_USER_NAME, name);
    }
    loadHistory() {
        return this.cache.quizHistory;
    }
    saveHistory(records) {
        const trimmed = records.slice(0, MAX_HISTORY);
        this.cache.quizHistory = trimmed;
        this.persistKey(KEY_QUIZ_HISTORY, trimmed);
    }
    loadCategoryViewMode() {
        return this.cache.categoryViewMode;
    }
    saveCategoryViewMode(mode) {
        this.cache.categoryViewMode = mode;
        this.persistKey(KEY_CATEGORY_VIEW_MODE, mode);
    }
    loadFontSizeLevel() {
        return this.cache.fontSizeLevel;
    }
    saveFontSizeLevel(level) {
        this.cache.fontSizeLevel = level;
        this.persistKey(KEY_FONT_SIZE_LEVEL, level);
    }
    loadShareUrl() {
        return this.cache.shareUrl;
    }
    saveShareUrl(url) {
        this.cache.shareUrl = url;
        this.persistKey(KEY_SHARE_URL, url);
    }
    loadQuizSettings() {
        return this.cache.quizSettings;
    }
    saveQuizSettings(settings) {
        this.cache.quizSettings = settings;
        this.persistKey(KEY_QUIZ_SETTINGS, settings);
    }
    loadRecommendedCounts() {
        return this.cache.recommendedCounts;
    }
    saveRecommendedCounts(counts) {
        this.cache.recommendedCounts = counts;
        this.persistKey(KEY_RECOMMENDED_COUNTS, counts);
    }
    exportAllData() {
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
    async clearAllData() {
        // キャッシュをリセット（DBが未初期化でもメモリ上のデータはクリアする）
        this.cache = IndexedDBProgressRepository.defaultCache();
        // IndexedDB のストアをクリア。DB が未初期化の場合は deleteDatabase で永続データも確実に削除する。
        if (!this.db) {
            await new Promise((resolve, reject) => {
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
        await new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error ?? new Error("IndexedDB クリアに失敗しました"));
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
