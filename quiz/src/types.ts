/**
 * クイズシステムの型定義
 */

/** 問題データ（表示用にメタ情報を付加したもの） */
export interface Question {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
}

/** 各問題ファイルの生データ（メタ情報なし） */
export interface RawQuestion {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
}

/** 問題ファイル1件のスキーマ */
export interface QuestionFile {
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  questions: RawQuestion[];
}

/** questions/index.json のスキーマ */
export interface QuestionsManifest {
  version: string;
  subjects: Record<string, { name: string }>;
  questionFiles: string[];
}

/** クイズの実行モード */
export type QuizMode = "random" | "retry";

/** フィルター条件 */
export interface QuizFilter {
  subject: string;
  category: string;
}

/** 結果レポート1問分 */
export interface AnswerResult {
  question: Question;
  userAnswerIndex: number;
  isCorrect: boolean;
}
