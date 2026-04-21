/**
 * QuizApp プレゼンテーション層 — 仕様テスト
 *
 * UI コントローラーとしての QuizApp の仕様を記述します。
 * DOM 操作を伴うためjsdom環境で実行します。
 * フルワークフローのE2Eテストは e2e/features/quiz.feature で管理します。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";

// ─── DOM スタブのセットアップ ────────────────────────────────────────────────

/** テストに必要な最小限のHTML要素を生成する */
function setupMinimalDom(): void {
  document.body.innerHTML = `
    <div id="startScreen" class="screen active">
      <select id="subjectFilter"><option value="all">すべての教科</option></select>
      <select id="categoryFilter"><option value="all">すべてのカテゴリ</option></select>
      <div id="statsInfo"></div>
      <button id="startRandomBtn">ランダム10問</button>
      <button id="startRetryBtn" disabled>間違えた問題</button>
    </div>
    <div id="quizScreen" class="screen">
      <div id="questionNumber"></div>
      <div id="topicName"></div>
      <div id="progressFill" style="width:0%"></div>
      <div id="questionText"></div>
      <div id="choicesContainer"></div>
      <button id="prevBtn" disabled>前へ</button>
      <button id="nextBtn">次へ</button>
      <button id="submitBtn" disabled>提出</button>
    </div>
    <div id="resultScreen" class="screen">
      <div id="resultScore"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">全問やり直す</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">トップへ戻る</button>
    </div>
  `;
}

/** ツリーUIを含むフルレイアウトのDOM */
function setupTreeDom(): void {
  document.body.innerHTML = `
    <div id="startScreen" class="screen active">
      <div class="subject-tree"></div>
      <div id="statsInfo"></div>
      <button id="startRandomBtn">ランダム10問</button>
      <button id="startRetryBtn" disabled>間違えた問題</button>
    </div>
    <div id="quizScreen" class="screen">
      <div id="questionNumber"></div>
      <div id="topicName"></div>
      <div id="progressFill" style="width:0%"></div>
      <div id="questionText"></div>
      <div id="choicesContainer"></div>
      <button id="prevBtn" disabled>前へ</button>
      <button id="nextBtn">次へ</button>
      <button id="submitBtn" disabled>提出</button>
    </div>
    <div id="resultScreen" class="screen">
      <div id="resultScore"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">全問やり直す</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">トップへ戻る</button>
    </div>
  `;
}

// ─── fetch モック（問題JSONの読み込みを回避） ─────────────────────────────

const mockManifest = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/phonics-1.json"],
};

