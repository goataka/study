/**
 * LocalStorageProgressRepository — localStorageを使って間違えた問題IDを永続化する。
 * IProgressRepository の実装。
 */

import type { IProgressRepository } from "../application/ports";

const STORAGE_KEY = "wrongQuestions";
const USER_NAME_KEY = "userName";

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
}
