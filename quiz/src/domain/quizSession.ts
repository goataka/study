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
}

export class QuizSession {
  private readonly _questions: Question[];
  private _currentIndex = 0;
  private _userAnswers: Map<number, number> = new Map();

  constructor(questions: Question[]) {
    if (questions.length === 0) {
      throw new Error("QuizSession requires at least one question");
    }
    // 選択肢をシャッフルして保存（問題IDに基づく決定論的シャッフル）
    this._questions = questions.map(q => shuffleChoices(q));
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

  getAnswer(questionIndex: number): number | undefined {
    return this._userAnswers.get(questionIndex);
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
        (!filter.parentCategory || filter.parentCategory === "all" || q.parentCategory === filter.parentCategory)
    );
  }
}
