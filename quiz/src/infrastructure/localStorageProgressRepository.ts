/**
 * LocalStorageProgressRepository — localStorageを使って間違えた問題IDを永続化する。
 * IProgressRepository の実装。
 */

import type { IProgressRepository, QuizRecord } from "../application/ports";

const STORAGE_KEY = "wrongQuestions";
const USER_NAME_KEY = "userName";
const HISTORY_KEY = "quizHistory";
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
}
