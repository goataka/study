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

  it("問題ロード後にタブに教科（おすすめ・進度・英語・数学・国語・管理）が6件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    expect(tabs.length).toBe(6);
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

  it("v1 配下ではサポートボタンで解説パネル内にサポート内容を表示する", async () => {
    window.history.replaceState({}, "", "/study/v1/");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const supportButton = document.querySelector(".subject-tabs #supportBtn") as HTMLButtonElement | null;
    supportButton?.click();

    await waitForCondition(
      () => document.getElementById("guidePanelFrame")?.textContent?.includes("サポート") === true,
    );
  });

  it("サポートボタンを押すと解説タブに切り替わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const supportButton = document.querySelector(".subject-tabs #supportBtn") as HTMLButtonElement | null;
    supportButton?.click();

    await waitForCondition(() => document.getElementById("panelTab-guide")?.classList.contains("active") === true);
    expect(document.getElementById("panelTab-guide")?.classList.contains("active")).toBe(true);
  });

  it("サポート内容の箇条書きとリンクに視認性クラスが付き、絵文字はaria-hiddenになる", async () => {
    new QuizApp();
    await waitForCondition(() => document.querySelector(".subject-tabs #supportBtn") !== null);
    const supportButton = document.querySelector(".subject-tabs #supportBtn") as HTMLButtonElement | null;
    expect(supportButton).not.toBeNull();
    supportButton?.click();

    await waitForCondition(() => document.querySelector("#guidePanelFrame ul") !== null);
    const list = document.querySelector("#guidePanelFrame ul");
    const link = document.querySelector("#guidePanelFrame a");
    const hiddenEmojiSpans = document.querySelectorAll("#guidePanelFrame span[aria-hidden='true']");
    expect(list).not.toBeNull();
    expect(link).not.toBeNull();
    expect(hiddenEmojiSpans.length).toBeGreaterThanOrEqual(5);
    expect(list?.className).toContain("list-disc");
    expect(list?.className).toContain("pl-8");
    expect(link?.className).toContain("underline");
    expect(link?.className).toContain("text-[#0366d6]");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
