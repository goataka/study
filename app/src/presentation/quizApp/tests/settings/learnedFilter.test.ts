/**
 * QuizApp — 学習済みフィルター（含める/含めない）仕様
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

describe("QuizApp — 学習済みフィルター（含める/含めない）仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では「含めない」が選択されており全問習得済み時にスタートできない", async () => {
    // 全問を習得済みにする
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // 「含めない」がデフォルトで選択されていることを確認
    const excludeRadio = document.querySelector<HTMLInputElement>('input[name="quizLearned"][value="exclude"]');
    expect(excludeRadio?.checked).toBe(true);

    // 確認ダイアログが表示される（全問習得済みのため）
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    startBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 確認ダイアログが表示されていること（キャンセルする）
    const confirmDialog = document.getElementById("confirmDialog");
    expect(confirmDialog?.classList.contains("hidden")).toBe(false);
    // キャンセルしてスタート画面に留まることを確認
    document.getElementById("confirmDialogCancel")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // ダイアログが閉じてスタート画面のまま（クイズ画面に遷移しない）
    expect(confirmDialog?.classList.contains("hidden")).toBe(true);
    const startScreen = document.getElementById("startScreen");
    expect(startScreen?.classList.contains("hidden")).toBe(false);
  });

  it("「含める」を選択すると学習済み問題も含めてスタートできる", async () => {
    // 全問を習得済みにする
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // 「含める」に変更する
    const includeRadio = document.querySelector<HTMLInputElement>('input[name="quizLearned"][value="include"]');
    includeRadio!.checked = true;
    includeRadio?.dispatchEvent(new Event("change", { bubbles: true }));

    // スタートボタンをクリック（ダイアログなしでスタートするはず）
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    startBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // クイズ画面に遷移していること
    const quizScreen = document.getElementById("quizScreen");
    expect(quizScreen?.classList.contains("hidden")).toBe(false);
  });
});
