/**
 * QuizApp — 学年フィルター仕様 (#494)
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

describe("QuizApp — 学年フィルター仕様 (#494)", () => {
  beforeEach(() => {
    setupTabDom();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("複数の学年が存在する場合、学年フィルターボタンが表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json", "math/middle.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const middleFile = {
      subject: "math",
      subjectName: "数学",
      category: "algebra",
      categoryName: "代数",
      referenceGrade: "中学1年",
      questions: [{ id: "m1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    const filterBtns = document.querySelectorAll(".grade-filter-btn");
    expect(filterBtns.length).toBeGreaterThan(0);
  });

  it("学年フィルターで「小学」を選ぶと小学カテゴリのみ表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json", "math/middle.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const middleFile = {
      subject: "math",
      subjectName: "数学",
      category: "algebra",
      categoryName: "代数",
      referenceGrade: "中学1年",
      questions: [{ id: "m1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    // 「小学」フィルターボタンをクリック
    const filterBtns = document.querySelectorAll<HTMLElement>(".grade-filter-btn");
    const elemBtn = Array.from(filterBtns).find((b) => b.textContent === "小学");
    elemBtn?.click();

    // 小学カテゴリは表示される
    const additionItem = document.querySelector('.category-item[data-category="addition"]');
    expect(additionItem).not.toBeNull();

    // 中学カテゴリは表示されない
    const algebraItem = document.querySelector('.category-item[data-category="algebra"]');
    expect(algebraItem).toBeNull();
  });

  it("学年フィルターで「すべて」を選ぶとすべてのカテゴリが表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json", "math/middle.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const middleFile = {
      subject: "math",
      subjectName: "数学",
      category: "algebra",
      categoryName: "代数",
      referenceGrade: "中学1年",
      questions: [{ id: "m1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    // 「小学」を選んでからリセット
    const filterBtns = document.querySelectorAll<HTMLElement>(".grade-filter-btn");
    const elemBtn = Array.from(filterBtns).find((b) => b.textContent === "小学");
    elemBtn?.click();

    // 「すべて」ボタンをクリック
    const allBtn = Array.from(document.querySelectorAll<HTMLElement>(".grade-filter-btn")).find(
      (b) => b.textContent === "すべて",
    );
    allBtn?.click();

    // 両方のカテゴリが表示される
    expect(document.querySelector('.category-item[data-category="addition"]')).not.toBeNull();
    expect(document.querySelector('.category-item[data-category="algebra"]')).not.toBeNull();
  });
});
