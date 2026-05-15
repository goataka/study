// @vitest-environment jsdom

import type { GlobalRecommendedUnit } from "../../../application/quizUseCase";
import { hashString, shuffleUnitsByDailySeed } from "../allSubjectListRenderer";

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

describe("allSubjectListRenderer の日替わり並び替え", () => {
  it("hashString は同じ入力で同じ値を返す", () => {
    expect(hashString("english:phonics-1")).toBe(hashString("english:phonics-1"));
  });

  it("hashString は異なる入力で異なる値を返す", () => {
    expect(hashString("english:phonics-1")).not.toBe(hashString("math:addition"));
  });

  it("shuffleUnitsByDailySeed は入力順を維持する", () => {
    const units = [createUnit("english", "a"), createUnit("math", "b"), createUnit("japanese", "c")];
    expect(shuffleUnitsByDailySeed(units).map((u) => `${u.subject}:${u.categoryId}`)).toEqual([
      "english:a",
      "math:b",
      "japanese:c",
    ]);
  });

  it("shuffleUnitsByDailySeed は同じ教科が続いても並び順を変えない", () => {
    const units = [createUnit("english", "a"), createUnit("english", "b"), createUnit("math", "x")];
    expect(shuffleUnitsByDailySeed(units).map((u) => `${u.subject}:${u.categoryId}`)).toEqual([
      "english:a",
      "english:b",
      "math:x",
    ]);
  });

  it("shuffleUnitsByDailySeed は単一教科が大多数を占める（片寄り大）場合もすべての単元を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00Z"));

    // english が 5件、math が 1件 → english が math を枯渇させた後も止まらないことを確認
    const units = [
      createUnit("english", "a"),
      createUnit("english", "b"),
      createUnit("english", "c"),
      createUnit("english", "d"),
      createUnit("english", "e"),
      createUnit("math", "x"),
    ];
    const result = shuffleUnitsByDailySeed(units);
    expect(result).toHaveLength(6);

    vi.useRealTimers();
  });

  it("shuffleUnitsByDailySeed は単一教科の場合もすべての単元を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00Z"));

    const units = [createUnit("english", "a"), createUnit("english", "b"), createUnit("english", "c")];
    const result = shuffleUnitsByDailySeed(units);
    expect(result).toHaveLength(3);

    vi.useRealTimers();
  });

  it("shuffleUnitsByDailySeed は空配列に対して空配列を返す", () => {
    expect(shuffleUnitsByDailySeed([])).toEqual([]);
  });
});
