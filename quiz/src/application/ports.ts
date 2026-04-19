/**
 * Application ports (interfaces) — dependency inversion boundaries.
 */

import type { Question } from "../domain/question";

/** 問題データ取得の抽象インターフェース */
export interface IQuestionRepository {
  loadAll(): Promise<Question[]>;
}

/** 進捗データ永続化の抽象インターフェース */
export interface IProgressRepository {
  loadWrongIds(): string[];
  saveWrongIds(ids: string[]): void;
}
