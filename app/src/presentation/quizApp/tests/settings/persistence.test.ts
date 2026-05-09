/**
 * QuizApp — クイズ設定永続化仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockQuestionFile,
} from "../../../quizApp.testHelpers";

describe("QuizApp — クイズ設定永続化仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("保存済みクイズ設定（問題数）が初期化時に DOM に反映される", async () => {
    localStorage.setItem(
      "quizSettings",
      JSON.stringify({ questionCount: 20, quizOrder: "random", includeMastered: false }),
    );
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radio20 = document.querySelector<HTMLInputElement>('input[name="questionCount"][value="20"]');
    const radio10 = document.querySelector<HTMLInputElement>('input[name="questionCount"][value="10"]');
    expect(radio20?.checked).toBe(true);
    expect(radio10?.checked).toBe(false);
  });

  it("保存済みクイズ設定（並び順）が初期化時に DOM に反映される", async () => {
    localStorage.setItem(
      "quizSettings",
      JSON.stringify({ questionCount: 10, quizOrder: "straight", includeMastered: false }),
    );
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radioStraight = document.querySelector<HTMLInputElement>('input[name="quizOrder"][value="straight"]');
    expect(radioStraight?.checked).toBe(true);
  });

  it("保存済みクイズ設定（学習済み含む）が初期化時に DOM に反映される", async () => {
    localStorage.setItem(
      "quizSettings",
      JSON.stringify({ questionCount: 10, quizOrder: "random", includeMastered: true }),
    );
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const includeRadio = document.querySelector<HTMLInputElement>('input[name="quizLearned"][value="include"]');
    expect(includeRadio?.checked).toBe(true);
  });

  it("問題数ラジオを変更すると localStorage に設定が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radio5 = document.querySelector<HTMLInputElement>('input[name="questionCount"][value="5"]');
    radio5!.checked = true;
    radio5?.dispatchEvent(new Event("change", { bubbles: true }));

    const saved = JSON.parse(localStorage.getItem("quizSettings") ?? "{}");
    expect(saved.questionCount).toBe(5);
  });

  it("並び順ラジオを変更すると localStorage に設定が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radioStraight = document.querySelector<HTMLInputElement>('input[name="quizOrder"][value="straight"]');
    radioStraight!.checked = true;
    radioStraight?.dispatchEvent(new Event("change", { bubbles: true }));

    const saved = JSON.parse(localStorage.getItem("quizSettings") ?? "{}");
    expect(saved.quizOrder).toBe("straight");
  });
});

// ─── スマホ用ナビゲーション仕様 ──────────────────────────────────────────────
