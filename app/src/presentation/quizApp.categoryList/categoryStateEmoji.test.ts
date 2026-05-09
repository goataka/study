/**
 * QuizApp — カテゴリ学習状態絵文字仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { setupTabDom, setupFetchMock } from "../quizApp.testHelpers";

describe("QuizApp — カテゴリ学習状態絵文字仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態（未学習）では ⬜ が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("⬜");
  });

  it("学習済（全問題が masteredIds に含まれる）のカテゴリは ✅ が表示される", async () => {
    // 履歴に phonics-1 を登録（学習済）+ 全問題を masteredIds に設定
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [],
        },
      ]),
    );
    // 間違いなし・全問題習得済み
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("学習中（履歴あり・間違いあり）のカテゴリは 🔄 が表示される", async () => {
    // 履歴に phonics-1 を登録
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 3,
          entries: [],
        },
      ]),
    );
    // 間違いあり（phonics-1 の問題IDを登録）
    localStorage.setItem("wrongQuestions", JSON.stringify(["q1"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("🔄");
  });
});
