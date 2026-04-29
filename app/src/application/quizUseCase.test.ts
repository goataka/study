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

const makeQuestionWithGuide = (id: string, subject: string, category: string, guideUrl: string): Question => ({
  ...makeQuestion(id, subject, category),
  guideUrl,
});

class StubQuestionRepository implements IQuestionRepository {
  constructor(private readonly questions: Question[]) {}
  async loadAll(): Promise<Question[]> {
    return this.questions;
  }
}

class StubProgressRepository implements IProgressRepository {
  private ids: string[];
  private history: import("./ports").QuizRecord[];
  private streaks: Record<string, number>;
  private stats: Record<string, { total: number; correct: number }>;
  private masteredIds: string[];
  constructor(
    initialIds: string[] = [],
    initialHistory: import("./ports").QuizRecord[] = [],
    initialStreaks: Record<string, number> = {},
    initialStats: Record<string, { total: number; correct: number }> = {},
    initialMasteredIds: string[] = []
  ) {
    this.ids = [...initialIds];
    this.history = [...initialHistory];
    this.streaks = { ...initialStreaks };
    this.stats = { ...initialStats };
    this.masteredIds = [...initialMasteredIds];
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
  loadCorrectStreaks(): Record<string, number> {
    return { ...this.streaks };
  }
  saveCorrectStreaks(streaks: Record<string, number>): void {
    this.streaks = { ...streaks };
  }
  getStoredStreaks(): Record<string, number> {
    return { ...this.streaks };
  }
  loadMasteredIds(): string[] {
    return [...this.masteredIds];
  }
  saveMasteredIds(ids: string[]): void {
    this.masteredIds = [...ids];
  }
  getStoredMasteredIds(): string[] {
    return [...this.masteredIds];
  }
  loadUserName(): string | null {
    return null;
  }
  saveUserName(_name: string): void {}
  loadHistory() {
    return [...this.history];
  }
  saveHistory(records: import("./ports").QuizRecord[]): void {
    this.history = [...records];
  }
  getStoredHistory(): import("./ports").QuizRecord[] {
    return [...this.history];
  }
  loadCategoryViewMode(): "category" | "grade" {
    return "category";
  }
  saveCategoryViewMode(_mode: "category" | "grade"): void {}
  loadFontSizeLevel(): "small" | "medium" | "large" | null {
    return null;
  }
  saveFontSizeLevel(_level: "small" | "medium" | "large"): void {}
  loadQuestionStats(): Record<string, { total: number; correct: number }> {
    return { ...this.stats };
  }
  saveQuestionStats(stats: Record<string, { total: number; correct: number }>): void {
    this.stats = { ...stats };
  }
  getStoredStats(): Record<string, { total: number; correct: number }> {
    return { ...this.stats };
  }
  exportAllData(): import("./ports").UserDataExport {
    return {
      exportedAt: new Date().toISOString(),
      userName: null,
      wrongIds: this.loadWrongIds(),
      correctStreaks: this.loadCorrectStreaks(),
      masteredIds: this.loadMasteredIds(),
      questionStats: this.loadQuestionStats(),
      history: this.loadHistory(),
      categoryViewMode: "category",
      fontSizeLevel: null,
    };
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

describe("QuizUseCase — getTopCategoriesForSubject / getParentCategoriesForTop 仕様", () => {
  const makeQuestionWith3Levels = (
    id: string,
    subject: string,
    category: string,
    categoryName: string,
    parentCategory?: string,
    parentCategoryName?: string,
    topCategory?: string,
    topCategoryName?: string
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
    makeQuestionWith3Levels("q3", "english", "phonics-1", "フォニックス1", "phonics", "フォニックス", "pronunciation", "発音"),
    makeQuestionWith3Levels("q4", "english", "assimilation", "アシミレーション", "sound-changes", "音声変化", "pronunciation", "発音"),
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
    // vocabulary は topCategory なし
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
    // シャッフル後の正解とは異なるインデックスを選ぶ
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex); // 不正解
    useCase.submitSession(session);

    expect(progressRepo.getStoredIds()).toContain("q1");
  });

  it("wrongIds にない問題を正解すると連続正解数がカウントされる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(); // wrongIds は空
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    session.selectAnswer(0, session.questions[0]!.correct);
    useCase.submitSession(session);

    expect(progressRepo.getStoredIds()).not.toContain("q1");
    expect(progressRepo.getStoredStreaks()["q1"]).toBe(1);
  });
});

