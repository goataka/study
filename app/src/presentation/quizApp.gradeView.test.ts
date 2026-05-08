/**
 * QuizApp プレゼンテーション層 — 学年フィルター/学年別ビュー/3階層カテゴリ仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { setupTabDom, setupFetchMock, setupFetchMockWith3Levels, mockQuestionFile } from "./quizApp.testHelpers";

describe("QuizApp — 3階層カテゴリ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMockWith3Levels();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("英語タブをクリックするとトップカテゴリグループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const topGroupHeaders = document.querySelectorAll(".category-top-group-header");
    expect(topGroupHeaders.length).toBe(2); // grammar, pronunciation
  });

  it("トップカテゴリの中間グループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup).not.toBeNull();
    const tensesGroup = grammarTopGroup?.querySelector('.category-group[data-parent-category="verb"]');
    expect(tensesGroup).not.toBeNull();
  });

  it("カテゴリアイテムに data-top-category が設定される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="tenses-past"]') as HTMLElement;
    expect(catItem?.dataset.topCategory).toBe("grammar");
    expect(catItem?.dataset.parentCategory).toBe("verb");
  });

  it("トップカテゴリヘッダーをクリックすると折りたたまれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>(
      '.category-top-group-header[data-top-category="grammar"]',
    );
    grammarHeader?.click();

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup?.classList.contains("collapsed")).toBe(true);
  });

  it("折りたたまれたトップカテゴリヘッダーを再クリックすると展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>(
      '.category-top-group-header[data-top-category="grammar"]',
    );
    grammarHeader?.click(); // 折りたたむ
    grammarHeader?.click(); // 展開する

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("折りたたまれたトップカテゴリにアクティブなカテゴリがある場合は自動展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammarトップグループを折りたたむ
    const grammarHeader = document.querySelector<HTMLElement>(
      '.category-top-group-header[data-top-category="grammar"]',
    );
    grammarHeader?.click();
    expect(
      document.querySelector('.category-top-group[data-top-category="grammar"]')?.classList.contains("collapsed"),
    ).toBe(true);

    // カテゴリアイテムをプログラム的にクリック
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();

    // トップグループが自動展開されること
    expect(
      document.querySelector('.category-top-group[data-top-category="grammar"]')?.classList.contains("collapsed"),
    ).toBe(false);
  });
});

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
    gradeHeader?.click();

    expect(gradeGroup?.classList.contains("collapsed")).toBe(true);
    expect(gradeHeader?.getAttribute("aria-expanded")).toBe("false");
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
