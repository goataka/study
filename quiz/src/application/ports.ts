/**
 * アプリケーション層のポート（インターフェース） — 依存性逆転の境界。
 * インフラ層の実装に依存せず、このインターフェースを通じてやり取りする。
 */

import type { Question } from "../domain/question";

/** 問題データ取得の抽象インターフェース */
export interface IQuestionRepository {
  loadAll(): Promise<Question[]>;
}

/** 1問分の回答記録 */
export interface QuizRecordEntry {
  questionId: string;
  questionText: string;
  isCorrect: boolean;
  userAnswerIndex: number;
  correctAnswerIndex: number;
  choices: string[];
  explanation: string;
  categoryName: string;
}

/** 1回のクイズセッションの回答記録 */
export interface QuizRecord {
  id: string;
  date: string;
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  mode: string;
  totalCount: number;
  correctCount: number;
  entries: QuizRecordEntry[];
}

/** 進捗データ永続化の抽象インターフェース */
export interface IProgressRepository {
  loadWrongIds(): string[];
  saveWrongIds(ids: string[]): void;
  loadUserName(): string | null;
  saveUserName(name: string): void;
  loadHistory(): QuizRecord[];
  saveHistory(records: QuizRecord[]): void;
}
