/**
 * QuizApp — 3階層カテゴリ仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  mockQuestionFile,
} from "../quizApp.testHelpers";

describe("QuizApp — 3階層カテゴリ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMockWith3Levels();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("英語タブをクリックするとトップカテゴリグループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const topGroupHeaders = document.querySelectorAll(".category-top-group-header");
    expect(topGroupHeaders.length).toBe(2); // grammar, pronunciation
  });

  it("トップカテゴリの中間グループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup).not.toBeNull();
    const tensesGroup = grammarTopGroup?.querySelector('.category-group[data-parent-category="verb"]');
    expect(tensesGroup).not.toBeNull();
  });

  it("カテゴリアイテムに data-top-category が設定される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="tenses-past"]') as HTMLElement;
    expect(catItem?.dataset.topCategory).toBe("grammar");
    expect(catItem?.dataset.parentCategory).toBe("verb");
  });

  it("トップカテゴリヘッダーをクリックするとカテゴリ詳細が表示される（折りたたまない）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>(
      '.category-top-group-header[data-top-category="grammar"]',
    );
    grammarHeader?.click();

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup?.classList.contains("collapsed")).toBe(false);
    expect(grammarHeader?.classList.contains("active")).toBe(true);
  });

  it("トップカテゴリの三角ボタンをクリックすると折りたたみ・再展開できる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>(
      '.category-top-group-header[data-top-category="grammar"]',
    );
    const toggleBtn = grammarHeader?.querySelector<HTMLElement>(".category-top-group-toggle");
    toggleBtn?.click(); // 折りたたむ
    toggleBtn?.click(); // 展開する

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("折りたたまれたトップカテゴリにアクティブなカテゴリがある場合は自動展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammarトップグループを折りたたむ
    const grammarHeader = document.querySelector<HTMLElement>(
      '.category-top-group-header[data-top-category="grammar"]',
    );
    const toggleBtn = grammarHeader?.querySelector<HTMLElement>(".category-top-group-toggle");
    toggleBtn?.click();
    expect(
      document.querySelector('.category-top-group[data-top-category="grammar"]')?.classList.contains("collapsed"),
    ).toBe(true);

    // カテゴリアイテムをプログラム的にクリック
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();

    // トップグループが自動展開されること
    expect(
      document.querySelector('.category-top-group[data-top-category="grammar"]')?.classList.contains("collapsed"),
    ).toBe(false);
  });
});
