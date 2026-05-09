/**
 * QuizUseCase — 初期化／フィルター仕様
 */

import { QuizUseCase } from "../quizUseCase";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — 初期化仕様", () => {
  it("initialize() で全問題をロードする", async () => {
    const questions = [makeQuestion("q1"), makeQuestion("q2")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
    expect(useCase.getFilteredQuestions({ subject: "all", category: "all" })).toHaveLength(2);
  });
});

describe("QuizUseCase — フィルター仕様", () => {
  const questions = [
    makeQuestion("q1", "english", "phonics"),
    makeQuestion("q2", "english", "linking"),
    makeQuestion("q3", "math", "addition"),
  ];

  let useCase: QuizUseCase;

  beforeEach(async () => {
    useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
  });

  it("教科フィルターが機能する", () => {
    const filtered = useCase.getFilteredQuestions({ subject: "english", category: "all" });
    expect(filtered).toHaveLength(2);
  });

  it("教科の categories が取得できる", () => {
    const cats = useCase.getCategoriesForSubject("english");
    expect(Object.keys(cats)).toContain("phonics");
    expect(Object.keys(cats)).toContain("linking");
  });
});
