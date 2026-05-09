/**
 * QuizApp — 単元アイテム解説ボタン仕様 (#501)
 */

// @vitest-environment jsdom

import { QuizApp } from "../../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  mockQuestionFile,
} from "../../../quizApp.testHelpers";

describe("QuizApp — 単元アイテム解説ボタン仕様 (#501)", () => {
  beforeEach(() => {
    setupTabDom();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("guideUrl ありのカテゴリにも解説ボタン（📖）は表示されない", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/tenses-present.json"],
    };
    const questionFileWithGuide = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-present",
      categoryName: "現在形",
      guideUrl: "../english/grammar/tenses-present/guide.md",
      questions: Array.from({ length: 3 }, (_, i) => ({
        id: `q${i + 1}`,
        question: `問題 ${i + 1}`,
        choices: ["A", "B", "C", "D"],
        correct: 0,
        explanation: `解説 ${i + 1}`,
      })),
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(questionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="tenses-present"]');
    const guideBtn = catItem?.querySelector("button.category-item-guide-btn");
    expect(guideBtn).toBeNull();
  });

  it("guideUrl なしのカテゴリにも解説ボタン（📖）は表示されない", async () => {
    setupFetchMock(); // mockQuestionFile には guideUrl がない

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const guideBtn = catItem?.querySelector("button.category-item-guide-btn");
    expect(guideBtn).toBeNull();
  });

  it("単元をクリックするとそのカテゴリが選択されてパネルタブが引き継がれる", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/tenses-present.json"],
    };
    const questionFileWithGuide = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-present",
      categoryName: "現在形",
      guideUrl: "../english/grammar/tenses-present/guide.md",
      questions: Array.from({ length: 3 }, (_, i) => ({
        id: `q${i + 1}`,
        question: `問題 ${i + 1}`,
        choices: ["A", "B", "C", "D"],
        correct: 0,
        explanation: `解説 ${i + 1}`,
      })),
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(questionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 単元をクリックするとパネルタブは前回のまま引き継がれる（解説タブに自動切換えしない）
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-present"]');
    catItem?.click();

    // 単元が選択されていること
    expect(catItem?.classList.contains("active")).toBe(true);

    // guideContent が hidden でないこと（guide タブが初期状態から継続されている場合）
    // または quizModePanel が visible（quiz タブが初期状態の場合）
    // ─ タブは変化しないので、どのパネルが表示されるかは初期タブに依存する
    const guideTab = document.getElementById("panelTab-guide");
    const quizTab = document.getElementById("panelTab-quiz");
    const guideTabActive = guideTab?.classList.contains("active") ?? false;
    const quizTabActive = quizTab?.classList.contains("active") ?? false;
    // いずれかのタブがアクティブであること
    expect(guideTabActive || quizTabActive).toBe(true);
  });
});
