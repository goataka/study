/**
 * QuizUseCase — 問題のロード・クイズセッションの開始・進捗の保存を統括する。
 * ポート（インターフェース）に依存し、具体的な実装には依存しない。
 */

import type { Question } from "../domain/question";
import { QuizSession } from "../domain/quizSession";
import type { QuizMode, QuizFilter, AnswerResult } from "../domain/quizSession";
import type { IQuestionRepository, IProgressRepository, QuizRecord } from "./ports";

export type { QuizMode, QuizFilter, AnswerResult, QuizRecord };

export class QuizUseCase {
  private allQuestions: Question[] = [];
  private wrongIds: string[];

  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly progressRepo: IProgressRepository
  ) {
    this.wrongIds = this.progressRepo.loadWrongIds();
  }

  async initialize(): Promise<void> {
    this.allQuestions = await this.questionRepo.loadAll();
  }

  getFilteredQuestions(filter: QuizFilter): Question[] {
    return QuizSession.filter(this.allQuestions, filter);
  }

  getWrongCount(filter: QuizFilter): number {
    const filtered = this.getFilteredQuestions(filter);
    const wrongSet = new Set(this.wrongIds);
    return filtered.filter((q) => wrongSet.has(q.id)).length;
  }

  getCategoriesForSubject(subject: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }

  getParentCategoriesForSubject(subject: string): Record<string, string> {
    const parentCategories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.parentCategory && !(q.parentCategory in parentCategories)) {
        parentCategories[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
      }
    }
    return parentCategories;
  }

  getCategoriesForParent(subject: string, parentCategory: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.parentCategory === parentCategory && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }

  startSession(mode: QuizMode, filter: QuizFilter, count = 10): QuizSession {
    const filtered = this.getFilteredQuestions(filter);

    if (mode === "random") {
      const questions = QuizSession.pickRandom(filtered, count);
      return new QuizSession(questions);
    } else {
      const wrongSet = new Set(this.wrongIds);
      const retryQuestions = filtered.filter((q) => wrongSet.has(q.id));
      if (retryQuestions.length === 0) {
        throw new Error("間違えた問題がありません");
      }
      return new QuizSession(retryQuestions);
    }
  }

  submitSession(session: QuizSession): AnswerResult[] {
    const results = session.getResults();

    for (const r of results) {
      if (r.isCorrect) {
        this.wrongIds = this.wrongIds.filter((id) => id !== r.question.id);
      } else if (!this.wrongIds.includes(r.question.id)) {
        this.wrongIds.push(r.question.id);
      }
    }

    this.progressRepo.saveWrongIds(this.wrongIds);
    return results;
  }

  /**
   * クイズ結果を履歴に追加して保存する。
   */
  addHistoryRecord(results: AnswerResult[], filter: QuizFilter, mode: QuizMode): void {
    if (results.length === 0) return;

    const firstQuestion = results[0]!.question;
    const subjectName = firstQuestion.subjectName ?? firstQuestion.subject;
    const categoryName = firstQuestion.categoryName ?? firstQuestion.category;

    const correctCount = results.filter((r) => r.isCorrect).length;
    const record: QuizRecord = {
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      subject: filter.subject,
      subjectName,
      category: filter.category,
      categoryName: filter.category === "all" ? `${subjectName} 全体` : categoryName,
      mode,
      totalCount: results.length,
      correctCount,
      entries: results.map((r) => ({
        questionId: r.question.id,
        questionText: r.question.question,
        isCorrect: r.isCorrect,
        userAnswerIndex: r.userAnswerIndex,
        correctAnswerIndex: r.question.correct,
        choices: [...r.question.choices],
        explanation: r.question.explanation,
        categoryName: r.question.categoryName ?? r.question.category,
      })),
    };

    const history = this.progressRepo.loadHistory();
    history.unshift(record);
    this.progressRepo.saveHistory(history);
  }

  getHistory(): QuizRecord[] {
    return this.progressRepo.loadHistory();
  }

  get wrongQuestionIds(): string[] {
    return [...this.wrongIds];
  }
}
