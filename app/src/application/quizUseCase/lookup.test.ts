/**
 * QuizUseCase — getQuestionById / clearAllData 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — getQuestionById 仕様", () => {
  it("存在する questionId で問題を返す", async () => {
    const q1 = makeQuestion("q1", "english", "phonics");
    const useCase = new QuizUseCase(new StubQuestionRepository([q1]), new StubProgressRepository());
    await useCase.initialize();

    const result = useCase.getQuestionById("q1");
    expect(result).toBeDefined();
    expect(result?.id).toBe("q1");
  });

  it("存在しない questionId では undefined を返す", async () => {
    const useCase = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1")]), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getQuestionById("nonexistent")).toBeUndefined();
  });

  it("initialize() 前は undefined を返す", async () => {
    const useCase = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1")]), new StubProgressRepository());
    expect(useCase.getQuestionById("q1")).toBeUndefined();
  });

  it("複数問題から正しい問題を取得できる", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics"),
      makeQuestion("q2", "math", "addition"),
      makeQuestion("q3", "english", "linking"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getQuestionById("q2")?.subject).toBe("math");
    expect(useCase.getQuestionById("q3")?.category).toBe("linking");
  });
});

describe("QuizUseCase — clearAllData 仕様", () => {
  it("clearAllData() 後に wrongIds・masteredIds・correctStreaks・questionStats がリセットされる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(["q1"], [], { q1: 2 }, { q1: { total: 5, correct: 3 } }, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    await useCase.clearAllData();

    expect(useCase.isMastered("q1")).toBe(false);
    expect(useCase.getCorrectStreak("q1")).toBe(0);
    expect(useCase.getQuestionStat("q1")).toEqual({ total: 0, correct: 0 });
  });

  it("clearAllData() 後に progressRepo の clearAllData が呼ばれる", async () => {
    const progressRepo = new StubProgressRepository();
    const clearSpy = vi.spyOn(progressRepo, "clearAllData");
    const useCase = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1")]), progressRepo);
    await useCase.initialize();

    await useCase.clearAllData();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it("clearAllData() 後にセッション開始を試みるとエラーにならない（問題は残っている）", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, []);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    await useCase.clearAllData();

    // 全データクリア後でも問題データは残るためセッションを開始できる
    expect(() => useCase.startSession("random", { subject: "all", category: "all" })).not.toThrow();
  });
});
