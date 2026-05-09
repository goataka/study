/**
 * QuizUseCase — セッション開始仕様
 */

import { QuizUseCase } from "../quizUseCase";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — セッション開始仕様", () => {
  const questions = Array.from({ length: 15 }, (_, i) => makeQuestion(`q${i}`));

  let useCase: QuizUseCase;

  beforeEach(async () => {
    useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
  });

  it("practiceモードで先頭から順番に問題が出題される", () => {
    const session = useCase.startSession("practice", { subject: "all", category: "all" }, 5);
    expect(session.totalCount).toBe(5);
  });

  it("practiceモードで問題数より少ない件数を指定できる", () => {
    const session = useCase.startSession("practice", { subject: "all", category: "all" }, 3);
    expect(session.totalCount).toBe(3);
  });

  it("randomモードで最大20問のセッションが開始される", () => {
    const session = useCase.startSession("random", { subject: "all", category: "all" });
    expect(session.totalCount).toBeLessThanOrEqual(20);
  });

  it("retryモードで間違えた問題がなければエラー", () => {
    expect(() => useCase.startSession("retry", { subject: "all", category: "all" })).toThrow(
      "間違えた問題がありません",
    );
  });

  it("retryモードで間違えた問題のみが出題される", () => {
    const wrongQuestions = [makeQuestion("wrong-1"), makeQuestion("wrong-2")];
    const progressRepo = new StubProgressRepository(["wrong-1", "wrong-2"]);
    const repo = new StubQuestionRepository([...questions, ...wrongQuestions]);
    const uc = new QuizUseCase(repo, progressRepo);
    return uc.initialize().then(() => {
      const session = uc.startSession("retry", { subject: "all", category: "all" });
      expect(session.totalCount).toBe(2);
    });
  });
});
