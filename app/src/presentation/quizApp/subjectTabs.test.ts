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
    setupTabDom();
    setupFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("初期状態では「おすすめ」タブがアクティブになっている", async () => {
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
    expect(supportButton?.textContent).toContain("サポート");
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

    // 左列: サポートメニューリストが表示される（3項目: はじめに/マニュアル/コンテンツ）
    await waitForCondition(() => document.querySelector("nav[aria-label='サポートメニュー']") !== null);
    const menu = document.querySelector("nav[aria-label='サポートメニュー']");
    const menuButtons = document.querySelectorAll("nav[aria-label='サポートメニュー'] button");
    expect(menu).not.toBeNull();
    expect(menuButtons.length).toBe(3);

    // 左メニューに「はじめに」「マニュアル」「コンテンツ」が含まれる
    const menuLabels = Array.from(menuButtons).map((b) => b.textContent ?? "");
    expect(menuLabels.some((l) => l.includes("はじめに"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("マニュアル"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("コンテンツ"))).toBe(true);

    // 右列: #supportContent にコンテンツが表示される
    await waitForCondition(() => {
      const content = document.getElementById("supportContent");
      return content !== null && !content.classList.contains("hidden");
    });
    const content = document.getElementById("supportContent");
    expect(content).not.toBeNull();

    // マニュアルボタンをクリックするとサブタブが表示される
    const manualButton = Array.from(menuButtons).find((button) => button.textContent?.includes("マニュアル")) as
      | HTMLButtonElement
      | undefined;
    expect(manualButton).toBeDefined();
    manualButton!.click();

    // マニュアルタブにスタートアップガイドのサブタブが表示される
    await waitForCondition(() => document.querySelector(".support-subtab") !== null);
    const subTabs = document.querySelectorAll(".support-subtab");
    expect(subTabs.length).toBeGreaterThan(0);
    const subTabLabels = Array.from(subTabs).map((b) => b.textContent ?? "");
    expect(subTabLabels.some((l) => l.includes("スタートアップガイド"))).toBe(true);
    expect(subTabLabels.some((l) => l.includes("トラブルシューティング"))).toBe(true);
  });
});
