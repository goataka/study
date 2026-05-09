/**
 * QuizUseCase — getRecommendedCategoryForSubject / getRecommendedCategoriesForSubject 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import type { Question } from "../../domain/question";
import type { QuizRecord } from "../ports";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

const makeStudiedRecord = (subject: string, category: string, id: string): QuizRecord => ({
  id,
  date: new Date().toISOString(),
  subject,
  subjectName: subject === "english" ? "英語" : "数学",
  category,
  categoryName: category,
  mode: "random",
  totalCount: 1,
  correctCount: 1,
  entries: [],
});

describe("QuizUseCase — getRecommendedCategoryForSubject 仕様", () => {
  it("未学習カテゴリがある場合は最初の未学習カテゴリを返す", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1"), makeQuestion("q2", "english", "phonics-2")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    const rec = useCase.getRecommendedCategoryForSubject("english");
    expect(rec).not.toBeNull();
    expect(rec!.id).toBe("phonics-1");
  });

  it("すべてのカテゴリが学習済みの場合は最初のカテゴリを返す", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1"), makeQuestion("q2", "english", "phonics-2")];
    const history: QuizRecord[] = [
      makeStudiedRecord("english", "phonics-1", "r1"),
      makeStudiedRecord("english", "phonics-2", "r2"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository([], history));
    await useCase.initialize();

    const rec = useCase.getRecommendedCategoryForSubject("english");
    expect(rec).not.toBeNull();
    expect(rec!.id).toBe("phonics-1");
  });

  it("問題が存在しない教科では null を返す", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    const rec = useCase.getRecommendedCategoryForSubject("math");
    expect(rec).toBeNull();
  });

  it("referenceGrade が設定されているカテゴリでは学年情報も返す", async () => {
    const questionWithGrade: Question = {
      ...makeQuestion("q1", "english", "phonics-1"),
      referenceGrade: "小1",
    };
    const useCase = new QuizUseCase(new StubQuestionRepository([questionWithGrade]), new StubProgressRepository());
    await useCase.initialize();

    const rec = useCase.getRecommendedCategoryForSubject("english");
    expect(rec!.referenceGrade).toBe("小1");
  });
});

describe("QuizUseCase — getRecommendedCategoriesForSubject 仕様", () => {
  it("count=1 の場合は最初の未学習カテゴリを1件返す", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-2"),
      makeQuestion("q3", "english", "phonics-3"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    const recs = useCase.getRecommendedCategoriesForSubject("english", 1);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.id).toBe("phonics-1");
  });

  it("count=3 の場合は最大3件の未学習カテゴリを返す", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-2"),
      makeQuestion("q3", "english", "phonics-3"),
      makeQuestion("q4", "english", "phonics-4"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    const recs = useCase.getRecommendedCategoriesForSubject("english", 3);
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.id)).toEqual(["phonics-1", "phonics-2", "phonics-3"]);
  });

  it("未学習カテゴリが count より少ない場合は学習済みカテゴリで補完する", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-2"),
      makeQuestion("q3", "english", "phonics-3"),
    ];
    const history: QuizRecord[] = [
      makeStudiedRecord("english", "phonics-1", "r1"),
      makeStudiedRecord("english", "phonics-2", "r2"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository([], history));
    await useCase.initialize();

    const recs = useCase.getRecommendedCategoriesForSubject("english", 3);
    expect(recs).toHaveLength(3);
    // phonics-3が未学習 → 最初、phonics-1/2が学習済みで補完
    expect(recs[0]!.id).toBe("phonics-3");
  });

  it("問題が存在しない教科では空配列を返す", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    const recs = useCase.getRecommendedCategoriesForSubject("math", 3);
    expect(recs).toHaveLength(0);
  });
});
