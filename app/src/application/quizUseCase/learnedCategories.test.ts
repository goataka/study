/**
 * QuizUseCase — getStudiedCategoryKeys / markCategoryAsLearned / unmarkCategoryAsLearned 仕様
 */

import { QuizUseCase } from "../quizUseCase";
import type { QuizRecord } from "../ports";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

describe("QuizUseCase — getStudiedCategoryKeys 仕様", () => {
  const makeRecord = (subject: string, category: string): QuizRecord => ({
    id: `${subject}-${category}`,
    date: new Date().toISOString(),
    subject,
    subjectName: subject,
    category,
    categoryName: category,
    mode: "random",
    totalCount: 5,
    correctCount: 5,
    entries: [],
  });

  it("履歴がない場合は空の Set を返す", async () => {
    const useCase = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1")]), new StubProgressRepository());
    await useCase.initialize();
    expect(useCase.getStudiedCategoryKeys().size).toBe(0);
  });

  it("履歴があるカテゴリのキーが含まれる", async () => {
    const history = [makeRecord("english", "phonics-1"), makeRecord("english", "tenses-past")];
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1")]),
      new StubProgressRepository([], history),
    );
    await useCase.initialize();
    const keys = useCase.getStudiedCategoryKeys();
    expect(keys.has("english::phonics-1")).toBe(true);
    expect(keys.has("english::tenses-past")).toBe(true);
  });

  it("履歴がないカテゴリのキーは含まれない", async () => {
    const history = [makeRecord("english", "phonics-1")];
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1")]),
      new StubProgressRepository([], history),
    );
    await useCase.initialize();
    const keys = useCase.getStudiedCategoryKeys();
    expect(keys.has("english::tenses-past")).toBe(false);
  });
});

describe("QuizUseCase — markCategoryAsLearned 仕様", () => {
  it("対象カテゴリの問題が wrongIds から除かれる", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics"),
      makeQuestion("q2", "english", "phonics"),
      makeQuestion("q3", "english", "linking"),
    ];
    const progressRepo = new StubProgressRepository(["q1", "q2", "q3"]);
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "english", category: "phonics" });

    expect(progressRepo.getStoredIds()).not.toContain("q1");
    expect(progressRepo.getStoredIds()).not.toContain("q2");
    // 他のカテゴリの問題は除かれない
    expect(progressRepo.getStoredIds()).toContain("q3");
  });

  it("対象カテゴリの correctStreaks がクリアされる", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository(["q1"], [], { q1: 2 });
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "english", category: "phonics" });

    expect(progressRepo.getStoredStreaks()["q1"]).toBeUndefined();
  });

  it("履歴に manual モードのレコードが追加される", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "english", category: "phonics" });

    const history = progressRepo.getStoredHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.mode).toBe("manual");
    expect(history[0]!.subject).toBe("english");
    expect(history[0]!.category).toBe("phonics");
    expect(history[0]!.totalCount).toBe(1);
    expect(history[0]!.correctCount).toBe(1);
  });

  // 対象が空（問題ゼロ件・category=all・subject=all）のときは何もしないことをパラメタライズで検証する
  describe.each([
    {
      label: "問題が0件の場合",
      questions: [] as ReturnType<typeof makeQuestion>[],
      filter: { subject: "english", category: "phonics" },
    },
    {
      label: "category が 'all' の場合",
      questions: [makeQuestion("q1", "english", "phonics")],
      filter: { subject: "english", category: "all" },
    },
    {
      label: "subject が 'all' の場合",
      questions: [makeQuestion("q1", "english", "phonics")],
      filter: { subject: "all", category: "phonics" },
    },
  ])("$label は何もしない", ({ questions, filter }) => {
    it("wrongIds と履歴は変化しない", async () => {
      const progressRepo = new StubProgressRepository(["q1"]);
      const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
      await useCase.initialize();

      useCase.markCategoryAsLearned(filter);

      expect(progressRepo.getStoredIds()).toContain("q1");
      expect(progressRepo.getStoredHistory()).toHaveLength(0);
    });
  });

  it("markCategoryAsLearned 後に getStudiedCategoryKeys でそのカテゴリが学習済みになる", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    expect(useCase.getStudiedCategoryKeys().has("english::phonics")).toBe(false);
    useCase.markCategoryAsLearned({ subject: "english", category: "phonics" });
    expect(useCase.getStudiedCategoryKeys().has("english::phonics")).toBe(true);
  });
});

describe("QuizUseCase — unmarkCategoryAsLearned 仕様", () => {
  it("対象カテゴリの全問題が wrongIds に追加される", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics"),
      makeQuestion("q2", "english", "phonics"),
      makeQuestion("q3", "english", "linking"),
    ];
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.unmarkCategoryAsLearned({ subject: "english", category: "phonics" });

    expect(progressRepo.getStoredIds()).toContain("q1");
    expect(progressRepo.getStoredIds()).toContain("q2");
    // 他のカテゴリの問題は追加されない
    expect(progressRepo.getStoredIds()).not.toContain("q3");
  });

  it("すでに wrongIds にある問題は重複追加されない", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.unmarkCategoryAsLearned({ subject: "english", category: "phonics" });

    expect(progressRepo.getStoredIds().filter((id) => id === "q1")).toHaveLength(1);
  });

  // 対象が空（問題ゼロ件・category=all・subject=all）のときは何もしないことをパラメタライズで検証する
  describe.each([
    {
      label: "category が 'all' の場合",
      questions: [makeQuestion("q1", "english", "phonics")],
      initialIds: [] as string[],
      filter: { subject: "english", category: "all" },
      expectedContainsQ1: false,
    },
    {
      label: "subject が 'all' の場合",
      questions: [makeQuestion("q1", "english", "phonics")],
      initialIds: [] as string[],
      filter: { subject: "all", category: "phonics" },
      expectedContainsQ1: false,
    },
    {
      label: "問題が0件の場合",
      questions: [] as ReturnType<typeof makeQuestion>[],
      initialIds: ["q1"],
      filter: { subject: "english", category: "phonics" },
      expectedContainsQ1: true,
    },
  ])("$label は何もしない", ({ questions, initialIds, filter, expectedContainsQ1 }) => {
    it("wrongIds は変化しない", async () => {
      const progressRepo = new StubProgressRepository(initialIds);
      const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
      await useCase.initialize();

      useCase.unmarkCategoryAsLearned(filter);

      if (expectedContainsQ1) {
        expect(progressRepo.getStoredIds()).toContain("q1");
      } else {
        expect(progressRepo.getStoredIds()).toHaveLength(0);
      }
    });
  });

  it("markCategoryAsLearned 後に unmarkCategoryAsLearned すると wrongIds に問題が戻る", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "english", category: "phonics" });
    expect(progressRepo.getStoredIds()).not.toContain("q1");

    useCase.unmarkCategoryAsLearned({ subject: "english", category: "phonics" });
    expect(progressRepo.getStoredIds()).toContain("q1");
  });
});
