import type { ProgressDetailViewMode, ProgressGradeFilter, ProgressStatusFilter } from "./urlStateService";

export class QuizAppProgressViewState {
  progressDetailViewMode: ProgressDetailViewMode = "matrix";
  progressMatrixTransposed = false;
  progressStatusFilter: ProgressStatusFilter = "all";
  progressGradeFilter: ProgressGradeFilter | null = null;

  constructor(public progressSubjectId: string) {}
}
