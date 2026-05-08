/**
 * QuizSession 集約 — 問題の選択・回答の追跡・採点を管理する。
 * DOM や fetch への依存がない純粋なビジネスロジック。
 */

import type { Question } from "./question";
import { shuffleChoices } from "./question";

export type QuizMode = "random" | "retry" | "practice";

export interface QuizFilter {
  subject: string;
  category: string;
  parentCategory?: string;
}

export interface AnswerResult {
  question: Question;
  userAnswerIndex: number;
  isCorrect: boolean;
  /** text-input 問題でユーザーが入力したテキスト */
  userAnswerText?: string;
}

export class QuizSession {
  private readonly _questions: Question[];
  private _currentIndex = 0;
  private _userAnswers: Map<number, number> = new Map();
  /** text-input 問題のユーザー入力テキストを保持 */
  private _userTextAnswers: Map<number, string> = new Map();

  constructor(questions: Question[]) {
    if (questions.length === 0) {
      throw new Error("QuizSession requires at least one question");
    }
    // text-input 問題はシャッフルしない（shuffleChoices 内でも早期リターンするが明示的に区別）
    this._questions = questions.map((q) => shuffleChoices(q));
  }

  get questions(): Question[] {
    return this._questions;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get currentQuestion(): Question {
    return this._questions[this._currentIndex]!;
  }

  get totalCount(): number {
    return this._questions.length;
  }

  selectAnswer(questionIndex: number, choiceIndex: number): void {
    if (questionIndex < 0 || questionIndex >= this._questions.length) {
      throw new Error(`Invalid question index: ${questionIndex}`);
    }
    if (choiceIndex < 0 || choiceIndex > 3) {
      throw new Error(`Invalid choice index: ${choiceIndex}`);
    }
    this._userAnswers.set(questionIndex, choiceIndex);
  }

  /**
   * text-input 問題に対してテキスト回答を登録する。
   * 正解と一致する場合は `question.correct` のインデックス、不一致の場合は -1 を内部的に格納する。
   * multiple-choice 問題に対して呼び出すと Error をスローする。
   */
  selectTextAnswer(questionIndex: number, text: string): void {
    if (questionIndex < 0 || questionIndex >= this._questions.length) {
      throw new Error(`Invalid question index: ${questionIndex}`);
    }
    const question = this._questions[questionIndex]!;
    if ((question.questionType ?? "multiple-choice") !== "text-input") {
      throw new Error(`selectTextAnswer cannot be called on a non-text-input question (index: ${questionIndex})`);
    }
    this._userTextAnswers.set(questionIndex, text);
    const correctAnswer = question.choices[question.correct] ?? "";
    const isCorrect = question.caseSensitive
      ? normalizeTextAnswer(text, true) === normalizeTextAnswer(correctAnswer, true)
      : normalizeTextAnswer(text) === normalizeTextAnswer(correctAnswer);
    this._userAnswers.set(questionIndex, isCorrect ? question.correct : -1);
  }

  getAnswer(questionIndex: number): number | undefined {
    return this._userAnswers.get(questionIndex);
  }

  /** text-input 問題のユーザー入力テキストを返す */
  getTextAnswer(questionIndex: number): string | undefined {
    return this._userTextAnswers.get(questionIndex);
  }

  navigate(direction: 1 | -1): void {
    const next = this._currentIndex + direction;
    if (next < 0 || next >= this._questions.length) {
      throw new Error(`Cannot navigate to index ${next}`);
    }
    this._currentIndex = next;
  }

  canSubmit(): boolean {
    return this._userAnswers.size === this._questions.length;
  }

  score(): number {
    let correct = 0;
    for (const [i, answer] of this._userAnswers.entries()) {
      if (this._questions[i]?.correct === answer) correct++;
    }
    return correct;
  }

  getResults(): AnswerResult[] {
    return this._questions.map((q, i) => ({
      question: q,
      userAnswerIndex: this._userAnswers.get(i) ?? -1,
      isCorrect: this._userAnswers.get(i) === q.correct,
      userAnswerText: this._userTextAnswers.get(i),
    }));
  }

  /** 先頭から順番に n 問を選択する（練習モード用） */
  static pickInOrder(questions: Question[], n: number): Question[] {
    return questions.slice(0, Math.min(n, questions.length));
  }

  /** Fisher-Yates でランダムに n 問を選択する */
  static pickRandom(questions: Question[], n: number): Question[] {
    const count = Math.min(n, questions.length);
    const shuffled = [...questions];
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (shuffled.length - i));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled.slice(0, count);
  }

  /** フィルター条件に合う問題を返す */
  static filter(questions: Question[], filter: QuizFilter): Question[] {
    return questions.filter(
      (q) =>
        (filter.subject === "all" || q.subject === filter.subject) &&
        (filter.category === "all" || q.category === filter.category) &&
        (!filter.parentCategory || filter.parentCategory === "all" || q.parentCategory === filter.parentCategory),
    );
  }
}

/**
 * テキスト回答を正規化する（全角半角・前後空白を統一）。
 * caseSensitive が false（デフォルト）の場合は大文字小文字も統一する。
 */
function normalizeTextAnswer(text: string, caseSensitive = false): string {
  let result = text
    .trim()
    // 全角英数字を半角に変換
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 空白を除去
    .replace(/\s+/g, "");
  if (!caseSensitive) {
    result = result.toLowerCase();
  }
  return result;
}
