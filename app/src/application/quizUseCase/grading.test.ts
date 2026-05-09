/**
 * QuizUseCase — 採点・wrongIds 進捗保存仕様
 */

import { QuizUseCase } from "../quizUseCase";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — 採点・進捗保存仕様", () => {
  it("間違えた問題は1〜2回正解しても wrongIds に残る", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 1回目正解
    const session1 = useCase.startSession("retry", { subject: "all", category: "all" });
    session1.selectAnswer(0, session1.questions[0]!.correct);
    useCase.submitSession(session1);
    expect(progressRepo.getStoredIds()).toContain("q1");

    // 2回目正解
    const session2 = useCase.startSession("retry", { subject: "all", category: "all" });
    session2.selectAnswer(0, session2.questions[0]!.correct);
    useCase.submitSession(session2);
    expect(progressRepo.getStoredIds()).toContain("q1");
  });

  it("間違えた問題は3回正解したら wrongIds から除かれる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("retry", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    expect(progressRepo.getStoredIds()).not.toContain("q1");
  });

  it("正解途中で不正解になると連続正解数がリセットされる", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 2回正解
    for (let i = 0; i < 2; i++) {
      const session = useCase.startSession("retry", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }
    expect(progressRepo.getStoredIds()).toContain("q1");

    // 不正解（リセット）
    const wrongSession = useCase.startSession("retry", { subject: "all", category: "all" });
    const wrongIndex = wrongSession.questions[0]!.correct === 0 ? 1 : 0;
    wrongSession.selectAnswer(0, wrongIndex);
    useCase.submitSession(wrongSession);
    expect(progressRepo.getStoredIds()).toContain("q1");
    expect(progressRepo.getStoredStreaks()["q1"]).toBe(0);

    // もう一度2回正解しても除かれない（リセット後なので3回必要）
    for (let i = 0; i < 2; i++) {
      const session = useCase.startSession("retry", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }
    expect(progressRepo.getStoredIds()).toContain("q1");
  });

  it("不正解の問題は wrongIds に追加される", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex); // 不正解
    useCase.submitSession(session);

    expect(progressRepo.getStoredIds()).toContain("q1");
  });

  it("wrongIds にない問題を正解すると連続正解数がカウントされる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    session.selectAnswer(0, session.questions[0]!.correct);
    useCase.submitSession(session);

    expect(progressRepo.getStoredIds()).not.toContain("q1");
    expect(progressRepo.getStoredStreaks()["q1"]).toBe(1);
  });
});
