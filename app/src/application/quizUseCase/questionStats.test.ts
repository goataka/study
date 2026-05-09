/**
 * QuizUseCase — questionStats（問題別統計）／getInProgressCount／getAllQuestionStats 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — questionStats（問題別統計）仕様", () => {
  it("正解した問題の total と correct が 1 ずつ増える", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    session.selectAnswer(0, session.questions[0]!.correct);
    useCase.submitSession(session);

    const stat = progressRepo.getStoredStats()["q1"];
    expect(stat).toEqual({ total: 1, correct: 1 });
  });

  it("不正解の場合は total のみ増え correct は増えない", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex);
    useCase.submitSession(session);

    const stat = progressRepo.getStoredStats()["q1"];
    expect(stat).toEqual({ total: 1, correct: 0 });
  });

  it("複数回回答した場合に total と correct が累積される", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 1回目: 正解
    const s1 = useCase.startSession("retry", { subject: "all", category: "all" });
    s1.selectAnswer(0, s1.questions[0]!.correct);
    useCase.submitSession(s1);

    // 2回目: 不正解
    const s2 = useCase.startSession("retry", { subject: "all", category: "all" });
    const wrongIndex = s2.questions[0]!.correct === 0 ? 1 : 0;
    s2.selectAnswer(0, wrongIndex);
    useCase.submitSession(s2);

    const stat = progressRepo.getStoredStats()["q1"];
    expect(stat?.total).toBe(2);
    expect(stat?.correct).toBe(1);
  });

  it("getQuestionStat は保存済み統計を返す", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, { q1: { total: 5, correct: 3 } });
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    expect(useCase.getQuestionStat("q1")).toEqual({ total: 5, correct: 3 });
  });

  it("統計がない問題では getQuestionStat が { total: 0, correct: 0 } を返す", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    expect(useCase.getQuestionStat("q1")).toEqual({ total: 0, correct: 0 });
  });

  it("submitSession 後に progressRepo.saveQuestionStats が更新値で呼ばれる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const saveSpy = vi.spyOn(progressRepo, "saveQuestionStats");
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    session.selectAnswer(0, session.questions[0]!.correct);
    useCase.submitSession(session);

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ q1: { total: 1, correct: 1 } }));
  });
});

describe("QuizUseCase — getInProgressCount / getAllQuestionStats 仕様", () => {
  it("1回以上回答済みで未習得の問題をカウントする", async () => {
    const q1 = makeQuestion("q1");
    const q2 = makeQuestion("q2");
    const q3 = makeQuestion("q3");
    // q1: 回答済み・未習得（学習中）
    // q2: 回答済み・習得済み（masteredIds に含まれる）
    // q3: 未回答・未習得
    const stats = { q1: { total: 1, correct: 0 }, q2: { total: 2, correct: 2 } };
    const progressRepo = new StubProgressRepository([], [], {}, stats, ["q2"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q1, q2, q3]), progressRepo);
    await useCase.initialize();

    const count = useCase.getInProgressCount({ subject: "english", category: "phonics" });

    // q1 のみが学習中（1回以上回答済み・未習得）
    expect(count).toBe(1);
  });

  it("masteredIds に含まれる問題はカウントされない", async () => {
    const q1 = makeQuestion("q1");
    const stats = { q1: { total: 3, correct: 3 } };
    const progressRepo = new StubProgressRepository([], [], {}, stats, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q1]), progressRepo);
    await useCase.initialize();

    const count = useCase.getInProgressCount({ subject: "english", category: "phonics" });

    expect(count).toBe(0);
  });

  it("未回答の問題はカウントされない", async () => {
    const q1 = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, []);
    const useCase = new QuizUseCase(new StubQuestionRepository([q1]), progressRepo);
    await useCase.initialize();

    const count = useCase.getInProgressCount({ subject: "english", category: "phonics" });

    expect(count).toBe(0);
  });

  it("getAllQuestionStats() は questionStats の浅いコピーを返す", async () => {
    const q1 = makeQuestion("q1");
    const stats = { q1: { total: 2, correct: 1 } };
    const progressRepo = new StubProgressRepository([], [], {}, stats, []);
    const useCase = new QuizUseCase(new StubQuestionRepository([q1]), progressRepo);
    await useCase.initialize();

    const result = useCase.getAllQuestionStats();

    expect(result["q1"]).toEqual({ total: 2, correct: 1 });
    // 呼び出し側がミューテートしてもユースケース内部に影響しない
    (result as Record<string, { total: number; correct: number }>)["q1"] = { total: 99, correct: 99 };
    expect(useCase.getQuestionStat("q1")).toEqual({ total: 2, correct: 1 });
  });
});
