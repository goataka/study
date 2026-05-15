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

  it("shuffleUnitsByDailySeed は同じ教科が連続しないように並べ替える", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:00:00Z"));

    const units = [
      createUnit("english", "a"),
      createUnit("english", "b"),
      createUnit("english", "c"),
      createUnit("math", "x"),
      createUnit("math", "y"),
      createUnit("japanese", "p"),
    ];
    const result = shuffleUnitsByDailySeed(units);

    // 隣接する要素が同じ教科でないことを確認する
    for (let i = 0; i < result.length - 1; i++) {
      const curr = result[i];
      const next = result[i + 1];
      if (curr !== undefined && next !== undefined) {
        expect(curr.subject).not.toBe(next.subject);
      }
    }

    vi.useRealTimers();
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
