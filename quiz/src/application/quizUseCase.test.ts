/**
 * QuizUseCase — 仕様テスト
 *
 * ポートのテストダブル（スタブ）を使い、ユースケース層を独立して検証します。
 */

import { QuizUseCase } from "./quizUseCase";
import type { IQuestionRepository, IProgressRepository } from "./ports";
import type { Question } from "../domain/question";

// ─── テストダブル（スタブ） ──────────────────────────────────────────────────

const makeQuestion = (id: string, subject = "english", category = "phonics"): Question => ({
  id,
  question: `Q ${id}`,
  choices: ["A", "B", "C", "D"],
  correct: 0,
  explanation: `Exp ${id}`,
  subject,
  subjectName: subject === "english" ? "英語" : "数学",
  category,
  categoryName: category,
});

class StubQuestionRepository implements IQuestionRepository {
  constructor(private readonly questions: Question[]) {}
  async loadAll(): Promise<Question[]> {
    return this.questions;
  }
}

class StubProgressRepository implements IProgressRepository {
  private ids: string[];
  constructor(initialIds: string[] = []) {
    this.ids = [...initialIds];
  }
  loadWrongIds(): string[] {
    return [...this.ids];
  }
  saveWrongIds(ids: string[]): void {
    this.ids = [...ids];
  }
  getStoredIds(): string[] {
    return [...this.ids];
  }
}

// ─── テスト ──────────────────────────────────────────────────────────────────

describe("QuizUseCase — 初期化仕様", () => {
  it("initialize() で全問題をロードする", async () => {
    const questions = [makeQuestion("q1"), makeQuestion("q2")];
    const useCase = new QuizUseCase(
      new StubQuestionRepository(questions),
      new StubProgressRepository()
    );
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

describe("QuizUseCase — getParentCategoriesForSubject / getCategoriesForParent 仕様", () => {
  const makeQuestionWithParent = (
    id: string,
    subject: string,
    category: string,
    categoryName: string,
    parentCategory?: string,
    parentCategoryName?: string
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
    const noNameQuestions: Question[] = [
      { ...questions[0]!, parentCategoryName: undefined },
    ];
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

describe("QuizUseCase — セッション開始仕様", () => {
  const questions = Array.from({ length: 15 }, (_, i) => makeQuestion(`q${i}`));

  let useCase: QuizUseCase;

  beforeEach(async () => {
    useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();
  });

  it("randomモードで最大20問のセッションが開始される", () => {
    const session = useCase.startSession("random", { subject: "all", category: "all" });
    expect(session.totalCount).toBeLessThanOrEqual(20);
  });

  it("retryモードで間違えた問題がなければエラー", () => {
    expect(() =>
      useCase.startSession("retry", { subject: "all", category: "all" })
    ).toThrow("間違えた問題がありません");
  });

  it("retryモードで間違えた問題のみが出題される", () => {
    const wrongQuestions = [makeQuestion("wrong-1"), makeQuestion("wrong-2")];
    const progressRepo = new StubProgressRepository(["wrong-1", "wrong-2"]);
    const repo = new StubQuestionRepository([...questions, ...wrongQuestions]);
    const uc = new QuizUseCase(repo, progressRepo);
    // initialize synchronously via direct access
    return uc.initialize().then(() => {
      const session = uc.startSession("retry", { subject: "all", category: "all" });
      expect(session.totalCount).toBe(2);
    });
  });
});

describe("QuizUseCase — 採点・進捗保存仕様", () => {
  it("正解した問題は wrongIds から除かれる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("retry", { subject: "all", category: "all" });
    // シャッフル後の正解インデックスを使用
    session.selectAnswer(0, session.questions[0]!.correct); // 正解
    useCase.submitSession(session);

    expect(progressRepo.getStoredIds()).not.toContain("q1");
  });

  it("不正解の問題は wrongIds に追加される", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    // シャッフル後の正解とは異なるインデックスを選ぶ
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex); // 不正解
    useCase.submitSession(session);

    expect(progressRepo.getStoredIds()).toContain("q1");
  });
});