const mockQuestionFile = {
  subject: "english",
  subjectName: "英語",
  category: "phonics-1",
  categoryName: "フォニックス（1文字）",
  questions: Array.from({ length: 5 }, (_, i) => ({
    id: `q${i + 1}`,
    question: `問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

/** parentCategory 付き問題ファイル（文法・発音の階層付き） */
const mockManifestWithParent = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/grammar.json", "english/phonics.json"],
};

const mockGrammarFile = {
  subject: "english",
  subjectName: "英語",
  category: "tenses-past",
  categoryName: "過去形",
  parentCategory: "grammar",
  parentCategoryName: "文法",
  questions: Array.from({ length: 3 }, (_, i) => ({
    id: `g${i + 1}`,
    question: `文法問題 ${i + 1}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

const mockPhonicsFile = {
  subject: "english",
  subjectName: "英語",
  category: "phonics-1",
  categoryName: "フォニックス（1文字）",
  parentCategory: "phonics",
  parentCategoryName: "発音",
  questions: Array.from({ length: 4 }, (_, i) => ({
    id: `p${i + 1}`,
    question: `発音問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

function setupFetchMock(): void {
  global.fetch = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("index.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockQuestionFile),
    } as Response);
  });
}

function setupFetchMockWithParent(): void {
  global.fetch = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("index.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifestWithParent),
      } as Response);
    }
    if (urlStr.includes("grammar.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGrammarFile),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPhonicsFile),
    } as Response);
  });
}

// ─── テスト ──────────────────────────────────────────────────────────────────

describe("QuizApp — 初期化仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("DOM が揃っていればエラーなしでインスタンス化できる", () => {
    expect(() => new QuizApp()).not.toThrow();
  });

  it("初期状態では「間違えた問題」ボタンが無効化されている", () => {
    new QuizApp();
    const retryBtn = document.getElementById("startRetryBtn") as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();
    // 初期値は disabled（問題ロード前）
    expect(retryBtn.disabled).toBe(true);
  });
});

describe("QuizApp — 問題ロード後の仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("問題のロードが完了したら statsInfo に問題数が表示される", async () => {
    new QuizApp();
    // init() は非同期なので Promiseのキューが流れるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
  });
});

describe("QuizApp — カテゴリツリー仕様", () => {
  beforeEach(() => {
    setupTreeDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("問題ロード後にツリーに教科ノード（すべて・英語・数学）が3件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const subjectNodes = document.querySelectorAll(".tree-item[data-subject]:not([data-category])");
    expect(subjectNodes.length).toBe(3);
  });

  it("問題ロード後にカテゴリノードが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // mockQuestionFile は phonics-1 のみなので1ノード
    const categoryNodes = document.querySelectorAll(".tree-item[data-category]");
    expect(categoryNodes.length).toBe(1);
  });

  it("教科ノードのヘッダーに role=button と tabindex=0 が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const headers = document.querySelectorAll(".tree-node-header");
    headers.forEach((h) => {
      expect(h.getAttribute("role")).toBe("button");
      expect(h.getAttribute("tabindex")).toBe("0");
    });
  });

  it("展開可能な教科ノードには aria-controls が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishHeader = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category]) > .tree-node-header'
    );
    expect(englishHeader?.getAttribute("aria-controls")).toBe("tree-children-english");
  });

  it("教科ノードをクリックすると statsInfo がその教科の問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishHeader = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category]) > .tree-node-header'
    ) as HTMLElement;
    englishHeader?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
  });

  it("カテゴリノードをクリックすると statsInfo がそのカテゴリの問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const catHeader = document.querySelector(
      '.tree-item[data-category="phonics-1"] > .tree-node-header'
    ) as HTMLElement;
    catHeader?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
  });

  it("教科ノードをクリックすると aria-expanded が true になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishHeader = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category]) > .tree-node-header'
    ) as HTMLElement;
    expect(englishHeader?.getAttribute("aria-expanded")).toBe("false");

    englishHeader?.click();
    expect(englishHeader?.getAttribute("aria-expanded")).toBe("true");
  });

  it("Enter キーで教科ノードを操作できる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishHeader = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category]) > .tree-node-header'
    ) as HTMLElement;
    englishHeader?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
  });

  it("Space キーで教科ノードを操作できる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishHeader = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category]) > .tree-node-header'
    ) as HTMLElement;
    englishHeader?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
  });
});

describe("QuizApp — 親カテゴリツリー仕様", () => {
  beforeEach(() => {
    setupTreeDom();
    setupFetchMockWithParent();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("親カテゴリノードが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const parentNodes = document.querySelectorAll(".parent-category-node");
    expect(parentNodes.length).toBe(2); // grammar, phonics
  });

  it("親カテゴリノードに aria-controls と aria-expanded が設定されている（子あり）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const grammarHeader = document.querySelector(
      '.parent-category-node[data-parent-category="grammar"] > .tree-node-header'
    );
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("false");
    expect(grammarHeader?.getAttribute("aria-controls")).toContain("grammar");
  });

  it("親カテゴリノードをクリックすると statsInfo がその配下全問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const grammarHeader = document.querySelector(
      '.parent-category-node[data-parent-category="grammar"] > .tree-node-header'
    ) as HTMLElement;
    grammarHeader?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全3問");
  });

  it("親カテゴリノードをクリックすると配下の子カテゴリノードが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const grammarHeader = document.querySelector(
      '.parent-category-node[data-parent-category="grammar"] > .tree-node-header'
    ) as HTMLElement;
    grammarHeader?.click();

    const grammarChildren = document.querySelector(
      '.parent-category-node[data-parent-category="grammar"] > .tree-children'
    );
    expect(grammarChildren?.classList.contains("hidden")).toBe(false);
  });

  it("親カテゴリノードをクリックすると aria-expanded が true になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const grammarHeader = document.querySelector(
      '.parent-category-node[data-parent-category="grammar"] > .tree-node-header'
    ) as HTMLElement;
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("false");
    grammarHeader?.click();
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("true");
  });
});
