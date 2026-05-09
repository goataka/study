/**
 * QuizApp — 親カテゴリタブ仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockQuestionFile,
} from "../quizApp.testHelpers";

describe("QuizApp — 親カテゴリタブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMockWithParent();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("英語タブをクリックすると親カテゴリのグループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const groupHeaders = document.querySelectorAll(".category-group-header");
    expect(groupHeaders.length).toBe(2); // grammar, phonics
  });

  it("英語タブをクリックすると子カテゴリアイテムが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar の tenses-past + phonics の phonics-1
    const catItems = document.querySelectorAll(".category-item[data-category]");
    expect(catItems.length).toBeGreaterThanOrEqual(2);
  });

  it("文法カテゴリアイテムをクリックすると statsInfo がその配下全問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarCatItem = document.querySelector('.category-item[data-category="tenses-past"]') as HTMLElement;
    grammarCatItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：3問");
  });

  it("グループヘッダーをクリックしてもグループは折りたたまれない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("三角ボタンをクリックすると折りたたみを切り替えられる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    const toggleBtn = grammarHeader?.querySelector<HTMLElement>(".category-group-toggle");
    toggleBtn?.click(); // 折りたたむ
    toggleBtn?.click(); // 展開する

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("グループ折りたたみボタンに aria-expanded 属性が設定される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const toggleBtn = document.querySelector<HTMLElement>(
      '.category-group-header[data-parent-category="grammar"] .category-group-toggle',
    );
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");

    toggleBtn?.click();
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("false");
  });

  it("折りたたまれたグループに属するカテゴリを選択するとグループが自動展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar グループを折りたたむ
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.querySelector<HTMLElement>(".category-group-toggle")?.click();
    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);

    // ここではユーザーの可視要素への操作を再現するのではなく、
    // selectFirstUnlearnedCategory 相当の「プログラム的なカテゴリ選択」を模擬する。
    // そのため、折りたたまれたグループ内の category-item に対して
    // click ハンドラーを直接発火させ、自動展開されることを確認する。
    const grammarCatItem = grammarGroup?.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    grammarCatItem?.click();

    // グループが自動展開されていること
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("カテゴリグループヘッダーに解説ボタンは表示されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    const guideBtn = grammarHeader?.querySelector(".category-group-guide-btn");
    expect(guideBtn).toBeNull();

    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const phonicsGuideBtn = phonicsHeader?.querySelector(".category-group-guide-btn");
    expect(phonicsGuideBtn).toBeNull();
  });

  it("親カテゴリヘッダーをクリックするとカテゴリ詳細が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    expect(document.querySelector(".selected-unit-info-name")?.textContent).toContain("文法");
    expect(document.getElementById("selectedUnitInfo")?.classList.contains("hidden")).toBe(false);
  });

  it("親カテゴリの折りたたみは三角ボタンでのみ切り替わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);

    const toggleBtn = grammarHeader?.querySelector<HTMLElement>(".category-group-toggle");
    toggleBtn?.click();
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);
  });
});
