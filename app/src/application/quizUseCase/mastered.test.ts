/**
 * QuizUseCase — masteredIds（習得済み）仕様
 */

import { QuizUseCase } from "../quizUseCase";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — masteredIds（習得済み）仕様", () => {
  it("3回連続正解で masteredIds に追加される", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    expect(progressRepo.getStoredMasteredIds()).toContain("q1");
    expect(useCase.isMastered("q1")).toBe(true);
  });

  it("2回連続正解では masteredIds に追加されない", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 2; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    expect(progressRepo.getStoredMasteredIds()).not.toContain("q1");
    expect(useCase.isMastered("q1")).toBe(false);
  });

  it("3回連続正解後に不正解でも masteredIds から除かれない", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 3回連続正解で習得済みに
    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }
    expect(progressRepo.getStoredMasteredIds()).toContain("q1");

    // 習得済みの問題は startSession("random") では除外されるため startSessionWithAllQuestions で全問から取得する
    const session = useCase.startSessionWithAllQuestions("random", { subject: "all", category: "all" });
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex); // 不正解
    useCase.submitSession(session);

    // 習得済みは維持される
    expect(progressRepo.getStoredMasteredIds()).toContain("q1");
    expect(useCase.isMastered("q1")).toBe(true);
  });

  it("習得済みの問題は不正解でも wrongIds に追加されない", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 3回連続正解で習得済みに
    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }
    expect(progressRepo.getStoredMasteredIds()).toContain("q1");

    // 全問出題モードで不正解にしても wrongIds に追加されない
    const session = useCase.startSessionWithAllQuestions("random", { subject: "all", category: "all" });
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex); // 不正解
    useCase.submitSession(session);

    // 習得済み問題は wrongIds に追加されない（学習済み状態を維持する）
    expect(progressRepo.getStoredIds()).not.toContain("q1");
    // 習得済み問題は不正解でも correctStreaks がリセットされない（undefined のまま）
    expect(progressRepo.getStoredStreaks()["q1"]).toBeUndefined();
  });

  // 全問習得済み時の startSession 挙動を mode 別にパラメタライズで検証する
  describe.each([
    { mode: "random" as const, label: "startSession('random')" },
    { mode: "practice" as const, label: "startSession('practice')" },
  ])("$label の全問習得済み時挙動", ({ mode }) => {
    it("ALL_MASTERED をスローする", async () => {
      const q = makeQuestion("q1");
      const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
      const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
      await useCase.initialize();

      expect(() => useCase.startSession(mode, { subject: "all", category: "all" })).toThrow("ALL_MASTERED");
    });
  });

  it("全問習得済み時に startSessionWithAllQuestions は習得済み問題も含めて開始できる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSessionWithAllQuestions("random", { subject: "all", category: "all" });
    expect(session.totalCount).toBe(1);
  });

  it("3回連続正解後に correctStreaks から問題が削除される", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    // ストリークは削除され 0 になる
    expect(useCase.getCorrectStreak("q1")).toBe(0);
    expect(progressRepo.getStoredStreaks()["q1"]).toBeUndefined();
  });

  it("getMasteredIds は masteredIds のコピーを返す", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const ids = useCase.getMasteredIds();
    ids.push("tampered");
    // 内部状態が変更されないこと
    expect(useCase.getMasteredIds()).not.toContain("tampered");
  });
});
