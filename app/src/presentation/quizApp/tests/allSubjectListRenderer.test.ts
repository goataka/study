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

  it("shuffleUnitsByDailySeed は同じ日付なら同じ順序を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00Z"));

    const units = [createUnit("english", "a"), createUnit("math", "b"), createUnit("japanese", "c")];
    const first = shuffleUnitsByDailySeed(units).map((u) => `${u.subject}:${u.categoryId}`);
    const second = shuffleUnitsByDailySeed(units).map((u) => `${u.subject}:${u.categoryId}`);
    expect(first).toEqual(second);

    vi.useRealTimers();
  });

  it("shuffleUnitsByDailySeed は日付が変わると順序が変わる", () => {
    const units = [createUnit("english", "a"), createUnit("math", "b"), createUnit("japanese", "c")];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00Z"));
    const day1 = shuffleUnitsByDailySeed(units).map((u) => `${u.subject}:${u.categoryId}`);

    vi.setSystemTime(new Date("2026-05-15T09:00:00Z"));
    const day2 = shuffleUnitsByDailySeed(units).map((u) => `${u.subject}:${u.categoryId}`);
    expect(day1).not.toEqual(day2);

    vi.useRealTimers();
  });
});
