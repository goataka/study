import { CategoryRegistry } from "../domain/categoryRegistry";
import type { CategoryStage } from "./ports";

/** グローバルおすすめ単元の1件 */
export interface GlobalRecommendedUnit {
  subject: string;
  categoryId: string;
  categoryName: string;
  stage: CategoryStage;
  lastCompletedAt: string | null;
  referenceGrade?: string;
  mastered: number;
  totalQuestions: number;
  inProgressCount: number;
  type: "unlearned" | "review";
}

/** 全教科横断のおすすめ単元を選定する。 */
export class GlobalRecommendationService {
  constructor(
    private readonly categoryRegistry: CategoryRegistry,
    private readonly getCategoryStage: (
      subject: string,
      categoryId: string,
    ) => {
      stage: CategoryStage;
      lastCompletedAt: string | null;
    },
    private readonly getMasteredCount: (subject: string, categoryId: string) => { mastered: number; total: number },
    private readonly getInProgressCount: (subject: string, categoryId: string) => number,
  ) {}

  getRecommendedUnits(goalCount: number, alphaCount: number): GlobalRecommendedUnit[] {
    const total = goalCount + alphaCount;
    const subjects = sortSubjectsByStudyPriority(this.categoryRegistry.getSubjects());
    const now = new Date();
    const unlearnedBySubject = new Map<string, GlobalRecommendedUnit[]>();
    const reviewReadyBySubject = new Map<string, GlobalRecommendedUnit[]>();
    subjects.forEach((subject) => {
      unlearnedBySubject.set(subject, []);
      reviewReadyBySubject.set(subject, []);
    });

    for (const subjectId of subjects) {
      const maxGrade = this.getUnlockedMaxGrade(subjectId);
      for (const [categoryId, categoryName] of Object.entries(
        this.categoryRegistry.getCategoriesForSubject(subjectId),
      )) {
        const stageRecord = this.getCategoryStage(subjectId, categoryId);
        if (stageRecord.stage >= 3 || !this.arePrerequisitesMet(subjectId, categoryId)) continue;

        const grade = this.categoryRegistry.getCategoryReferenceGrade(subjectId, categoryId);
        if (grade && maxGrade !== null && !isGradeWithinLimit(grade, maxGrade)) continue;

        const { mastered, total: totalQuestions } = this.getMasteredCount(subjectId, categoryId);
        if (totalQuestions > 0 && mastered === totalQuestions) continue;

        const unit: GlobalRecommendedUnit = {
          subject: subjectId,
          categoryId,
          categoryName,
          stage: stageRecord.stage,
          lastCompletedAt: stageRecord.lastCompletedAt,
          referenceGrade: grade,
          mastered,
          totalQuestions,
          inProgressCount: this.getInProgressCount(subjectId, categoryId),
          type: stageRecord.stage === 0 ? "unlearned" : "review",
        };

        if (stageRecord.stage === 0) {
          unlearnedBySubject.get(subjectId)?.push(unit);
        } else {
          const waitDays = stageRecord.stage === 1 ? 7 : 14;
          if (stageRecord.lastCompletedAt && isWaitPeriodElapsed(stageRecord.lastCompletedAt, waitDays, now)) {
            reviewReadyBySubject.get(subjectId)?.push(unit);
          }
        }
      }
    }

    reviewReadyBySubject.forEach((units) => shuffleArray(units));
    const result: GlobalRecommendedUnit[] = [];
    let nextUnlearnedSubjectIndex = 0;
    let nextReviewSubjectIndex = 0;
    let shouldPickUnlearned = true;

    while (result.length < total && (hasQueuedUnits(unlearnedBySubject) || hasQueuedUnits(reviewReadyBySubject))) {
      if (shouldPickUnlearned) {
        const nextUnlearned = dequeueNextUnit(unlearnedBySubject, subjects, nextUnlearnedSubjectIndex);
        if (nextUnlearned) {
          result.push(nextUnlearned.unit);
          nextUnlearnedSubjectIndex = nextUnlearned.nextSubjectIndex;
          shouldPickUnlearned = false;
          continue;
        }
      }
      const nextReview = dequeueNextUnit(reviewReadyBySubject, subjects, nextReviewSubjectIndex);
      if (nextReview) {
        result.push(nextReview.unit);
        nextReviewSubjectIndex = nextReview.nextSubjectIndex;
        shouldPickUnlearned = true;
        continue;
      }
      const fallbackUnlearned = dequeueNextUnit(unlearnedBySubject, subjects, nextUnlearnedSubjectIndex);
      if (!fallbackUnlearned) break;
      result.push(fallbackUnlearned.unit);
      nextUnlearnedSubjectIndex = fallbackUnlearned.nextSubjectIndex;
      shouldPickUnlearned = false;
    }

    return result.slice(0, total);
  }

