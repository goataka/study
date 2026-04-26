/**
 * LocalStorageProgressRepository — localStorageを使って間違えた問題IDを永続化する。
 * IProgressRepository の実装。
 */

import type { IProgressRepository, QuizRecord } from "../application/ports";

const STORAGE_KEY = "wrongQuestions";
const CORRECT_STREAKS_KEY = "correctStreaks";
const USER_NAME_KEY = "userName";
const HISTORY_KEY = "quizHistory";
const FONT_SIZE_KEY = "fontSizeLevel";
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
}
