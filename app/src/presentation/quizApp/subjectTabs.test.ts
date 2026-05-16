/**
 * QuizApp — 教科タブ仕様
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
} from "./testHelpers";

describe("QuizApp — 教科タブ仕様", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    setupTabDom();
    setupFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("問題ロード後にタブに教科（おすすめ・進度・英語・数学・国語・管理・サポート）が7件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    expect(tabs.length).toBe(7);
  });

  it("問題ロード後に英語タブに role=tab が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    tabs.forEach((tab) => {
      expect(tab.getAttribute("role")).toBe("tab");
    });
  });

  it("初回アクセスでは「ガイド」タブがアクティブになっている", async () => {
    window.localStorage.removeItem("study-guide-first-visit-done");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.querySelector('.subject-tab[data-subject="support"]');
    expect(guideTab?.classList.contains("active")).toBe(true);
    expect(guideTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("2回目以降のアクセスでは「おすすめ」タブがアクティブになる", async () => {
    window.localStorage.setItem("study-guide-first-visit-done", "1");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const allTab = document.querySelector('.subject-tab[data-subject="all"]');
    expect(allTab?.classList.contains("active")).toBe(true);
    expect(allTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("英語タブをクリックすると statsInfo が英語の問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：5問");
  });

  it("英語タブをクリックするとアクティブタブが切り替わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    expect(englishTab?.classList.contains("active")).toBe(true);
    expect(englishTab?.getAttribute("aria-selected")).toBe("true");

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]');
    expect(mathTab).not.toBeNull();
    expect(mathTab!.classList.contains("active")).toBe(false);
    expect(mathTab!.getAttribute("aria-selected")).toBe("false");
  });

  it("英語タブをクリックするとカテゴリリストが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // mockQuestionFile は phonics-1 のみなのでカテゴリアイテムが描画されるはず
    const categoryItems = document.querySelectorAll(".category-item[data-category]");
    expect(categoryItems.length).toBeGreaterThan(0);
  });

  it("カテゴリアイテムをクリックすると statsInfo がそのカテゴリの問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリを表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：5問");
  });

  it("カテゴリ選択時は statsInfo 上部に前提単元・着手状況・完了ステータスを表示する", async () => {
    const mockManifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/basic.json", "english/advanced.json"],
    };
    const mockBasic = {
      subject: "english",
      subjectName: "英語",
      category: "basic",
      categoryName: "基本",
      questionType: "multiple-choice",
      questions: [{ id: "b1", question: "a", choices: ["a", "b", "c", "d"], correct: 0, explanation: "basic" }],
    };
    const mockAdvanced = {
      subject: "english",
      subjectName: "英語",
      category: "advanced",
      categoryName: "応用",
      questionType: "multiple-choice",
      prerequisites: ["basic"],
      questions: [{ id: "a1", question: "a", choices: ["a", "b", "c", "d"], correct: 0, explanation: "advanced" }],
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      }
      if (urlStr.includes("basic.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBasic) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAdvanced) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();
    const catItem = document.querySelector('.category-item[data-category="advanced"]') as HTMLElement;
    catItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("前提単元：基本");
    expect(statsInfo?.textContent).toContain("着手状況：着手不可");
    expect(statsInfo?.textContent).toContain("完了ステータス：未完了");
  });

  it("カテゴリアイテムに role=button と tabindex=0 が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const items = document.querySelectorAll(".category-item");
    items.forEach((item) => {
      expect(item.getAttribute("role")).toBe("button");
      expect(item.getAttribute("tabindex")).toBe("0");
    });
  });

  it("教科タブに .tab-stats 要素が描画されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab");
    tabs.forEach((tab) => {
      expect(tab.querySelector(".tab-stats")).toBeNull();
    });
  });

  it("サポートボタンが教科タブ行の一部として表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const supportButton = document.querySelector(".subject-tabs #supportBtn") as HTMLButtonElement | null;
    expect(supportButton).not.toBeNull();
    expect(supportButton?.tagName).toBe("BUTTON");
    expect(supportButton?.textContent).toContain("ガイド");
  });

  it("サポートボタンは管理タブの前に表示される", async () => {
    new QuizApp();
    await waitForCondition(() => document.querySelector(".subject-tabs #supportBtn") !== null);

    const tabs = Array.from(document.querySelectorAll(".subject-tabs [data-subject]"));
    const supportIndex = tabs.findIndex((tab) => tab.getAttribute("data-subject") === "support");
    const adminIndex = tabs.findIndex((tab) => tab.getAttribute("data-subject") === "admin");

    expect(supportIndex).toBeGreaterThanOrEqual(0);
    expect(adminIndex).toBeGreaterThanOrEqual(0);
    expect(supportIndex).toBeLessThan(adminIndex);
  });

  it("サポートボタンを押すと専用サポートパネルが表示される（解説タブではなく）", async () => {
    new QuizApp();
    await waitForCondition(() => document.querySelector(".subject-tabs #supportBtn") !== null);
    const supportButton = document.querySelector(".subject-tabs #supportBtn") as HTMLButtonElement | null;
    expect(supportButton).not.toBeNull();
    supportButton?.click();

    // サポートコンテンツが #supportContent に表示される
    await waitForCondition(() => document.getElementById("supportContent")?.classList.contains("hidden") === false);
    expect(document.getElementById("supportContent")?.classList.contains("hidden")).toBe(false);
    // 解説タブはアクティブにならない
    expect(document.getElementById("panelTab-guide")?.classList.contains("active")).toBe(false);
  });

  it("サポート内容は左メニュー・右コンテンツの分割表示になり、外部リンクを表示しない", async () => {
    new QuizApp();
    await waitForCondition(() => document.querySelector(".subject-tabs #supportBtn") !== null);
    const supportButton = document.querySelector(".subject-tabs #supportBtn") as HTMLButtonElement | null;
    expect(supportButton).not.toBeNull();
    supportButton?.click();

    // 左列: サポートメニューリストが表示される（3項目: はじめに/使い方/コンテンツ）
    await waitForCondition(() => document.querySelector("nav[aria-label='サポートメニュー']") !== null);
    const menu = document.querySelector("nav[aria-label='サポートメニュー']");
    const menuButtons = document.querySelectorAll("nav[aria-label='サポートメニュー'] button");
    expect(menu).not.toBeNull();
    expect(menuButtons.length).toBe(3);

    // 左メニューに「はじめに」「使い方」「教科・単元」が含まれる
    const menuLabels = Array.from(menuButtons).map((b) => b.textContent ?? "");
    expect(menuLabels.some((l) => l.includes("はじめに"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("使い方"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("教科・単元"))).toBe(true);

    // 右列: #supportContent にコンテンツが表示される
    await waitForCondition(() => {
      const content = document.getElementById("supportContent");
      return content !== null && !content.classList.contains("hidden");
    });
    const content = document.getElementById("supportContent");
    expect(content).not.toBeNull();

    // 使い方ボタンが存在することを確認する
    const usageButton = Array.from(menuButtons).find((button) => button.textContent?.includes("使い方"));
    expect(usageButton).toBeDefined();
  });
});
