import type { AnswerResult } from "../domain/quizSession";
import type { Question } from "../domain/question";
import type { CategoryStage, IProgressRepository } from "./ports";

/** 問題ごとの回答状況と習得状態を管理する。 */
export class QuizProgressService {
  private wrongIds: string[];
  private wrongSet: Set<string>;
  private correctStreaks: Record<string, number>;
  private masteredIds: string[];
  private masteredSet: Set<string>;
  private questionStats: Record<string, { total: number; correct: number }>;

  constructor(private readonly progressRepo: IProgressRepository) {
    this.wrongIds = this.progressRepo.loadWrongIds();
    this.wrongSet = new Set(this.wrongIds);
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
    this.masteredIds = this.progressRepo.loadMasteredIds();
    this.masteredSet = new Set(this.masteredIds);
    this.questionStats = this.progressRepo.loadQuestionStats();
  }

  reload(): void {
    this.wrongIds = this.progressRepo.loadWrongIds();
    this.wrongSet = new Set(this.wrongIds);
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
    this.masteredIds = this.progressRepo.loadMasteredIds();
    this.masteredSet = new Set(this.masteredIds);
    this.questionStats = this.progressRepo.loadQuestionStats();
  }

  clear(): void {
    this.wrongIds = [];
    this.wrongSet = new Set();
    this.correctStreaks = {};
    this.masteredIds = [];
    this.masteredSet = new Set();
    this.questionStats = {};
  }

  submit(results: AnswerResult[], getCategoryStage: (question: Question) => CategoryStage): void {
    for (const result of results) {
      const questionId = result.question.id;
      const stat = this.questionStats[questionId] ?? { total: 0, correct: 0 };
      stat.total++;
      if (result.isCorrect) stat.correct++;
      this.questionStats[questionId] = stat;

      if (result.isCorrect) {
        this.correctStreaks[questionId] = (this.correctStreaks[questionId] ?? 0) + 1;
        const requiredStreak = getCategoryStage(result.question) > 0 ? 1 : 3;
        if (this.correctStreaks[questionId] >= requiredStreak) {
          if (!this.masteredSet.has(questionId)) {
            this.masteredIds.push(questionId);
            this.masteredSet.add(questionId);
          }
          delete this.correctStreaks[questionId];
          this.removeWrongId(questionId);
        }
      } else if (!this.masteredSet.has(questionId)) {
        this.addWrongId(questionId);
        this.correctStreaks[questionId] = 0;
      }
    }

    this.save();
  }

  resetQuestions(questionIds: Set<string>): void {
    this.masteredIds = this.masteredIds.filter((id) => !questionIds.has(id));
    for (const id of questionIds) {
      this.masteredSet.delete(id);
      delete this.correctStreaks[id];
      delete this.questionStats[id];
    }
    this.removeWrongIds(questionIds);
    this.progressRepo.saveMasteredIds(this.masteredIds);
    this.progressRepo.saveCorrectStreaks(this.correctStreaks);
    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveQuestionStats(this.questionStats);
  }

  markQuestionsAsLearned(questionIds: Set<string>): void {
    this.removeWrongIds(questionIds);
    for (const id of questionIds) {
      delete this.correctStreaks[id];
      if (!this.masteredSet.has(id)) {
        this.masteredIds.push(id);
        this.masteredSet.add(id);
      }
    }
    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveCorrectStreaks(this.correctStreaks);
    this.progressRepo.saveMasteredIds(this.masteredIds);
  }

  unmarkQuestionsAsLearned(questionIds: Set<string>): void {
    for (const id of questionIds) this.addWrongId(id);
    this.masteredIds = this.masteredIds.filter((id) => !questionIds.has(id));
    for (const id of questionIds) this.masteredSet.delete(id);
    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveMasteredIds(this.masteredIds);
  }

  isWrong(questionId: string): boolean {
    return this.wrongSet.has(questionId);
  }

  isMastered(questionId: string): boolean {
    return this.masteredSet.has(questionId);
  }

  getWrongIds(): string[] {
    return [...this.wrongIds];
  }

  getMasteredIds(): string[] {
    return [...this.masteredIds];
  }

  getCorrectStreak(questionId: string): number {
    return this.correctStreaks[questionId] ?? 0;
  }

  getQuestionStat(questionId: string): { total: number; correct: number } {
    return this.questionStats[questionId] ?? { total: 0, correct: 0 };
  }

  getAllQuestionStats(): Record<string, { total: number; correct: number }> {
    return { ...this.questionStats };
  }

  getInProgressCount(questions: Question[]): number {
    return questions.filter(
      (question) => (this.questionStats[question.id]?.total ?? 0) > 0 && !this.isMastered(question.id),
    ).length;
  }

  getCategoryProgressPct(questions: Question[], isStudied: boolean): number {
    if (questions.length === 0) return 0;
    let mastered = 0;
    let wrong = 0;
    for (const question of questions) {
      if (this.isMastered(question.id)) mastered++;
      if (this.isWrong(question.id)) wrong++;
    }
    if (!isStudied && mastered === 0 && wrong === 0) return 0;
    return Math.round((mastered / questions.length) * 100);
  }

  getMasteredCount(questions: Question[]): { mastered: number; total: number } {
    return {
      mastered: questions.filter((question) => this.isMastered(question.id)).length,
      total: questions.length,
    };
  }

  private save(): void {
    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveCorrectStreaks(this.correctStreaks);
    this.progressRepo.saveQuestionStats(this.questionStats);
    this.progressRepo.saveMasteredIds(this.masteredIds);
  }

  private addWrongId(id: string): void {
    if (this.wrongSet.has(id)) return;
    this.wrongIds.push(id);
    this.wrongSet.add(id);
  }

  private removeWrongId(id: string): void {
    if (!this.wrongSet.delete(id)) return;
    this.wrongIds = this.wrongIds.filter((wrongId) => wrongId !== id);
  }

  private removeWrongIds(ids: Set<string>): void {
    this.wrongIds = this.wrongIds.filter((wrongId) => !ids.has(wrongId));
    for (const id of ids) this.wrongSet.delete(id);
  }
}
