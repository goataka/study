import { describe, expect, it } from "vitest";
import { CategoryRegistry } from "../domain/categoryRegistry";
import { GlobalRecommendationService } from "./globalRecommendationService";
import { makeQuestion } from "./quizUseCase/testHelpers";

describe("GlobalRecommendationService", () => {
  it("検定済みと前提未達の単元を除外しておすすめを返す", () => {
    const registry = new CategoryRegistry([
      makeQuestion("q1", "math", "addition"),
      { ...makeQuestion("q2", "math", "multiplication"), prerequisites: ["addition"] },
      makeQuestion("q3", "english", "phonics"),
    ]);
    const stages = new Map([["english::phonics", { stage: 3 as const, lastCompletedAt: "2025-01-01T00:00:00.000Z" }]]);
    const service = new GlobalRecommendationService(
      registry,
      (subject, categoryId) => stages.get(`${subject}::${categoryId}`) ?? { stage: 0, lastCompletedAt: null },
      () => ({ mastered: 0, total: 1 }),
      () => 0,
    );

    expect(service.getRecommendedUnits(5, 0).map((unit) => unit.categoryId)).toEqual(["addition"]);
  });
});
