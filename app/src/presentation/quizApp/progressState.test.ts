import { describe, expect, it } from "vitest";
import { QuizAppProgressViewState } from "./progressState";

describe("QuizAppProgressViewState", () => {
  it("進度タブの初期表示状態を保持できる", () => {
    const state = new QuizAppProgressViewState("english");

    expect(state).toMatchObject({
      progressSubjectId: "english",
      progressDetailViewMode: "matrix",
      progressMatrixTransposed: false,
      progressStatusFilter: "all",
      progressGradeFilter: null,
    });
  });
});