describe("QuizUseCase — masteredIds（習得済み）仕様", () => {
  it("3回連続正解で masteredIds に追加される", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    expect(progressRepo.getStoredMasteredIds()).toContain("q1");
    expect(useCase.isMastered("q1")).toBe(true);
  });

  it("2回連続正解では masteredIds に追加されない", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 2; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    expect(progressRepo.getStoredMasteredIds()).not.toContain("q1");
    expect(useCase.isMastered("q1")).toBe(false);
  });

  it("3回連続正解後に不正解でも masteredIds から除かれない", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 3回連続正解で習得済みに
    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }
    expect(progressRepo.getStoredMasteredIds()).toContain("q1");

    // 習得済みの問題は startSession("random") では除外されるため startSessionWithAllQuestions で全問から取得する
    const session = useCase.startSessionWithAllQuestions("random", { subject: "all", category: "all" });
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex); // 不正解
    useCase.submitSession(session);

    // 習得済みは維持される
    expect(progressRepo.getStoredMasteredIds()).toContain("q1");
    expect(useCase.isMastered("q1")).toBe(true);
  });

  it("全問習得済み時に startSession('random') は ERROR_ALL_MASTERED をスロー", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    expect(() =>
      useCase.startSession("random", { subject: "all", category: "all" })
    ).toThrow("ALL_MASTERED");
  });

  it("全問習得済み時に startSession('practice') は ERROR_ALL_MASTERED をスロー", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    expect(() =>
      useCase.startSession("practice", { subject: "all", category: "all" })
    ).toThrow("ALL_MASTERED");
  });

  it("全問習得済み時に startSessionWithAllQuestions は習得済み問題も含めて開始できる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSessionWithAllQuestions("random", { subject: "all", category: "all" });
    expect(session.totalCount).toBe(1);
  });

  it("3回連続正解後に correctStreaks から問題が削除される", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    for (let i = 0; i < 3; i++) {
      const session = useCase.startSession("random", { subject: "all", category: "all" });
      session.selectAnswer(0, session.questions[0]!.correct);
      useCase.submitSession(session);
    }

    // ストリークは削除され 0 になる
    expect(useCase.getCorrectStreak("q1")).toBe(0);
    expect(progressRepo.getStoredStreaks()["q1"]).toBeUndefined();
  });

  it("getMasteredIds は masteredIds のコピーを返す", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const ids = useCase.getMasteredIds();
    ids.push("tampered");
    // 内部状態が変更されないこと
    expect(useCase.getMasteredIds()).not.toContain("tampered");
  });
});

describe("QuizUseCase — questionStats（問題別統計）仕様", () => {
  it("正解した問題の total と correct が 1 ずつ増える", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    session.selectAnswer(0, session.questions[0]!.correct);
    useCase.submitSession(session);

    const stat = progressRepo.getStoredStats()["q1"];
    expect(stat).toEqual({ total: 1, correct: 1 });
  });

  it("不正解の場合は total のみ増え correct は増えない", async () => {
    const q = makeQuestion("q1");
    q.correct = 0;
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    const wrongIndex = session.questions[0]!.correct === 0 ? 1 : 0;
    session.selectAnswer(0, wrongIndex);
    useCase.submitSession(session);

    const stat = progressRepo.getStoredStats()["q1"];
    expect(stat).toEqual({ total: 1, correct: 0 });
  });

  it("複数回回答した場合に total と correct が累積される", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    // 1回目: 正解
    const s1 = useCase.startSession("retry", { subject: "all", category: "all" });
    s1.selectAnswer(0, s1.questions[0]!.correct);
    useCase.submitSession(s1);

    // 2回目: 不正解
    const s2 = useCase.startSession("retry", { subject: "all", category: "all" });
    const wrongIndex = s2.questions[0]!.correct === 0 ? 1 : 0;
    s2.selectAnswer(0, wrongIndex);
    useCase.submitSession(s2);

    const stat = progressRepo.getStoredStats()["q1"];
    expect(stat?.total).toBe(2);
    expect(stat?.correct).toBe(1);
  });

  it("getQuestionStat は保存済み統計を返す", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository([], [], {}, { q1: { total: 5, correct: 3 } });
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    expect(useCase.getQuestionStat("q1")).toEqual({ total: 5, correct: 3 });
  });

  it("統計がない問題では getQuestionStat が { total: 0, correct: 0 } を返す", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    expect(useCase.getQuestionStat("q1")).toEqual({ total: 0, correct: 0 });
  });

  it("submitSession 後に progressRepo.saveQuestionStats が更新値で呼ばれる", async () => {
    const q = makeQuestion("q1");
    const progressRepo = new StubProgressRepository();
    const saveSpy = vi.spyOn(progressRepo, "saveQuestionStats");
    const useCase = new QuizUseCase(new StubQuestionRepository([q]), progressRepo);
    await useCase.initialize();

    const session = useCase.startSession("random", { subject: "all", category: "all" });
    session.selectAnswer(0, session.questions[0]!.correct);
    useCase.submitSession(session);

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ q1: { total: 1, correct: 1 } }));
  });
});

