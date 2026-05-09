/**
 * QuizApp — スマホ用単元一覧戻るボタン仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockManifest,
  mockQuestionFile,
} from "../../../quizApp.testHelpers";

describe("QuizApp — スマホ用単元一覧戻るボタン仕様", () => {
  beforeEach(() => {
    setupTabDom();
    // スマホ用ボタンを DOM に追加
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <button id="mobileBackBtn" class="mobile-back-btn">← 単元一覧</button>
      <button id="adminMenuBtn" class="admin-menu-header-btn">⚙️</button>
    `,
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("通常タブで単元選択後に戻るボタンを押すと category-only クラスが付く", async () => {
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリック
    const tabs = document.querySelectorAll<HTMLButtonElement>(".subject-tab");
    const englishTab = Array.from(tabs).find((t) => t.dataset.subject === "english");
    englishTab?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // カテゴリアイテムをクリック
    const items = document.querySelectorAll<HTMLElement>(".category-item");
    if (items.length > 0) items[0].click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // subjectContent が category-only でないことを確認（単元選択済み）
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(false);

    // 戻るボタンをクリック
    const backBtn = document.getElementById("mobileBackBtn");
    backBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // category-only クラスが付いて単元未選択状態になる
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("メニューボタンをクリックすると管理タブが選択される", async () => {
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // メニューボタンをクリック
    const menuBtn = document.getElementById("adminMenuBtn");
    menuBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 管理タブがアクティブになる
    const adminTab = document.querySelector<HTMLButtonElement>('.subject-tab[data-subject="admin"]');
    expect(adminTab?.classList.contains("active")).toBe(true);

    // 管理コンテンツパネルが表示される（category-only は不使用、右パネルに管理コンテンツを表示）
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(false);
    const adminContent = document.getElementById("adminContent");
    expect(adminContent?.classList.contains("hidden")).toBe(false);
  });
});
