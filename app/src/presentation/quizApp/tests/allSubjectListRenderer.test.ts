// @vitest-environment jsdom

import type { GlobalRecommendedUnit } from "../../../application/quizUseCase";
import { materializeRecommendedUnits } from "../allSubjectListRenderer";

function createUnit(subject: string, categoryId: string): GlobalRecommendedUnit {
  return {
    subject,
    categoryId,
    categoryName: categoryId,
    stage: 1,
    lastCompletedAt: null,
    mastered: 0,
    totalQuestions: 10,
    inProgressCount: 0,
    type: "unlearned",
  };
}

describe("allSubjectListRenderer のおすすめ単元整形", () => {
  it("materializeRecommendedUnits は入力順を維持する", () => {
    const units = [createUnit("english", "a"), createUnit("math", "b"), createUnit("japanese", "c")];
    expect(materializeRecommendedUnits(units).map((u) => `${u.subject}:${u.categoryId}`)).toEqual([
      "english:a",
      "math:b",
      "japanese:c",
    ]);
  });

  it("materializeRecommendedUnits は同じ教科が続いても並び順を変えない", () => {
    const units = [createUnit("english", "a"), createUnit("english", "b"), createUnit("math", "x")];
    expect(materializeRecommendedUnits(units).map((u) => `${u.subject}:${u.categoryId}`)).toEqual([
      "english:a",
      "english:b",
      "math:x",
    ]);
  });

  it("materializeRecommendedUnits は単一教科が大多数を占める（片寄り大）場合もすべての単元を返す", () => {
    const units = [
      createUnit("english", "a"),
      createUnit("english", "b"),
      createUnit("english", "c"),
      createUnit("english", "d"),
      createUnit("english", "e"),
      createUnit("math", "x"),
    ];
    const result = materializeRecommendedUnits(units);
    expect(result).toHaveLength(6);
  });

  it("materializeRecommendedUnits は単一教科の場合もすべての単元を返す", () => {
    const units = [createUnit("english", "a"), createUnit("english", "b"), createUnit("english", "c")];
    const result = materializeRecommendedUnits(units);
    expect(result).toHaveLength(3);
  });

  it("materializeRecommendedUnits は空配列に対して空配列を返す", () => {
    expect(materializeRecommendedUnits([])).toEqual([]);
  });
});
