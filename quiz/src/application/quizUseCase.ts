/**
 * QuizUseCase — orchestrates loading questions, starting quiz sessions,
 * and persisting progress. Depends on ports (interfaces), not implementations.
 */

import type { Question } from "../domain/question";
import { QuizSession } from "../domain/quizSession";
import type { QuizMode, QuizFilter, AnswerResult } from "../domain/quizSession";
import type { IQuestionRepository, IProgressRepository } from "./ports";

export type { QuizMode, QuizFilter, AnswerResult };

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

  startSession(mode: QuizMode, filter: QuizFilter): QuizSession {
    const filtered = this.getFilteredQuestions(filter);

    if (mode === "random") {
      const questions = QuizSession.pickRandom(filtered, 10);
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

  get wrongQuestionIds(): string[] {
    return [...this.wrongIds];
  }
}
