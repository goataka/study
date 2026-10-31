import type { Question } from "../domain/question";
import type { CategoryStage, CategoryStageRecord, IProgressRepository } from "./ports";
import { QuizProgressService } from "./quizProgressService";

/** 単元ごとの学習ステージを管理する。 */
export class CategoryStageService {
  private stages: Record<string, CategoryStageRecord>;

  constructor(
    private readonly progressRepo: IProgressRepository,
    private readonly quizProgress: QuizProgressService,
  ) {
    this.stages = this.progressRepo.loadCategoryStages();
  }

  reload(): void {
    this.stages = this.progressRepo.loadCategoryStages();
  }

  clear(): void {
    this.stages = {};
  }

  get(subject: string, categoryId: string): { stage: CategoryStage; lastCompletedAt: string | null } {
    const record = this.stages[this.key(subject, categoryId)];
    return record
      ? { stage: record.stage, lastCompletedAt: record.lastCompletedAt }
      : { stage: 0, lastCompletedAt: null };
  }

  advance(subject: string, categoryId: string, questions: Question[]): void {
    const key = this.key(subject, categoryId);
    const currentStage = this.stages[key]?.stage ?? 0;
    if (currentStage >= 3) return;

    const newStage = (currentStage + 1) as CategoryStage;
    this.stages[key] = { stage: newStage, lastCompletedAt: new Date().toISOString() };
    this.progressRepo.saveCategoryStages(this.stages);

    if (newStage < 3) {
      this.quizProgress.resetQuestions(new Set(questions.map((question) => question.id)));
    }
  }

  getTodayAdvancedCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return Object.values(this.stages).filter((record) => record.lastCompletedAt.startsWith(today)).length;
  }

  private key(subject: string, categoryId: string): string {
    return `${subject}::${categoryId}`;
  }
}