describe("QuizUseCase — getStudiedCategoryKeys 仕様", () => {
  const makeRecord = (subject: string, category: string): import("./ports").QuizRecord => ({
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
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1")]),
      new StubProgressRepository()
    );
    await useCase.initialize();
    expect(useCase.getStudiedCategoryKeys().size).toBe(0);
  });

  it("履歴があるカテゴリのキーが含まれる", async () => {
    const history = [makeRecord("english", "phonics-1"), makeRecord("english", "tenses-past")];
    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1")]),
      new StubProgressRepository([], history)
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
      new StubProgressRepository([], history)
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

  it("問題が0件の場合は何もしない", async () => {
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([]), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "english", category: "phonics" });

    expect(progressRepo.getStoredIds()).toContain("q1");
    expect(progressRepo.getStoredHistory()).toHaveLength(0);
  });

  it("category が 'all' の場合は何もしない", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "english", category: "all" });

    expect(progressRepo.getStoredIds()).toContain("q1");
    expect(progressRepo.getStoredHistory()).toHaveLength(0);
  });

  it("subject が 'all' の場合は何もしない", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.markCategoryAsLearned({ subject: "all", category: "phonics" });

    expect(progressRepo.getStoredIds()).toContain("q1");
    expect(progressRepo.getStoredHistory()).toHaveLength(0);
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

  it("category が 'all' の場合は何もしない", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.unmarkCategoryAsLearned({ subject: "english", category: "all" });

    expect(progressRepo.getStoredIds()).toHaveLength(0);
  });

  it("subject が 'all' の場合は何もしない", async () => {
    const questions = [makeQuestion("q1", "english", "phonics")];
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();

    useCase.unmarkCategoryAsLearned({ subject: "all", category: "phonics" });

    expect(progressRepo.getStoredIds()).toHaveLength(0);
  });

  it("問題が0件の場合は何もしない", async () => {
    const progressRepo = new StubProgressRepository(["q1"]);
    const useCase = new QuizUseCase(new StubQuestionRepository([]), progressRepo);
    await useCase.initialize();

    useCase.unmarkCategoryAsLearned({ subject: "english", category: "phonics" });

    expect(progressRepo.getStoredIds()).toContain("q1");
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

describe("QuizUseCase — getCategoryGuideUrl 仕様", () => {
  it("guideUrl を持つ問題のカテゴリでは URL が返る", async () => {
    const questions = [
      makeQuestionWithGuide("q1", "english", "phonics", "../english/pronunciation/01/guide"),
    ];
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
    parentCategoryGuideUrl: string
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
    const questions = [
      makeQuestionWithExample("q1", "english", "tenses-regular-present", "I `play` games."),
    ];
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

describe("QuizUseCase — getRecommendedCategoryForSubject 仕様", () => {
  it("未学習カテゴリがある場合は最初の未学習カテゴリを返す", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-2"),
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository());
    await useCase.initialize();

    const rec = useCase.getRecommendedCategoryForSubject("english");
    expect(rec).not.toBeNull();
    expect(rec!.id).toBe("phonics-1");
  });

  it("すべてのカテゴリが学習済みの場合は最初のカテゴリを返す", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-2"),
    ];
    const history: import("./ports").QuizRecord[] = [
      {
        id: "r1", date: new Date().toISOString(), subject: "english", subjectName: "英語",
        category: "phonics-1", categoryName: "フォニックス1", mode: "random",
        totalCount: 1, correctCount: 1, entries: [],
      },
      {
        id: "r2", date: new Date().toISOString(), subject: "english", subjectName: "英語",
        category: "phonics-2", categoryName: "フォニックス2", mode: "random",
        totalCount: 1, correctCount: 1, entries: [],
      },
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
    const useCase = new QuizUseCase(
      new StubQuestionRepository([questionWithGrade]),
      new StubProgressRepository()
    );
    await useCase.initialize();

    const rec = useCase.getRecommendedCategoryForSubject("english");
    expect(rec!.referenceGrade).toBe("小1");
  });
});

// ─── getRecommendedCategoriesForSubject 仕様 ──────────────────────────────────

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
    const history: import("./ports").QuizRecord[] = [
      {
        id: "r1", date: new Date().toISOString(), subject: "english", subjectName: "英語",
        category: "phonics-1", categoryName: "フォニックス1", mode: "random",
        totalCount: 1, correctCount: 1, entries: [],
      },
      {
        id: "r2", date: new Date().toISOString(), subject: "english", subjectName: "英語",
        category: "phonics-2", categoryName: "フォニックス2", mode: "random",
        totalCount: 1, correctCount: 1, entries: [],
      },
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

// ─── getCategoryProgressPct 仕様 ─────────────────────────────────────────────

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
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-1"),
    ];
    const history: import("./ports").QuizRecord[] = [
      {
        id: "r1", date: new Date().toISOString(), subject: "english", subjectName: "英語",
        category: "phonics-1", categoryName: "フォニックス1", mode: "random",
        totalCount: 2, correctCount: 2, entries: [],
      },
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), new StubProgressRepository([], history));
    await useCase.initialize();

    expect(useCase.getCategoryProgressPct("english", "phonics-1")).toBe(100);
  });

  it("間違いがある場合は (total - wrong) / total * 100 の値を返す", async () => {
    const questions = [
      makeQuestion("q1", "english", "phonics-1"),
      makeQuestion("q2", "english", "phonics-1"),
      makeQuestion("q3", "english", "phonics-1"),
      makeQuestion("q4", "english", "phonics-1"),
    ];
    // q1 が間違い
    const useCase = new QuizUseCase(
      new StubQuestionRepository(questions),
      new StubProgressRepository(["q1"])
    );
    await useCase.initialize();

    // (4 - 1) / 4 * 100 = 75
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
    const history: import("./ports").QuizRecord[] = [
      {
        id: "r1", date: latestDate, subject: "english", subjectName: "英語",
        category: "phonics-1", categoryName: "フォニックス1", mode: "random",
        totalCount: 5, correctCount: 5, entries: [],
      },
      {
        id: "r2", date: "2025-03-01T10:00:00.000Z", subject: "english", subjectName: "英語",
        category: "phonics-1", categoryName: "フォニックス1", mode: "random",
        totalCount: 5, correctCount: 5, entries: [],
      },
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository([]), new StubProgressRepository([], history));
    await useCase.initialize();

    expect(useCase.getLastStudyDateForSubject("english")).toBe(latestDate);
  });

  it("他の教科の履歴は含まれない", async () => {
    const history: import("./ports").QuizRecord[] = [
      {
        id: "r1", date: "2025-04-15T10:00:00.000Z", subject: "math", subjectName: "数学",
        category: "addition", categoryName: "たし算", mode: "random",
        totalCount: 5, correctCount: 5, entries: [],
      },
    ];
    const useCase = new QuizUseCase(new StubQuestionRepository([]), new StubProgressRepository([], history));
    await useCase.initialize();

    expect(useCase.getLastStudyDateForSubject("english")).toBeNull();
  });
});

describe("QuizUseCase — getUniqueGradesForSubject / getCategoriesForGrade / getCategoriesWithoutGrade 仕様", () => {
  const makeQuestionWithGrade = (
    id: string,
    subject: string,
    category: string,
    categoryName: string,
    referenceGrade?: string
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
    const gradeQuestions = [
      makeQuestionWithGrade("q1", "english", "grammar", "文法", "中学1年"),
    ];
    const uc = new QuizUseCase(new StubQuestionRepository(gradeQuestions), new StubProgressRepository());
    return uc.initialize().then(() => {
      const cats = uc.getCategoriesWithoutGrade("english");
      expect(Object.keys(cats)).toHaveLength(0);
    });
  });
});
