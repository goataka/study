/**
 * QuizApp — 学年別ビューモード仕様 (#495)
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

describe("QuizApp — 学年別ビューモード仕様 (#495)", () => {
  beforeEach(() => {
    setupTabDom();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ビューモード切替ボタンが表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    const toggleBtn = document.querySelector(".category-view-toggle");
    expect(toggleBtn).not.toBeNull();
  });

  it("ビューモード切替ボタンをクリックすると学年別ビューに切り替わる", async () => {
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

    // 学年別ビューに切り替え
    const toggleBtn = document.querySelector<HTMLElement>(".category-view-toggle");
    toggleBtn?.click();

    // 学年グループが表示される
    const gradeGroups = document.querySelectorAll(".category-grade-group");
    expect(gradeGroups.length).toBeGreaterThan(0);

    // 各カテゴリが学年グループ内にある
    const additionItem = document.querySelector('.category-item[data-category="addition"]');
    expect(additionItem).not.toBeNull();
    expect(additionItem?.closest(".category-grade-group")).not.toBeNull();
  });

  it("学年別ビューで学年グループヘッダーをクリックすると折りたたまれる", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    const toggleBtn = document.querySelector<HTMLElement>(".category-view-toggle");
    toggleBtn?.click();

    const gradeGroup = document.querySelector<HTMLElement>('.category-grade-group[data-grade="小学1年"]');
    expect(gradeGroup).not.toBeNull();

    const gradeHeader = gradeGroup?.querySelector<HTMLElement>(".category-grade-group-header");
    const gradeToggle = gradeHeader?.querySelector<HTMLElement>(".category-grade-group-toggle");
    gradeToggle?.click();

    expect(gradeGroup?.classList.contains("collapsed")).toBe(true);
    expect(gradeToggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("学年別ビューで学年グループヘッダーをクリックすると学年詳細が表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    (document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement | null)?.click();
    document.querySelector<HTMLElement>(".category-view-toggle")?.click();

    document.querySelector<HTMLElement>('.category-grade-group-header[data-grade="小学1年"]')?.click();

    expect(document.querySelector(".selected-unit-info-name")?.textContent).toContain("小学1年");
    expect(document.getElementById("selectedUnitInfo")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("panelTab-guide")?.classList.contains("active")).toBe(true);
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("panelTab-history")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("panelTab-questions")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("guidePanelFrame")?.textContent).toContain("小学1年");
  });

  it("学年別ビューの学年グループヘッダーに解説ボタンは表示されない", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" } },
      questionFiles: ["math/elem.json"],
    };
    const elemFile = {
      subject: "math",
      subjectName: "数学",
      category: "addition",
      categoryName: "たし算",
      referenceGrade: "小学1年",
      description: "たし算の基礎",
      example: "`1 + 1 = 2`",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();
    document.querySelector<HTMLElement>(".category-view-toggle")?.click();

    const gradeHeader = document.querySelector<HTMLElement>('.category-grade-group-header[data-grade="小学1年"]');
    const guideBtn = gradeHeader?.querySelector(".category-group-guide-btn");
    expect(guideBtn).toBeNull();
  });

  it("教科を切り替えると学年フィルターが前の教科の値にリセットされる", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { math: { name: "数学" }, english: { name: "英語" } },
      questionFiles: ["math/elem.json", "math/middle.json", "english/basic.json"],
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
    const englishBasicFile = {
      subject: "english",
      subjectName: "英語",
      category: "basic",
      categoryName: "基礎",
      // referenceGrade なし
      questions: [{ id: "b1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      if (u.includes("middle.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(englishBasicFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 数学タブで「小学」フィルターを適用
    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();
    const elemBtn = Array.from(document.querySelectorAll<HTMLElement>(".grade-filter-btn")).find(
      (b) => b.textContent === "小学",
    );
    elemBtn?.click();

    // 中学カテゴリが非表示になっていること
    expect(document.querySelector('.category-item[data-category="algebra"]')).toBeNull();

    // 英語タブに切り替え（学年情報なし）
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 英語のカテゴリが表示されていること（フィルターがリセットされている）
    expect(document.querySelector('.category-item[data-category="basic"]')).not.toBeNull();
  });
});
