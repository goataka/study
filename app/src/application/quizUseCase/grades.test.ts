/**
 * QuizUseCase — getUniqueGradesForSubject / getCategoriesForGrade / getCategoriesWithoutGrade 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import type { Question } from "../../domain/question";
import { StubQuestionRepository, StubProgressRepository } from "./testHelpers";

describe("QuizUseCase — getUniqueGradesForSubject / getCategoriesForGrade / getCategoriesWithoutGrade 仕様", () => {
  const makeQuestionWithGrade = (
    id: string,
    subject: string,
    category: string,
    categoryName: string,
    referenceGrade?: string,
  ): Question => ({
    id,
    question: `Q ${id}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `Exp ${id}`,
    subject,
    subjectName: "数学",
    category,
    categoryName,
    referenceGrade,
  });

  const questions = [
    makeQuestionWithGrade("q1", "math", "addition", "たし算", "小学1年"),
    makeQuestionWithGrade("q2", "math", "addition", "たし算", "小学1年"),
    makeQuestionWithGrade("q3", "math", "multiplication", "かけ算", "小学2年"),
    makeQuestionWithGrade("q4", "math", "algebra", "代数", "中学1年"),
    makeQuestionWithGrade("q5", "math", "misc", "その他", undefined),
  ];

  let useCase: QuizUseCase;

  beforeEach(async () => {
    useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
  });

  it("getUniqueGradesForSubject で重複なく学年が出現順に返る", () => {
    const grades = useCase.getUniqueGradesForSubject("math");
    expect(grades).toEqual(["小学1年", "小学2年", "中学1年"]);
  });

  it("getUniqueGradesForSubject で referenceGrade がない問題は含まれない", () => {
    const grades = useCase.getUniqueGradesForSubject("math");
    expect(grades).not.toContain(undefined);
    expect(grades.length).toBe(3);
  });

  it("getUniqueGradesForSubject で該当教科がない場合は空配列を返す", () => {
    const grades = useCase.getUniqueGradesForSubject("english");
    expect(grades).toHaveLength(0);
  });

  it("getCategoriesForGrade で指定学年のカテゴリのみ返る", () => {
    const cats = useCase.getCategoriesForGrade("math", "小学1年");
    expect(Object.keys(cats)).toHaveLength(1);
    expect(cats["addition"]).toBe("たし算");
  });

  it("getCategoriesForGrade で重複なくカテゴリが返る", () => {
    const cats = useCase.getCategoriesForGrade("math", "小学1年");
    expect(Object.keys(cats)).toHaveLength(1);
  });

  it("getCategoriesForGrade で存在しない学年は空オブジェクトを返す", () => {
    const cats = useCase.getCategoriesForGrade("math", "高校1年");
    expect(Object.keys(cats)).toHaveLength(0);
  });

  it("getCategoriesWithoutGrade で referenceGrade が未設定のカテゴリのみ返る", () => {
    const cats = useCase.getCategoriesWithoutGrade("math");
    expect(Object.keys(cats)).toHaveLength(1);
    expect(cats["misc"]).toBe("その他");
  });

  it("getCategoriesWithoutGrade で全カテゴリに学年が設定されている場合は空オブジェクトを返す", () => {
    const gradeQuestions = [makeQuestionWithGrade("q1", "english", "grammar", "文法", "中学1年")];
    const uc = new QuizUseCase(new StubQuestionRepository(gradeQuestions), new StubProgressRepository());
    return uc.initialize().then(() => {
      const cats = uc.getCategoriesWithoutGrade("english");
      expect(Object.keys(cats)).toHaveLength(0);
    });
  });
});
