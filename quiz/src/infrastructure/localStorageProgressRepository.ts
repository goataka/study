/**
 * LocalStorageProgressRepository — localStorageを使って問題の実施状況を永続化する。
 * IProgressRepository の実装。
 */

import type { IProgressRepository } from "../application/ports";

const WRONG_QUESTIONS_KEY = "wrongQuestions";
const CORRECT_QUESTIONS_KEY = "correctQuestions";

export class LocalStorageProgressRepository implements IProgressRepository {
  loadWrongIds(): string[] {
    try {
      const saved = localStorage.getItem(WRONG_QUESTIONS_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  }

  saveWrongIds(ids: string[]): void {
    try {
      localStorage.setItem(WRONG_QUESTIONS_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("データの保存に失敗しました:", error);
    }
  }

  loadCorrectIds(): string[] {
    try {
      const saved = localStorage.getItem(CORRECT_QUESTIONS_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  }

  saveCorrectIds(ids: string[]): void {
    try {
      localStorage.setItem(CORRECT_QUESTIONS_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("データの保存に失敗しました:", error);
    }
  }
}
