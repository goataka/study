/**
 * LocalStorageProgressRepository — localStorageを使って間違えた問題IDを永続化する。
 * IProgressRepository の実装。
 */

import type { IProgressRepository, QuizRecord, QuizSettings, UserDataExport } from "../application/ports";

const STORAGE_KEY = "wrongQuestions";
const CORRECT_STREAKS_KEY = "correctStreaks";
const MASTERED_IDS_KEY = "masteredIds";
const QUESTION_STATS_KEY = "questionStats";
const USER_NAME_KEY = "userName";
const USER_AVATAR_KEY = "userAvatar";
const HISTORY_KEY = "quizHistory";
const CATEGORY_VIEW_MODE_KEY = "categoryViewMode";
const FONT_SIZE_KEY = "fontSizeLevel";
const SHARE_URL_KEY = "overallShareUrl";
const QUIZ_SETTINGS_KEY = "quizSettings";
const RECOMMENDED_COUNTS_KEY = "recommendedCounts";
/** 保存する履歴の最大件数 */
const MAX_HISTORY = 100;

export class LocalStorageProgressRepository implements IProgressRepository {
  loadWrongIds(): string[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  }

  saveWrongIds(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("データの保存に失敗しました:", error);
    }
  }

  loadCorrectStreaks(): Record<string, number> {
    try {
      const saved = localStorage.getItem(CORRECT_STREAKS_KEY);
      return saved ? (JSON.parse(saved) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  saveCorrectStreaks(streaks: Record<string, number>): void {
    try {
      localStorage.setItem(CORRECT_STREAKS_KEY, JSON.stringify(streaks));
    } catch (error) {
      console.error("正解連続数の保存に失敗しました:", error);
    }
  }

  loadMasteredIds(): string[] {
    try {
      const saved = localStorage.getItem(MASTERED_IDS_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  }

  saveMasteredIds(ids: string[]): void {
    try {
      localStorage.setItem(MASTERED_IDS_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("習得済みIDの保存に失敗しました:", error);
    }
  }

  loadQuestionStats(): Record<string, { total: number; correct: number }> {
    try {
      const saved = localStorage.getItem(QUESTION_STATS_KEY);
      if (!saved) return {};
      const raw = JSON.parse(saved) as Record<string, unknown>;
      // 壊れたデータや旧形式に備え、total/correct が有限の非負整数かを検証して正規化する
      const normalized: Record<string, { total: number; correct: number }> = {};
      for (const [id, val] of Object.entries(raw)) {
        if (val !== null && typeof val === "object") {
          const { total, correct } = val as Record<string, unknown>;
          normalized[id] = {
            total: Number.isFinite(total) && (total as number) >= 0 ? Math.trunc(total as number) : 0,
            correct:
              Number.isFinite(correct) && (correct as number) >= 0 ? Math.trunc(correct as number) : 0,
          };
        }
      }
      return normalized;
    } catch {
      return {};
    }
  }

  saveQuestionStats(stats: Record<string, { total: number; correct: number }>): void {
    try {
      localStorage.setItem(QUESTION_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("問題統計の保存に失敗しました:", error);
    }
  }

  loadUserName(): string | null {
    try {
      return localStorage.getItem(USER_NAME_KEY);
    } catch {
      return null;
    }
  }

  saveUserName(name: string): void {
    try {
      localStorage.setItem(USER_NAME_KEY, name);
    } catch (error) {
      console.error("ユーザー名の保存に失敗しました:", error);
    }
  }

  loadUserAvatar(): string | null {
    try {
      return localStorage.getItem(USER_AVATAR_KEY);
    } catch {
      return null;
    }
  }

  saveUserAvatar(dataUrl: string): void {
    try {
      localStorage.setItem(USER_AVATAR_KEY, dataUrl);
    } catch (error) {
      console.error("ユーザーアバターの保存に失敗しました:", error);
    }
  }

  loadHistory(): QuizRecord[] {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? (JSON.parse(saved) as QuizRecord[]) : [];
    } catch {
      return [];
    }
  }

  saveHistory(records: QuizRecord[]): void {
    try {
      const trimmed = records.slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error("履歴の保存に失敗しました:", error);
    }
  }

  loadCategoryViewMode(): "category" | "grade" {
    try {
      const saved = localStorage.getItem(CATEGORY_VIEW_MODE_KEY);
      return saved === "grade" ? "grade" : "category";
    } catch {
      return "category";
    }
  }

  saveCategoryViewMode(mode: "category" | "grade"): void {
    try {
      localStorage.setItem(CATEGORY_VIEW_MODE_KEY, mode);
    } catch (error) {
      console.error("表示モードの保存に失敗しました:", error);
    }
  }

  loadFontSizeLevel(): "small" | "medium" | "large" | null {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY);
      if (saved === "small" || saved === "medium" || saved === "large") {
        return saved;
      }
      return null;
    } catch {
      return null;
    }
  }

  saveFontSizeLevel(level: "small" | "medium" | "large"): void {
    try {
      localStorage.setItem(FONT_SIZE_KEY, level);
    } catch (error) {
      console.error("文字サイズの保存に失敗しました:", error);
    }
  }

  loadShareUrl(): string {
    try {
      return localStorage.getItem(SHARE_URL_KEY) ?? "";
    } catch {
      return "";
    }
  }

  saveShareUrl(url: string): void {
    try {
      if (url) {
        localStorage.setItem(SHARE_URL_KEY, url);
      } else {
        localStorage.removeItem(SHARE_URL_KEY);
      }
    } catch (error) {
      console.error("共有URLの保存に失敗しました:", error);
    }
  }

  loadQuizSettings(): QuizSettings {
    try {
      const saved = localStorage.getItem(QUIZ_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as QuizSettings;
        return {
          questionCount: typeof parsed.questionCount === "number" ? parsed.questionCount : 10,
          quizOrder: parsed.quizOrder === "straight" ? "straight" : "random",
          includeMastered: typeof parsed.includeMastered === "boolean" ? parsed.includeMastered : false,
        };
      }
    } catch {
      // ignore
    }
    return { questionCount: 10, quizOrder: "random", includeMastered: false };
  }

  saveQuizSettings(settings: QuizSettings): void {
    try {
      localStorage.setItem(QUIZ_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("クイズ設定の保存に失敗しました:", error);
    }
  }

  loadRecommendedCounts(): Record<string, number> {
    try {
      const saved = localStorage.getItem(RECOMMENDED_COUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        const result: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "number" && v > 0) result[k] = v;
        }
        return result;
      }
    } catch {
      // JSON.parse が失敗した場合はデフォルト値（各教科1件）を使用する
    }
    return {};
  }

  saveRecommendedCounts(counts: Record<string, number>): void {
    try {
      localStorage.setItem(RECOMMENDED_COUNTS_KEY, JSON.stringify(counts));
    } catch (error) {
      console.error("おすすめ単元表示数の保存に失敗しました:", error);
    }
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
    const keys = [
      STORAGE_KEY,
      CORRECT_STREAKS_KEY,
      MASTERED_IDS_KEY,
      QUESTION_STATS_KEY,
      USER_NAME_KEY,
      USER_AVATAR_KEY,
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
      } catch {
        // ignore
      }
    }
  }
}
