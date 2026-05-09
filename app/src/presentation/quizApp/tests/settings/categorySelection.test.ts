/**
 * QuizApp — カテゴリ/サブカテゴリ選択と表示制御仕様
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

describe("QuizApp — カテゴリ/サブカテゴリ選択と表示制御仕様", () => {
  beforeEach(() => {
    setupTabDom();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("親カテゴリヘッダーをクリックすると確認・問題一覧・履歴タブが非表示になる", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/grammar.json", "english/phonics.json"],
    };
    const grammarFile = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-past",
      categoryName: "過去形",
      parentCategory: "grammar",
      parentCategoryName: "文法",
      parentCategoryGuideUrl: "../english/grammar/guide",
      questions: [{ id: "g1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const phonicsFile = {
      subject: "english",
      subjectName: "英語",
      category: "phonics-1",
      categoryName: "フォニックス",
      parentCategory: "phonics",
      parentCategoryName: "発音",
      questions: [{ id: "p1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("grammar.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(phonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar親カテゴリヘッダーをクリック
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    // 確認・問題一覧・履歴タブが非表示になること
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("panelTab-questions")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("panelTab-history")?.classList.contains("hidden")).toBe(true);

    // 解説タブは非表示にならないこと
    expect(document.getElementById("panelTab-guide")?.classList.contains("hidden")).toBe(false);
  });

  it("単元をクリックすると確認・問題一覧・履歴タブが再表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/grammar.json"],
    };
    const grammarFile = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-past",
      categoryName: "過去形",
      parentCategory: "grammar",
      parentCategoryName: "文法",
      parentCategoryGuideUrl: "../english/grammar/guide",
      questions: [{ id: "g1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 親カテゴリを選択してタブを非表示にする
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(true);

    // 単元をクリックするとタブが再表示される
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("panelTab-history")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("panelTab-questions")?.classList.contains("hidden")).toBe(false);
  });

  it("親カテゴリヘッダーのアクティブ状態が設定される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/grammar.json"],
    };
    const grammarFile = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-past",
      categoryName: "過去形",
      parentCategory: "grammar",
      parentCategoryName: "文法",
      parentCategoryGuideUrl: "../english/grammar/guide",
      questions: [{ id: "g1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');

    // 初期状態はアクティブでない
    expect(grammarHeader?.classList.contains("active")).toBe(false);

    // クリックするとアクティブになる
    grammarHeader?.click();
    expect(grammarHeader?.classList.contains("active")).toBe(true);

    // 再クリックで非選択（トグル）
    grammarHeader?.click();
    expect(grammarHeader?.classList.contains("active")).toBe(false);
  });
});
