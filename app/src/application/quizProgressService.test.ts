import { describe, expect, it } from "vitest";
import type { AnswerResult } from "../domain/quizSession";
import { QuizProgressService } from "./quizProgressService";
import { StubProgressRepository, makeQuestion } from "./quizUseCase/testHelpers";

describe("QuizProgressService", () => {
  it("通常ステージでは3回連続正解で問題を習得済みにする", () => {
    const progressRepo = new StubProgressRepository();
    const service = new QuizProgressService(progressRepo);
    const result: AnswerResult = { question: makeQuestion("q1"), userAnswerIndex: 0, isCorrect: true };

    service.submit([result], () => 0);
    service.submit([result], () => 0);
    service.submit([result], () => 0);

    expect(service.isMastered("q1")).toBe(true);
    expect(service.getCorrectStreak("q1")).toBe(0);
  });
});
