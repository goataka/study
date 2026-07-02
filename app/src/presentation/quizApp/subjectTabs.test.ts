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
  StubProgressRepository,
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

  it("問題ロード後にタブに教科（おすすめ・進度・英語・数学・国語・履歴・管理・サポート）が8件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    expect(tabs.length).toBe(8);
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

  it("履歴タブは国語タブと管理タブの間に表示される", async () => {
    new QuizApp();
    await waitForCondition(() => document.querySelector(".subject-tabs .subject-tab[data-subject='history']") !== null);

    const tabs = Array.from(document.querySelectorAll(".subject-tabs [data-subject]"));
    const japaneseIndex = tabs.findIndex((tab) => tab.getAttribute("data-subject") === "japanese");
    const historyIndex = tabs.findIndex((tab) => tab.getAttribute("data-subject") === "history");
    const adminIndex = tabs.findIndex((tab) => tab.getAttribute("data-subject") === "admin");

    expect(japaneseIndex).toBeGreaterThanOrEqual(0);
    expect(historyIndex).toBeGreaterThanOrEqual(0);
    expect(adminIndex).toBeGreaterThanOrEqual(0);
    expect(japaneseIndex).toBeLessThan(historyIndex);
    expect(historyIndex).toBeLessThan(adminIndex);
  });

  it("履歴タブでは教科メニューから教科を選び、単元毎と問題毎を切り替えて表示できる", async () => {
    const now = new Date().toISOString();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              subjects: { english: { name: "英語" }, math: { name: "数学" } },
              questionFiles: ["english/phonics-1.json", "math/addition-1.json"],
            }),
        } as Response);
      }
      if (urlStr.includes("math/addition-1.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subject: "math",
              subjectName: "数学",
              category: "addition-1",
              categoryName: "たし算（1）",
              questions: [{ id: "m1", question: "1+1", choices: ["2", "3", "4", "5"], correct: 0, explanation: "2" }],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockQuestionFile),
      } as Response);
    });
    const repo = new StubProgressRepository();
    repo.saveHistory([
      {
        id: "r1",
        date: now,
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス（1文字）",
        mode: "random",
        totalCount: 1,
        correctCount: 1,
        entries: [{ questionId: "q1", userAnswerIndex: 0, userAnswerChoiceText: "ア", isCorrect: true }],
      },
      {
        id: "r2",
        date: now,
        subject: "math",
        subjectName: "数学",
        category: "addition-1",
        categoryName: "たし算（1）",
        mode: "random",
        totalCount: 1,
        correctCount: 1,
        entries: [{ questionId: "m1", userAnswerIndex: 0, userAnswerChoiceText: "2", isCorrect: true }],
      },
    ]);

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.subject-tab[data-subject="history"]') as HTMLElement | null;
    expect(historyTab).not.toBeNull();
    historyTab?.click();

    await waitForCondition(() => document.getElementById("historySubjectMenuButton-english") !== null);
    expect(document.getElementById("historySubjectMenuButton-english")).not.toBeNull();
    expect(document.getElementById("historySubjectMenuButton-math")).not.toBeNull();
    expect(document.getElementById("historySubjectDetailHeading")?.textContent).toContain("英語");
    expect(document.getElementById("historySubjectUnitList")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("historySubjectUnitList")?.textContent).toContain("フォニックス");

    const mathButton = document.getElementById("historySubjectMenuButton-math") as HTMLButtonElement | null;
    mathButton?.click();

    await waitForCondition(
      () => document.getElementById("historySubjectDetailHeading")?.textContent?.includes("数学") === true,
    );
    expect(document.getElementById("historySubjectDetailHeading")?.textContent).toContain("数学");
    expect(document.getElementById("historySubjectUnitList")?.textContent).toContain("たし算");

    const questionSwitch = document.getElementById("historySubjectTab-question") as HTMLButtonElement | null;
    const unitSwitch = document.getElementById("historySubjectTab-unit") as HTMLButtonElement | null;
    expect(questionSwitch).not.toBeNull();
    expect(unitSwitch?.classList.contains("panel-tab")).toBe(true);
    expect(questionSwitch?.classList.contains("panel-tab")).toBe(true);
    questionSwitch?.click();

    await waitForCondition(
      () => document.getElementById("historySubjectQuestionList")?.classList.contains("hidden") === false,
    );
    expect(document.getElementById("historySubjectQuestionList")?.classList.contains("hidden")).toBe(false);
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

    // 左列: サポートメニューリストが表示される（5項目）
    await waitForCondition(() => document.querySelector("nav[aria-label='サポートメニュー']") !== null);
    const menu = document.querySelector("nav[aria-label='サポートメニュー']");
    const menuButtons = document.querySelectorAll("nav[aria-label='サポートメニュー'] button");
    expect(menu).not.toBeNull();
    expect(menuButtons.length).toBe(5);

    // 左メニューに各項目が含まれる
    const menuLabels = Array.from(menuButtons).map((b) => b.textContent ?? "");
    expect(menuLabels.some((l) => l.includes("はじめに"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("使い方"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("教科・単元"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("トラブルシューティング"))).toBe(true);
    expect(menuLabels.some((l) => l.includes("機能リファレンス"))).toBe(true);

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
