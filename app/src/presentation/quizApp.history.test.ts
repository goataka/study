/**
 * QuizApp プレゼンテーション層 — 履歴表示仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { setupTabDom, setupFetchMock, mockQuestionFile } from "./quizApp.testHelpers";

describe("QuizApp — 履歴モード表示仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const buildRecord = (mode: string) => ({
    id: "r1",
    date: new Date().toISOString(),
    subject: "english",
    subjectName: "英語",
    category: "phonics-1",
    categoryName: "フォニックス（1文字）",
    mode,
    totalCount: 5,
    correctCount: 5,
    entries: [],
  });

  it("mode=random の履歴には履歴モード表示がない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("random")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl).toBeNull();
  });

  it("mode=practice の履歴には履歴モード表示がない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("practice")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl).toBeNull();
  });

  it("mode=retry の履歴には履歴モード表示がない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("retry")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl).toBeNull();
  });

  it("mode=manual の履歴には履歴モード表示がない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl).toBeNull();
  });

  it("mode=manual の履歴のスコアは「-」と表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const scoreEl = document.querySelector(".history-score");
    expect(scoreEl?.textContent).toBe("-");
  });

  it("mode=manual の履歴には横三角（▶）が表示されない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toggleEl = document.querySelector(".history-toggle");
    expect(toggleEl).toBeNull();
  });

  it("mode=manual の履歴のヘッダーは操作不可で、click や Enter/Space でも詳細は開かない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = document.querySelector<HTMLElement>(".history-item-header");
    const detail = document.querySelector(".history-detail");

    expect(header).not.toBeNull();
    expect(detail).not.toBeNull();
    expect(header?.hasAttribute("role")).toBe(false);
    expect(header?.hasAttribute("tabindex")).toBe(false);
    expect(header?.hasAttribute("aria-expanded")).toBe(false);
    expect(detail?.classList.contains("hidden")).toBe(true);

    header?.click();
    expect(detail?.classList.contains("hidden")).toBe(true);

    header?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(detail?.classList.contains("hidden")).toBe(true);

    header?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(detail?.classList.contains("hidden")).toBe(true);
  });

  it("mode=random の履歴にはスコアが「N/N (N%)」形式で表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("random")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const scoreEl = document.querySelector(".history-score");
    expect(scoreEl?.textContent).toBe("5/5 (100%)");
  });

  it("mode=random の履歴には横三角（▶）が表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("random")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toggleEl = document.querySelector(".history-toggle");
    expect(toggleEl?.textContent).toBe("▶");
  });
});

describe("QuizApp — 履歴エントリーの問題文・回答再構築仕様", () => {
  // mockQuestionFile の問題 q1 のchoices は ["ア", "イ", "ウ", "エ"]、correct: 0
  const buildRecordWithEntries = (
    entries: Array<{
      questionId: string;
      isCorrect: boolean;
      userAnswerIndex: number;
      userAnswerChoiceText?: string;
      correctAnswerText?: string;
    }>,
  ) => ({
    id: "r1",
    date: new Date().toISOString(),
    subject: "english",
    subjectName: "英語",
    category: "phonics-1",
    categoryName: "フォニックス（1文字）",
    mode: "random",
    totalCount: entries.length,
    correctCount: entries.filter((e) => e.isCorrect).length,
    entries,
  });

  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正解エントリーでは問題文と「正解:」テキストが表示される", async () => {
    const record = buildRecordWithEntries([{ questionId: "q1", isCorrect: true, userAnswerIndex: 0 }]);
    localStorage.setItem("quizHistory", JSON.stringify([record]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 履歴を展開するためにヘッダーをクリック
    const header = document.querySelector<HTMLElement>(".history-item-header");
    header?.click();

    const questionP = document.querySelector(".history-entry-question");
    const answerP = document.querySelector(".history-entry-answer");
    expect(questionP?.textContent).toBe("問題 1"); // mockQuestionFile の q1 の question
    expect(answerP?.textContent).toContain("正解:");
  });

  it("不正解エントリーでは「あなたの回答:」と「→ 正解:」が表示される", async () => {
    const record = buildRecordWithEntries([{ questionId: "q1", isCorrect: false, userAnswerIndex: 1 }]);
    localStorage.setItem("quizHistory", JSON.stringify([record]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = document.querySelector<HTMLElement>(".history-item-header");
    header?.click();

    const answerP = document.querySelector(".history-entry-answer");
    expect(answerP?.textContent).toContain("あなたの回答:");
    expect(answerP?.textContent).toContain("→ 正解:");
  });

  it("履歴に保存された回答テキストがあればそれを優先して表示する", async () => {
    const record = buildRecordWithEntries([
      {
        questionId: "q1",
        isCorrect: false,
        userAnswerIndex: -1,
        userAnswerChoiceText: "旧データの回答",
        correctAnswerText: "旧データの正解",
      },
    ]);
    localStorage.setItem("quizHistory", JSON.stringify([record]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = document.querySelector<HTMLElement>(".history-item-header");
    header?.click();

    const answerP = document.querySelector(".history-entry-answer");
    expect(answerP?.textContent).toContain("旧データの回答");
    expect(answerP?.textContent).toContain("旧データの正解");
  });

  it("questionId が存在しない場合はフォールバック表示になる", async () => {
    const record = buildRecordWithEntries([{ questionId: "nonexistent-q", isCorrect: true, userAnswerIndex: 0 }]);
    localStorage.setItem("quizHistory", JSON.stringify([record]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = document.querySelector<HTMLElement>(".history-item-header");
    header?.click();

    const questionP = document.querySelector(".history-entry-question");
    expect(questionP?.textContent).toContain("nonexistent-q");
    const answerP = document.querySelector(".history-entry-answer");
    expect(answerP?.textContent).toBe("正解");
  });
});
