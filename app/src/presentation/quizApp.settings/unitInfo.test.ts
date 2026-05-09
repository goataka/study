/**
 * QuizApp — 選択中の単元情報パネル仕様
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

describe("QuizApp — 選択中の単元情報パネル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では selectedUnitInfo は非表示", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);
  });

  it("単元を選択すると selectedUnitInfo が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(false);
  });

  it("単元選択時に selectedUnitInfo に単元名が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const nameEl = document.querySelector(".selected-unit-info-name");
    expect(nameEl?.textContent).toBe("フォニックス（1文字）");
  });

  it("selectedUnitInfo の閉じるボタンをクリックすると選択が解除されパネルが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const closeBtn = document.querySelector<HTMLButtonElement>(".selected-unit-close-btn");
    closeBtn?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);

    // カテゴリ選択も解除されること
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("同じ教科タブを再クリックすると selectedUnitInfo が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    // 同じ教科タブを再クリックすると category="all" にリセットされる
    englishTab?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);
  });

  it("親カテゴリのみの単元選択時にカテゴリパスバッジが表示される", async () => {
    setupTabDom();
    setupFetchMockWithParent();
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).not.toBeNull();
    expect(catLabel?.textContent).toBe("発音");
  });

  it("トップカテゴリ＋親カテゴリの単元選択時にカテゴリパスバッジが `Top › Parent` 形式で表示される", async () => {
    setupTabDom();
    setupFetchMockWith3Levels();
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).not.toBeNull();
    expect(catLabel?.textContent).toBe("文法 › 動詞");
  });

  it("カテゴリ階層のない単元選択時にはカテゴリパスバッジが表示されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).toBeNull();
  });
});
