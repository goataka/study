/**
 * LocalStorageProgressRepository — localStorageを使って間違えた問題IDを永続化する。
 * IProgressRepository の実装。
 */
const STORAGE_KEY = "wrongQuestions";
const CORRECT_STREAKS_KEY = "correctStreaks";
const MASTERED_IDS_KEY = "masteredIds";
const QUESTION_STATS_KEY = "questionStats";
const USER_NAME_KEY = "userName";
const HISTORY_KEY = "quizHistory";
const CATEGORY_VIEW_MODE_KEY = "categoryViewMode";
const FONT_SIZE_KEY = "fontSizeLevel";
const SHARE_URL_KEY = "overallShareUrl";
const QUIZ_SETTINGS_KEY = "quizSettings";
const RECOMMENDED_COUNTS_KEY = "recommendedCounts";
/** 保存する履歴の最大件数 */
const MAX_HISTORY = 100;
export class LocalStorageProgressRepository {
    loadWrongIds() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    }
    saveWrongIds(ids) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        }
        catch (error) {
            console.error("データの保存に失敗しました:", error);
        }
    }
    loadCorrectStreaks() {
        try {
            const saved = localStorage.getItem(CORRECT_STREAKS_KEY);
            return saved ? JSON.parse(saved) : {};
        }
        catch {
            return {};
        }
    }
    saveCorrectStreaks(streaks) {
        try {
            localStorage.setItem(CORRECT_STREAKS_KEY, JSON.stringify(streaks));
        }
        catch (error) {
            console.error("正解連続数の保存に失敗しました:", error);
        }
    }
    loadMasteredIds() {
        try {
            const saved = localStorage.getItem(MASTERED_IDS_KEY);
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    }
    saveMasteredIds(ids) {
        try {
            localStorage.setItem(MASTERED_IDS_KEY, JSON.stringify(ids));
        }
        catch (error) {
            console.error("習得済みIDの保存に失敗しました:", error);
        }
    }
    loadQuestionStats() {
        try {
            const saved = localStorage.getItem(QUESTION_STATS_KEY);
            if (!saved)
                return {};
            const raw = JSON.parse(saved);
            // 壊れたデータや旧形式に備え、total/correct が有限の非負整数かを検証して正規化する
            const normalized = {};
            for (const [id, val] of Object.entries(raw)) {
                if (val !== null && typeof val === "object") {
                    const { total, correct } = val;
                    normalized[id] = {
                        total: Number.isFinite(total) && total >= 0 ? Math.trunc(total) : 0,
                        correct: Number.isFinite(correct) && correct >= 0 ? Math.trunc(correct) : 0,
                    };
                }
            }
            return normalized;
        }
        catch {
            return {};
        }
    }
    saveQuestionStats(stats) {
        try {
            localStorage.setItem(QUESTION_STATS_KEY, JSON.stringify(stats));
        }
        catch (error) {
            console.error("問題統計の保存に失敗しました:", error);
        }
    }
    loadUserName() {
        try {
            return localStorage.getItem(USER_NAME_KEY);
        }
        catch {
            return null;
        }
    }
    saveUserName(name) {
        try {
            localStorage.setItem(USER_NAME_KEY, name);
        }
        catch (error) {
            console.error("ユーザー名の保存に失敗しました:", error);
        }
    }
    loadHistory() {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    }
    saveHistory(records) {
        try {
            const trimmed = records.slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
        }
        catch (error) {
            console.error("履歴の保存に失敗しました:", error);
        }
    }
    loadCategoryViewMode() {
        try {
            const saved = localStorage.getItem(CATEGORY_VIEW_MODE_KEY);
            return saved === "grade" ? "grade" : "category";
        }
        catch {
            return "category";
        }
    }
    saveCategoryViewMode(mode) {
        try {
            localStorage.setItem(CATEGORY_VIEW_MODE_KEY, mode);
        }
        catch (error) {
            console.error("表示モードの保存に失敗しました:", error);
        }
    }
    loadFontSizeLevel() {
        try {
            const saved = localStorage.getItem(FONT_SIZE_KEY);
            if (saved === "small" || saved === "medium" || saved === "large") {
                return saved;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    saveFontSizeLevel(level) {
        try {
            localStorage.setItem(FONT_SIZE_KEY, level);
        }
        catch (error) {
            console.error("文字サイズの保存に失敗しました:", error);
        }
    }
    loadShareUrl() {
        try {
            return localStorage.getItem(SHARE_URL_KEY) ?? "";
        }
        catch {
            return "";
        }
    }
    saveShareUrl(url) {
        try {
            if (url) {
                localStorage.setItem(SHARE_URL_KEY, url);
            }
            else {
                localStorage.removeItem(SHARE_URL_KEY);
            }
        }
        catch (error) {
            console.error("共有URLの保存に失敗しました:", error);
        }
    }
    loadQuizSettings() {
        try {
            const saved = localStorage.getItem(QUIZ_SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    questionCount: typeof parsed.questionCount === "number" ? parsed.questionCount : 10,
                    quizOrder: parsed.quizOrder === "straight" ? "straight" : "random",
                    includeMastered: typeof parsed.includeMastered === "boolean" ? parsed.includeMastered : false,
                };
            }
        }
        catch {
            // ignore
        }
        return { questionCount: 10, quizOrder: "random", includeMastered: false };
    }
    saveQuizSettings(settings) {
        try {
            localStorage.setItem(QUIZ_SETTINGS_KEY, JSON.stringify(settings));
        }
        catch (error) {
            console.error("クイズ設定の保存に失敗しました:", error);
        }
    }
    loadRecommendedCounts() {
        try {
            const saved = localStorage.getItem(RECOMMENDED_COUNTS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const result = {};
                for (const [k, v] of Object.entries(parsed)) {
                    if (typeof v === "number" && v > 0)
                        result[k] = v;
                }
                return result;
            }
        }
        catch {
            // JSON.parse が失敗した場合はデフォルト値（各教科1件）を使用する
        }
        return {};
    }
    saveRecommendedCounts(counts) {
        try {
            localStorage.setItem(RECOMMENDED_COUNTS_KEY, JSON.stringify(counts));
        }
        catch (error) {
            console.error("おすすめ単元表示数の保存に失敗しました:", error);
        }
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
        const keys = [
            STORAGE_KEY,
            CORRECT_STREAKS_KEY,
            MASTERED_IDS_KEY,
            QUESTION_STATS_KEY,
            USER_NAME_KEY,
            HISTORY_KEY,
            CATEGORY_VIEW_MODE_KEY,
            FONT_SIZE_KEY,
            SHARE_URL_KEY,
            QUIZ_SETTINGS_KEY,
            RECOMMENDED_COUNTS_KEY,
        ];
        for (const key of keys) {
            try {
                localStorage.removeItem(key);
            }
            catch {
                // ignore
            }
        }
    }
}
