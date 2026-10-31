import { describe, expect, it } from "vitest";
import { CategoryStageService } from "./categoryStageService";
import { QuizProgressService } from "./quizProgressService";
import { StubProgressRepository, makeQuestion } from "./quizUseCase/testHelpers";

describe("CategoryStageService", () => {
  it("ステージ進行時に対象問題の進捗をリセットできる", () => {
    const progressRepo = new StubProgressRepository(["q1"], [], { q1: 2 }, { q1: { total: 2, correct: 2 } }, ["q1"]);
    const progress = new QuizProgressService(progressRepo);
    const service = new CategoryStageService(progressRepo, progress);

    service.advance("english", "phonics", [makeQuestion("q1")]);

    expect(service.get("english", "phonics").stage).toBe(1);
    expect(progressRepo.getStoredIds()).not.toContain("q1");
    expect(progressRepo.getStoredMasteredIds()).not.toContain("q1");
    expect(progressRepo.getStoredStreaks().q1).toBeUndefined();
    expect(progressRepo.getStoredStats().q1).toBeUndefined();
  });
});
