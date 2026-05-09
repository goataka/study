/**
 * QuizUseCase — 親カテゴリ／トップカテゴリ階層の仕様
 */

import { QuizUseCase } from "../quizUseCase";
import type { Question } from "../../domain/question";
import { StubQuestionRepository, StubProgressRepository } from "./testHelpers";

describe("QuizUseCase — getParentCategoriesForSubject / getCategoriesForParent 仕様", () => {
  const makeQuestionWithParent = (
    id: string,
    subject: string,
    category: string,
    categoryName: string,
    parentCategory?: string,
    parentCategoryName?: string,
  ): Question => ({
    id,
    question: `Q ${id}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `Exp ${id}`,
    subject,
    subjectName: "英語",
    category,
    categoryName,
    parentCategory,
    parentCategoryName,
  });

  const questions = [
    makeQuestionWithParent("q1", "english", "tenses-past", "過去形", "grammar", "文法"),
    makeQuestionWithParent("q2", "english", "tenses-future", "未来形", "grammar", "文法"),
    makeQuestionWithParent("q3", "english", "phonics-1", "フォニックス1", "phonics", "発音"),
    makeQuestionWithParent("q4", "english", "linking", "リンキング", undefined, undefined),
  ];

  let useCase: QuizUseCase;

  beforeEach(async () => {
    useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
  });

  it("getParentCategoriesForSubject で親カテゴリが重複なく取得できる", () => {
    const parentCats = useCase.getParentCategoriesForSubject("english");
    expect(Object.keys(parentCats)).toHaveLength(2);
    expect(parentCats["grammar"]).toBe("文法");
    expect(parentCats["phonics"]).toBe("発音");
  });

  it("getParentCategoriesForSubject で parentCategoryName がない場合は ID をフォールバックとして使う", () => {
    const noNameQuestions: Question[] = [{ ...questions[0]!, parentCategoryName: undefined }];
    const uc = new QuizUseCase(new StubQuestionRepository(noNameQuestions), new StubProgressRepository());
    return uc.initialize().then(() => {
      const parentCats = uc.getParentCategoriesForSubject("english");
      expect(parentCats["grammar"]).toBe("grammar");
    });
  });

  it("getParentCategoriesForSubject で親カテゴリのない教科は空オブジェクトを返す", () => {
    const parentCats = useCase.getParentCategoriesForSubject("math");
    expect(Object.keys(parentCats)).toHaveLength(0);
  });

  it("getCategoriesForParent で指定した親カテゴリ配下のカテゴリのみ返る", () => {
    const cats = useCase.getCategoriesForParent("english", "grammar");
    expect(Object.keys(cats)).toHaveLength(2);
    expect(cats["tenses-past"]).toBe("過去形");
    expect(cats["tenses-future"]).toBe("未来形");
  });

  it("getCategoriesForParent で重複なくカテゴリが返る", () => {
    const dupQuestions = [
      ...questions,
      makeQuestionWithParent("q1b", "english", "tenses-past", "過去形", "grammar", "文法"),
    ];
    const uc = new QuizUseCase(new StubQuestionRepository(dupQuestions), new StubProgressRepository());
    return uc.initialize().then(() => {
      const cats = uc.getCategoriesForParent("english", "grammar");
      expect(Object.keys(cats)).toHaveLength(2);
    });
  });

  it("getCategoriesForParent で存在しない親カテゴリは空オブジェクトを返す", () => {
    const cats = useCase.getCategoriesForParent("english", "nonexistent");
    expect(Object.keys(cats)).toHaveLength(0);
  });
});

describe("QuizUseCase — getTopCategoriesForSubject / getParentCategoriesForTop 仕様", () => {
  const makeQuestionWith3Levels = (
    id: string,
    subject: string,
    category: string,
    categoryName: string,
    parentCategory?: string,
    parentCategoryName?: string,
    topCategory?: string,
    topCategoryName?: string,
  ): Question => ({
    id,
    question: `Q ${id}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `Exp ${id}`,
    subject,
    subjectName: "英語",
    category,
    categoryName,
    topCategory,
    topCategoryName,
    parentCategory,
    parentCategoryName,
  });

  const questions = [
    makeQuestionWith3Levels("q1", "english", "tenses-past", "過去形", "verb", "動詞", "grammar", "文法"),
    makeQuestionWith3Levels("q2", "english", "tenses-future", "未来形", "verb", "動詞", "grammar", "文法"),
    makeQuestionWith3Levels(
      "q3",
      "english",
      "phonics-1",
      "フォニックス1",
      "phonics",
      "フォニックス",
      "pronunciation",
      "発音",
    ),
    makeQuestionWith3Levels(
      "q4",
      "english",
      "assimilation",
      "アシミレーション",
      "sound-changes",
      "音声変化",
      "pronunciation",
      "発音",
    ),
    makeQuestionWith3Levels("q5", "english", "kotowaza", "ことわざ", "vocabulary", "語彙", undefined, undefined),
  ];

  let useCase: QuizUseCase;

  beforeEach(async () => {
    useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
  });

  it("getTopCategoriesForSubject でトップカテゴリが重複なく取得できる", () => {
    const topCats = useCase.getTopCategoriesForSubject("english");
    expect(Object.keys(topCats)).toHaveLength(2);
    expect(topCats["grammar"]).toBe("文法");
    expect(topCats["pronunciation"]).toBe("発音");
  });

  it("getTopCategoriesForSubject でトップカテゴリのない教科は空オブジェクトを返す", () => {
    const topCats = useCase.getTopCategoriesForSubject("math");
    expect(Object.keys(topCats)).toHaveLength(0);
  });

  it("getTopCategoriesForSubject でトップカテゴリのない問題は含まれない", () => {
    const topCats = useCase.getTopCategoriesForSubject("english");
    expect("vocabulary" in topCats).toBe(false);
  });

  it("getParentCategoriesForTop で指定トップカテゴリ配下の親カテゴリのみ返る", () => {
    const parentCats = useCase.getParentCategoriesForTop("english", "pronunciation");
    expect(Object.keys(parentCats)).toHaveLength(2);
    expect(parentCats["phonics"]).toBe("フォニックス");
    expect(parentCats["sound-changes"]).toBe("音声変化");
  });

  it("getParentCategoriesForTop で別のトップカテゴリを指定すると別の親カテゴリが返る", () => {
    const parentCats = useCase.getParentCategoriesForTop("english", "grammar");
    expect(Object.keys(parentCats)).toHaveLength(1);
    expect(parentCats["verb"]).toBe("動詞");
  });

  it("getParentCategoriesForTop で存在しないトップカテゴリは空オブジェクトを返す", () => {
    const parentCats = useCase.getParentCategoriesForTop("english", "nonexistent");
    expect(Object.keys(parentCats)).toHaveLength(0);
  });
});
