/**
 * QuizApp — カテゴリ例文表示仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  mockQuestionFile,
} from "../testHelpers";

describe("QuizApp — カテゴリ例文表示仕様", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("example なしのカテゴリでは例文要素が存在しない", async () => {
    setupTabDom();
    setupFetchMock(); // mockQuestionFile には example がない
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const exampleEl = catItem?.querySelector(".category-example");
    expect(exampleEl).toBeNull();
  });

  it("description も example もないカテゴリでは category-item-inline-info が存在しない", async () => {
    setupTabDom();
    setupFetchMock(); // mockQuestionFile には description も example もない
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const inlineInfo = catItem?.querySelector(".category-item-inline-info");
    expect(inlineInfo).toBeNull();
  });

  it("example ありのカテゴリでは単元選択時に例文が選択情報パネルに表示される", async () => {
    setupTabDom();
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/phonics-1.json"],
    };
    const questionFileWithExample = {
      subject: "english",
      subjectName: "英語",
      category: "phonics-1",
      categoryName: "フォニックス（1文字）",
      example: "I play games.",
      questions: Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        question: `問題 ${i + 1}`,
        choices: ["ア", "イ", "ウ", "エ"],
        correct: 0,
        explanation: `解説 ${i + 1}`,
      })),
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(questionFileWithExample) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 単元一覧のインライン情報コンテナに例文が含まれること
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    expect(catItem?.querySelector(".category-item-right .category-example")).not.toBeNull();

    // 単元を選択すると選択情報パネルに例文が表示されること
    catItem?.click();
    const infoPanel = document.getElementById("selectedUnitInfo");
    const exampleEl = infoPanel?.querySelector(".selected-unit-info-example");
    expect(exampleEl).not.toBeNull();
    expect(exampleEl?.textContent).toContain("I play games.");
  });

  it("バッククォートで囲まれた部分が単元選択時の選択情報パネルで code 要素として表示される", async () => {
    setupTabDom();
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/tenses-regular-present.json"],
    };
    const questionFileWithExample = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-regular-present",
      categoryName: "一般動詞の現在形",
      example: "I `play` games.",
      questions: Array.from({ length: 3 }, (_, i) => ({
        id: `q${i + 1}`,
        question: `問題 ${i + 1}`,
        choices: ["ア", "イ", "ウ", "エ"],
        correct: 0,
        explanation: `解説 ${i + 1}`,
      })),
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(questionFileWithExample) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 単元を選択して選択情報パネルを表示する
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-regular-present"]');
    catItem?.click();

    const infoPanel = document.getElementById("selectedUnitInfo");
    const exampleEl = infoPanel?.querySelector(".selected-unit-info-example");
    expect(exampleEl).not.toBeNull();
    const highlightEl = exampleEl?.querySelector("code.category-example-highlight");
    expect(highlightEl).not.toBeNull();
    expect(highlightEl?.textContent).toBe("play");
  });

  it("description ありのカテゴリでは単元選択時に説明文が選択情報パネルに表示される", async () => {
    setupTabDom();
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/tenses-regular-past.json"],
    };
    const questionFileWithDescription = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-regular-past",
      categoryName: "一般動詞の過去形",
      description: "規則動詞は語尾に -ed をつけて過去形を作ります。",
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve(questionFileWithDescription) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 単元一覧のインライン情報コンテナに説明文が含まれること
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-regular-past"]');
    expect(catItem?.querySelector(".category-item-right .category-item-description")).not.toBeNull();

    // 単元を選択すると選択情報パネルに説明文が表示されること
    catItem?.click();
    const infoPanel = document.getElementById("selectedUnitInfo");
    const descEl = infoPanel?.querySelector(".selected-unit-info-desc");
    expect(descEl).not.toBeNull();
    expect(descEl?.textContent).toBe("規則動詞は語尾に -ed をつけて過去形を作ります。");
  });

  it("description なしのカテゴリでは説明文要素が単元一覧に存在しない", async () => {
    setupTabDom();
    setupFetchMock(); // mockQuestionFile には description がない

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const descEl = catItem?.querySelector(".category-item-description");
    expect(descEl).toBeNull();
  });
});