  arePrerequisitesMet(subjectId: string, categoryId: string): boolean {
    return this.categoryRegistry
      .getCategoryPrerequisites(subjectId, categoryId)
      .every((prerequisiteId) => this.getCategoryStage(subjectId, prerequisiteId).stage >= 1);
  }

  private getUnlockedMaxGrade(subjectId: string): string | null {
    const grades = this.categoryRegistry.getUniqueGradesForSubject(subjectId);
    if (grades.length === 0) return null;
    const sortedGrades = [...grades].sort((a, b) => gradeOrder(a) - gradeOrder(b));
    let maxUnlockedIndex = -1;
    for (let index = 0; index < sortedGrades.length; index++) {
      const grade = sortedGrades[index]!;
      const categories = this.categoryRegistry.getCategoriesForGrade(subjectId, grade);
      const allLearned = Object.keys(categories).every(
        (categoryId) => this.getCategoryStage(subjectId, categoryId).stage >= 1,
      );
      if (allLearned && Object.keys(categories).length > 0) maxUnlockedIndex = index;
      else break;
    }
    const limitIndex = maxUnlockedIndex + 1;
    return limitIndex >= sortedGrades.length ? null : (sortedGrades[limitIndex] ?? sortedGrades[0] ?? null);
  }
}

function gradeOrder(grade: string): number {
  const map: Record<string, number> = {
    小学1年: 1,
    小学2年: 2,
    小学3年: 3,
    小学4年: 4,
    小学5年: 5,
    小学6年: 6,
    中学1年: 7,
    中学2年: 8,
    中学3年: 9,
    高校1年: 10,
    高校2年: 11,
    高校3年: 12,
  };
  if (grade in map) return map[grade]!;
  if (grade.startsWith("小")) return 1;
  if (grade.startsWith("中")) return 7;
  if (grade.startsWith("高")) return 10;
  return 99;
}

function isGradeWithinLimit(grade: string, maxGrade: string | null): boolean {
  return maxGrade === null || gradeOrder(grade) <= gradeOrder(maxGrade);
}

function isWaitPeriodElapsed(lastCompletedAt: string, waitDays: number, now: Date): boolean {
  return (now.getTime() - new Date(lastCompletedAt).getTime()) / (1000 * 60 * 60 * 24) >= waitDays;
}

function shuffleArray<T>(items: T[]): void {
  for (let index = items.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex]!, items[index]!];
  }
}

function sortSubjectsByStudyPriority(subjects: string[]): string[] {
  const priority: Record<string, number> = { japanese: 0, math: 1, english: 2 };
  return [...subjects].sort(
    (a, b) => (priority[a] ?? Number.MAX_SAFE_INTEGER) - (priority[b] ?? Number.MAX_SAFE_INTEGER),
  );
}

function dequeueNextUnit(
  queuesBySubject: Map<string, GlobalRecommendedUnit[]>,
  subjectOrder: string[],
  startIndex: number,
): { unit: GlobalRecommendedUnit; nextSubjectIndex: number } | null {
  for (let offset = 0; offset < subjectOrder.length; offset++) {
    const subjectIndex = (startIndex + offset) % subjectOrder.length;
    const queue = queuesBySubject.get(subjectOrder[subjectIndex]!);
    const unit = queue?.shift();
    if (unit) return { unit, nextSubjectIndex: (subjectIndex + 1) % subjectOrder.length };
  }
  return null;
}

function hasQueuedUnits(queuesBySubject: Map<string, GlobalRecommendedUnit[]>): boolean {
  return Array.from(queuesBySubject.values()).some((queue) => queue.length > 0);
}
