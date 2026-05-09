/**
 * QuizUseCase — getCategoryGuideUrl / getParentCategoryGuideUrl / getCategoryExample 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import type { Question } from "../../domain/question";
import { StubQuestionRepository, StubProgressRepository, makeQuestion, makeQuestionWithGuide } from "./testHelpers";

describe("QuizUseCase — getCategoryGuideUrl 仕様", () => {
  it("guideUrl を持つ問題のカテゴリでは URL が返る", async () => {
    const questions = [makeQuestionWithGuide("q1", "english", "phonics", "../english/pronunciation/01/guide")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryGuideUrl("english", "phonics")).toBe("../english/pronunciation/01/guide");
  });

  it("guideUrl を持たないカテゴリでは undefined が返る", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryGuideUrl("english", "phonics")).toBeUndefined();
  });

  it("存在しないカテゴリでは undefined が返る", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryGuideUrl("english", "nonexistent")).toBeUndefined();
  });

  it("複数問題がある場合は最初に見つかった guideUrl を返す", async () => {
    const questions = [
      makeQuestionWithGuide("q1", "english", "phonics", "../english/guide1"),
      makeQuestionWithGuide("q2", "english", "phonics", "../english/guide2"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryGuideUrl("english", "phonics")).toBe("../english/guide1");
  });
});

describe("QuizUseCase — getParentCategoryGuideUrl 仕様", () => {
  const makeQuestionWithParentGuide = (
    id: string,
    subject: string,
    category: string,
    parentCategory: string,
    parentCategoryGuideUrl: string,
  ): Question => ({
    ...makeQuestion(id, subject, category),
    parentCategory,
    parentCategoryName: parentCategory,
    parentCategoryGuideUrl,
  });

  it("parentCategoryGuideUrl を持つ問題の親カテゴリでは URL が返る", async () => {
    const questions = [
      makeQuestionWithParentGuide("q1", "english", "phonics", "pronunciation", "../english/pronunciation/guide"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getParentCategoryGuideUrl("english", "pronunciation")).toBe("../english/pronunciation/guide");
  });

  it("parentCategoryGuideUrl を持たない親カテゴリでは undefined が返る", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getParentCategoryGuideUrl("english", "pronunciation")).toBeUndefined();
  });

  it("存在しない親カテゴリでは undefined が返る", async () => {
    const questions = [
      makeQuestionWithParentGuide("q1", "english", "phonics", "pronunciation", "../english/pronunciation/guide"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getParentCategoryGuideUrl("english", "nonexistent")).toBeUndefined();
  });

  it("複数問題がある場合は最初に見つかった parentCategoryGuideUrl を返す", async () => {
    const questions = [
      makeQuestionWithParentGuide("q1", "english", "phonics", "pronunciation", "../english/pronunciation/guide"),
      makeQuestionWithParentGuide("q2", "english", "linking", "pronunciation", "../english/pronunciation/guide2"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getParentCategoryGuideUrl("english", "pronunciation")).toBe("../english/pronunciation/guide");
  });
});

describe("QuizUseCase — getCategoryExample 仕様", () => {
  const makeQuestionWithExample = (id: string, subject: string, category: string, example: string): Question => ({
    ...makeQuestion(id, subject, category),
    example,
  });

  it("example を持つ問題のカテゴリでは例文が返る", async () => {
    const questions = [makeQuestionWithExample("q1", "english", "tenses-regular-present", "I `play` games.")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryExample("english", "tenses-regular-present")).toBe("I `play` games.");
  });

  it("example を持たないカテゴリでは undefined が返る", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryExample("english", "phonics")).toBeUndefined();
  });

  it("存在しないカテゴリでは undefined が返る", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryExample("english", "nonexistent")).toBeUndefined();
  });

  it("複数問題がある場合は最初に見つかった example を返す", async () => {
    const questions = [
      makeQuestionWithExample("q1", "english", "phonics", "first example"),
      makeQuestionWithExample("q2", "english", "phonics", "second example"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryExample("english", "phonics")).toBe("first example");
  });
});
