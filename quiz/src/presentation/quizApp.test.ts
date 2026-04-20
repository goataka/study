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

describe("QuizApp — URL パラメータ仕様", () => {
  beforeEach(() => {
    setupTreeDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // URLをリセット
    window.history.replaceState({}, "", window.location.pathname);
  });

  it("URL に ?subject=english が指定されている場合、英語ノードが選択される", async () => {
    // URLパラメータを設定
    window.history.replaceState({}, "", "?subject=english");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishNode = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category])'
    );
    expect(englishNode?.classList.contains("active")).toBe(true);
  });

  it("URL に ?subject=english&category=phonics-1 が指定されている場合、カテゴリノードが選択され親ノードが展開される", async () => {
    window.history.replaceState({}, "", "?subject=english&category=phonics-1");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // カテゴリノードが選択されている
    const categoryNode = document.querySelector(
      '.tree-item[data-subject="english"][data-category="phonics-1"]'
    );
    expect(categoryNode?.classList.contains("active")).toBe(true);

    // 親の英語ノードが展開されている
    const englishNode = document.querySelector(
      '.tree-item[data-subject="english"]:not([data-category])'
    );
    expect(englishNode?.classList.contains("expanded")).toBe(true);

    const englishHeader = englishNode?.querySelector(".tree-node-header");
    expect(englishHeader?.getAttribute("aria-expanded")).toBe("true");

    const children = englishNode?.querySelector(".tree-children");
    expect(children?.classList.contains("hidden")).toBe(false);
  });

  it("URL パラメータがない場合、デフォルトで「すべて」ノードが選択される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const allNode = document.querySelector('.tree-item[data-subject="all"]');
    expect(allNode?.classList.contains("active")).toBe(true);
  });

  it("URL に存在しないカテゴリが指定されている場合、subject ノードが選択される", async () => {
    window.history.replaceState({}, "", "?subject=english&category=nonexistent");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // カテゴリが存在しないので、subject ノード（英語）が選択される
    const englishNode = document.querySelector('.tree-item[data-subject="english"]:not([data-category])');
    expect(englishNode?.classList.contains("active")).toBe(true);
  });
});

