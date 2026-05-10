/**
 * QuizApp — 学習済みにするボタン仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import { setupTabDom, setupFetchMock } from "../testHelpers";

describe("QuizApp — 学習済みにするボタン仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時（総合タブ表示中）は「学習済みにする」ボタンが無効になっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(true);
  });

  it("特定カテゴリを選択すると「学習済みにする」ボタンが有効になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(false);
  });

  it("「学習済みにする」ボタンをクリックするとカテゴリが ✅ になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 学習済みになるので ✅ が表示される
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("学習済みのカテゴリを選択するとボタンが「↩ 未学習に戻す」になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 学習済みになったのでボタンが「未学習に戻す」に変わる
    expect(markLearnedBtn.textContent).toBe("↩ 未学習に戻す");
  });

  it("「↩ 未学習に戻す」ボタンをクリックするとカテゴリが 🔄 に戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    // 学習済みにする
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("✅");

    // 未学習に戻す
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("🔄");
    expect(markLearnedBtn.textContent).toBe("✅ 学習済みにする");
  });
});
