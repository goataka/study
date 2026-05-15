/**
 * QuizUseCase — advanceCategoryStage / getCategoryStage / getTodayAdvancedCount /
 *               getRecommendedUnitsGlobal 仕様テスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuizUseCase } from "../quizUseCase";
import type { Question } from "../../domain/question";
import { StubQuestionRepository, StubProgressRepository, makeQuestion } from "./testHelpers";

// ─── ヘルパー ────────────────────────────────────────────────────────────────

const makeQuestionWithGrade = (id: string, subject: string, category: string, grade?: string): Question => ({
  ...makeQuestion(id, subject, category),
  referenceGrade: grade,
});

// ─── advanceCategoryStage ────────────────────────────────────────────────────

describe("QuizUseCase — advanceCategoryStage 仕様", () => {
  let progressRepo: StubProgressRepository;
  let useCase: QuizUseCase;

  beforeEach(async () => {
    progressRepo = new StubProgressRepository();
    useCase = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1", "english", "phonics-1")]), progressRepo);
    await useCase.initialize();
  });

  it("ステージ 0→1 に遷移できる", () => {
    useCase.advanceCategoryStage("english", "phonics-1");
    expect(useCase.getCategoryStage("english", "phonics-1").stage).toBe(1);
  });

  it("ステージ 1→2 に遷移できる", () => {
    useCase.advanceCategoryStage("english", "phonics-1");
    useCase.advanceCategoryStage("english", "phonics-1");
    expect(useCase.getCategoryStage("english", "phonics-1").stage).toBe(2);
  });

  it("ステージ 2→3 に遷移できる", () => {
    useCase.advanceCategoryStage("english", "phonics-1");
    useCase.advanceCategoryStage("english", "phonics-1");
    useCase.advanceCategoryStage("english", "phonics-1");
    expect(useCase.getCategoryStage("english", "phonics-1").stage).toBe(3);
  });

  it("ステージが 3（修了済）の場合は no-op", () => {
    for (let i = 0; i < 4; i++) useCase.advanceCategoryStage("english", "phonics-1");
    expect(useCase.getCategoryStage("english", "phonics-1").stage).toBe(3);
  });

  it("ステージ進行後に saveCategoryStages が呼ばれる（進行前後の stage が永続化される）", () => {
    useCase.advanceCategoryStage("english", "phonics-1");
    const stored = progressRepo.loadCategoryStages();
    expect(stored["english::phonics-1"]?.stage).toBe(1);
  });

  it("ステージ 0→1 のとき mastery/streak/wrong がリセットされる", async () => {
    // mastered & streak を付けてからステージ進行
    const rep2 = new StubProgressRepository(["q1"], [], { q1: 3 }, {}, ["q1"]);
    const uc2 = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1", "english", "phonics-1")]), rep2);
    await uc2.initialize();
    uc2.advanceCategoryStage("english", "phonics-1");
    expect(rep2.loadMasteredIds()).not.toContain("q1");
    expect(rep2.loadCorrectStreaks()["q1"]).toBeUndefined();
    expect(rep2.loadWrongIds()).not.toContain("q1");
  });

  it("ステージ 2→3（修了）のとき mastery はリセットしない", async () => {
    const rep2 = new StubProgressRepository([], [], {}, {}, ["q1"]);
    const uc2 = new QuizUseCase(new StubQuestionRepository([makeQuestion("q1", "english", "phonics-1")]), rep2);
    await uc2.initialize();
    // stage を 2 に上げる
    uc2.advanceCategoryStage("english", "phonics-1"); // 0→1 (mastery reset here)
    rep2.saveMasteredIds(["q1"]); // 再度 mastered にする
    uc2.advanceCategoryStage("english", "phonics-1"); // 1→2 (mastery reset here)
    rep2.saveMasteredIds(["q1"]); // 再度 mastered にする
    uc2.advanceCategoryStage("english", "phonics-1"); // 2→3 (mastery 保持)
    expect(rep2.loadMasteredIds()).toContain("q1");
  });
});

// ─── getTodayAdvancedCount ───────────────────────────────────────────────────

describe("QuizUseCase — getTodayAdvancedCount 仕様", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("今日ステージが進んだ単元のユニーク数を返す", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(
      new StubQuestionRepository([
        makeQuestion("q1", "english", "phonics-1"),
        makeQuestion("q2", "english", "phonics-2"),
        makeQuestion("q3", "english", "phonics-3"),
      ]),
      progressRepo,
    );
    await useCase.initialize();

    useCase.advanceCategoryStage("english", "phonics-1");
    useCase.advanceCategoryStage("english", "phonics-2");
    expect(useCase.getTodayAdvancedCount()).toBe(2);
  });

  it("昨日以前に進んだ単元は含まれない", async () => {
    vi.useFakeTimers();

    // 昨日ステージを進めておく
    vi.setSystemTime(new Date("2025-05-31T10:00:00Z"));
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(
      new StubQuestionRepository([
        makeQuestion("q1", "english", "phonics-1"),
        makeQuestion("q2", "english", "phonics-2"),
      ]),
      progressRepo,
    );
    await useCase.initialize();
    useCase.advanceCategoryStage("english", "phonics-1");

    // 今日に切り替え
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));
    expect(useCase.getTodayAdvancedCount()).toBe(0);
  });

  it("同一単元が同日内で複数回ステージ遷移しても 1 件としてカウントされる", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const useCase = new QuizUseCase(
      new StubQuestionRepository([makeQuestion("q1", "english", "phonics-1")]),
      new StubProgressRepository(),
    );
    await useCase.initialize();

    useCase.advanceCategoryStage("english", "phonics-1"); // 0→1
    useCase.advanceCategoryStage("english", "phonics-1"); // 1→2
    expect(useCase.getTodayAdvancedCount()).toBe(1);
  });
});

// ─── getRecommendedUnitsGlobal ───────────────────────────────────────────────

describe("QuizUseCase — getRecommendedUnitsGlobal 仕様", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const makeUnits = async (questions: Question[], stages: Record<string, number> = {}) => {
    const progressRepo = new StubProgressRepository();
    const useCase = new QuizUseCase(new StubQuestionRepository(questions), progressRepo);
    await useCase.initialize();
    // ステージを直接設定するために advanceCategoryStage を所定回数呼ぶ
    for (const [key, targetStage] of Object.entries(stages)) {
      const [subject, catId] = key.split("::");
      if (!subject || !catId) continue;
      for (let i = 0; i < targetStage; i++) useCase.advanceCategoryStage(subject, catId);
    }
    return { useCase };
  };

  it("修了済（stage=3）の単元は除外される", async () => {
    const questions = [makeQuestion("q1", "english", "phonics-1"), makeQuestion("q2", "english", "phonics-2")];
    const { useCase } = await makeUnits(questions, { "english::phonics-1": 3 });

    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.every((u) => u.stage < 3)).toBe(true);
    expect(result.some((u) => u.categoryId === "phonics-1")).toBe(false);
  });

  it("goalCount + alphaCount 件で打ち切られる", async () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`, "english", `cat${i}`));
    const { useCase } = await makeUnits(questions);

    const goal = 3;
    const alpha = 2;
    const result = useCase.getRecommendedUnitsGlobal(goal, alpha);
    expect(result.length).toBeLessThanOrEqual(goal + alpha);
  });

  it("未学習単元を設定順で先に並べる", async () => {
    const questions = [
      makeQuestion("q1", "english", "cat-a"),
      makeQuestion("q2", "english", "cat-b"),
      makeQuestion("q3", "english", "cat-c"),
    ];
    const { useCase } = await makeUnits(questions);
    const result = useCase.getRecommendedUnitsGlobal(3, 0);
    expect(result.map((u) => u.categoryId)).toEqual(["cat-a", "cat-b", "cat-c"]);
  });

  it("待機期間（学習済: 7日）を過ぎた復習対象は含まれる", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const questions = [makeQuestion("q1", "english", "phonics-1")];
    const { useCase } = await makeUnits(questions, { "english::phonics-1": 1 });

    // 7日後
    vi.setSystemTime(new Date("2025-06-08T10:00:01Z"));
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.some((u) => u.categoryId === "phonics-1")).toBe(true);
  });

  it("待機期間（学習済: 7日）未満の復習対象は含まれない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const questions = [makeQuestion("q1", "english", "phonics-1")];
    const { useCase } = await makeUnits(questions, { "english::phonics-1": 1 });

    // 6日後（待機期間内）
    vi.setSystemTime(new Date("2025-06-07T09:59:59Z"));
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.some((u) => u.categoryId === "phonics-1")).toBe(false);
  });

  it("待機期間（復習済: 14日）を過ぎた復習対象は含まれる", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const questions = [makeQuestion("q1", "english", "phonics-1")];
    const { useCase } = await makeUnits(questions, { "english::phonics-1": 2 });

    // 14日後
    vi.setSystemTime(new Date("2025-06-15T10:00:01Z"));
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.some((u) => u.categoryId === "phonics-1")).toBe(true);
  });

  it("複数教科の単元が含まれる（CategoryRegistry の subjects から取得）", async () => {
    const questions = [makeQuestion("q1", "english", "phonics"), makeQuestion("q2", "math", "addition")];
    const { useCase } = await makeUnits(questions);
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    const subjects = result.map((u) => u.subject);
    expect(subjects).toContain("english");
    expect(subjects).toContain("math");
  });

  it("学年ロック: 前の学年が全て学習済みでない場合、次学年の単元は除外される", async () => {
    const questions = [
      makeQuestionWithGrade("q1", "math", "addition", "小学1年"),
      makeQuestionWithGrade("q2", "math", "multiplication", "小学2年"),
    ];
    // addition は未学習のまま → multiplication は解禁されない
    const { useCase } = await makeUnits(questions);
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.some((u) => u.categoryId === "multiplication")).toBe(false);
    expect(result.some((u) => u.categoryId === "addition")).toBe(true);
  });

  it("学年ロック: 前の学年が全て学習済みなら次学年の単元が解禁される", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const questions = [
      makeQuestionWithGrade("q1", "math", "addition", "小学1年"),
      makeQuestionWithGrade("q2", "math", "multiplication", "小学2年"),
    ];
    // addition を学習済み(stage=1)に
    const { useCase } = await makeUnits(questions, { "math::addition": 1 });

    // 7日後（待機期間経過）
    vi.setSystemTime(new Date("2025-06-08T10:00:01Z"));
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.some((u) => u.categoryId === "multiplication")).toBe(true);
  });

  it("未学習単元は国語→数学→英語を優先して並ぶ", async () => {
    const questions = [
      makeQuestion("q1", "english", "english-a"),
      makeQuestion("q2", "english", "english-b"),
      makeQuestion("q3", "math", "math-a"),
      makeQuestion("q4", "japanese", "japanese-a"),
    ];
    const { useCase } = await makeUnits(questions);

    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.map((u) => `${u.subject}:${u.categoryId}`)).toEqual([
      "japanese:japanese-a",
      "math:math-a",
      "english:english-a",
      "english:english-b",
    ]);
  });

  it("復習対象がある場合は未学習の次に交互で挿入される", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    const questions = [
      makeQuestion("q1", "japanese", "japanese-new"),
      makeQuestion("q2", "math", "math-review"),
      makeQuestion("q3", "english", "english-new"),
    ];
    const { useCase } = await makeUnits(questions, { "math::math-review": 1 });

    vi.setSystemTime(new Date("2025-06-08T10:00:01Z"));
    const result = useCase.getRecommendedUnitsGlobal(5, 2);
    expect(result.map((u) => u.type).slice(0, 3)).toEqual(["unlearned", "review", "unlearned"]);
    expect(result[0]?.categoryId).toBe("japanese-new");
    expect(result[1]?.categoryId).toBe("math-review");
  });
});
