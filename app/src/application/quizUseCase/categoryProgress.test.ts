/**
 * QuizUseCase — getCategoryProgressPct / getLastStudyDateForSubject / getMasteredCountForCategory 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import type { QuizRecord } from "../ports";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — getCategoryProgressPct 仕様", () => {
  it("未学習カテゴリの場合は 0 を返す", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1")];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryProgressPct("english", "phonics-1")).toBe(0);
  });

  it("問題が存在しないカテゴリの場合は 0 を返す", async () => {
    const useCase = new QuizUseCase(new StubQuestionRepository([]), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getCategoryProgressPct("english", "phonics-1")).toBe(0);
  });

  it("全問正解の学習済みカテゴリでは 100 を返す", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1"), makeQuestion("q2", "english", "phonics-1")];
    const history: QuizRecord[] = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス1",
        mode: "random",
        totalCount: 2,
        correctCount: 2,
        entries: [],
      },
    ];
    // 進捗率は mastered / total で算出するため全問題を masteredIds に設定する
    const useCase = new QuizUseCase(
      new StubQuestionRepository(questions),
      new StubProgressRepository([], history, {}, {}, ["q1", "q2"]),
    );
    await useCase.initialize();

    expect(useCase.getCategoryProgressPct("english", "phonics-1")).toBe(100);
  });

  it("間違いがある場合は mastered / total * 100 の値を返す", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-1"),
      makeQuestion("q3", "english", "phonics-1"),
      makeQuestion("q4", "english", "phonics-1"),
    ];
    // q2〜q4 が習得済み（q1 は間違い）
    const useCase = new QuizUseCase(
      new StubQuestionRepository(questions),
      new StubProgressRepository(["q1"], [], {}, {}, ["q2", "q3", "q4"]),
    );
    await useCase.initialize();

    // mastered(3) / total(4) * 100 = 75
    expect(useCase.getCategoryProgressPct("english", "phonics-1")).toBe(75);
  });
});

describe("QuizUseCase — getLastStudyDateForSubject 仕様", () => {
  it("学習履歴がない場合は null を返す", async () => {
    const useCase = new QuizUseCase(new StubQuestionRepository([]), new StubProgressRepository());
    await useCase.initialize();

    expect(useCase.getLastStudyDateForSubject("english")).toBeNull();
  });

  it("学習履歴がある場合は最新レコードの日付を返す", async () => {
    const latestDate = "2025-04-15T10:00:00.000Z";
    const history: QuizRecord[] = [
      {
        id: "r1",
        date: latestDate,
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス1",
        mode: "random",
        totalCount: 5,
        correctCount: 5,
        entries: [],
      },
      {
        id: "r2",
        date: "2025-03-01T10:00:00.000Z",
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス1",
        mode: "random",
        totalCount: 5,
        correctCount: 5,
        entries: [],
      },
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository([]), new StubProgressRepository([], history));
    await useCase.initialize();

    expect(useCase.getLastStudyDateForSubject("english")).toBe(latestDate);
  });

  it("他の教科の履歴は含まれない", async () => {
    const history: QuizRecord[] = [
      {
        id: "r1",
        date: "2025-04-15T10:00:00.000Z",
        subject: "math",
        subjectName: "数学",
        category: "addition",
        categoryName: "たし算",
        mode: "random",
        totalCount: 5,
        correctCount: 5,
        entries: [],
      },
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository([]), new StubProgressRepository([], history));
    await useCase.initialize();

    expect(useCase.getLastStudyDateForSubject("english")).toBeNull();
  });
});

describe("QuizUseCase — getMasteredCountForCategory 仕様", () => {
  it("カテゴリ内に問題がない場合は { mastered: 0, total: 0 } を返す", async () => {
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1", "english", "phonics")]),
      new StubProgressRepository(),
    );
    await useCase.initialize();
    expect(useCase.getMasteredCountForCategory("english", "linking")).toEqual({ mastered: 0, total: 0 });
  });

  it("未習得問題のみの場合は mastered: 0 を返す", async () => {
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1", "english", "phonics"), makeQuestion("q2", "english", "phonics")]),
      new StubProgressRepository(),
    );
    await useCase.initialize();
    expect(useCase.getMasteredCountForCategory("english", "phonics")).toEqual({ mastered: 0, total: 2 });
  });

  it("部分的に習得済みの場合は習得済み数と総数を正しく返す", async () => {
    const useCase = new QuizUseCase(
      new StubQuestionRepository([
        makeQuestion("q1", "english", "phonics"),
        makeQuestion("q2", "english", "phonics"),
        makeQuestion("q3", "english", "phonics"),
      ]),
      new StubProgressRepository([], [], {}, {}, ["q1"]),
    );
    await useCase.initialize();
    expect(useCase.getMasteredCountForCategory("english", "phonics")).toEqual({ mastered: 1, total: 3 });
  });

  it("全問習得済みの場合は mastered === total を返す", async () => {
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1", "english", "phonics"), makeQuestion("q2", "english", "phonics")]),
      new StubProgressRepository([], [], {}, {}, ["q1", "q2"]),
    );
    await useCase.initialize();
    expect(useCase.getMasteredCountForCategory("english", "phonics")).toEqual({ mastered: 2, total: 2 });
  });

  it("別教科のカテゴリ同名問題を混同しない", async () => {
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1", "english", "phonics"), makeQuestion("q2", "math", "phonics")]),
      new StubProgressRepository([], [], {}, {}, ["q1", "q2"]),
    );
    await useCase.initialize();
    expect(useCase.getMasteredCountForCategory("english", "phonics")).toEqual({ mastered: 1, total: 1 });
    expect(useCase.getMasteredCountForCategory("math", "phonics")).toEqual({ mastered: 1, total: 1 });
  });
});
