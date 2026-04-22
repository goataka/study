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
      <div id="answerFeedback" class="answer-feedback hidden">
        <div id="feedbackResult" class="feedback-result"></div>
        <div id="feedbackExplanation" class="feedback-explanation"></div>
      </div>
      <button id="prevBtn" disabled>前へ</button>
      <button id="nextBtn">次へ</button>
      <button id="submitBtn" disabled>提出</button>
      <a id="guideLink" class="hidden" href="#">解説</a>
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

  it("間違えた問題が0件のときの統計表示は「0/総数」の形式である", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 間違えた問題がない状態（localStorage が空）でツリーの統計表示を確認
    const statsEls = document.querySelectorAll(".tree-node-stats");
    const nonEmptyTexts = Array.from(statsEls)
      .map((el) => el.textContent?.trim() || "")
      .filter((text) => text !== "");

    // 少なくとも1つは統計表示が描画されていること
    expect(nonEmptyTexts.length).toBeGreaterThan(0);

    nonEmptyTexts.forEach((text) => {
      expect(text).toMatch(/^0\/\d+$/);
      expect(text).not.toContain("問");
    });
  });
});

describe("QuizApp — 回答フィードバック仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** クイズを開始して問題が描画されるまで待つ */
  async function startQuiz(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    startBtn.click();
  }

  it("未回答の問題ではフィードバック領域が非表示になっている", async () => {
    await startQuiz();
    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(true);
  });

  it("回答を選択するとフィードバック領域が表示される", async () => {
    await startQuiz();
    const firstRadio = document.querySelector<HTMLInputElement>('input[name="answer"]');
    firstRadio?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(false);
  });

  it("正解を選択すると correct クラスが付与される", async () => {
    await startQuiz();
    // 正解の選択肢テキスト「ア」を持つラベル内のラジオボタンをクリックする
    // （選択肢はシャッフルされるため、テキストで特定する）
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const correctLabel = Array.from(labels).find(
      (l) => l.querySelector(".choice-text")?.textContent === "ア"
    );
    correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("correct")).toBe(true);
    expect(feedback?.classList.contains("incorrect")).toBe(false);
  });

  it("不正解を選択すると incorrect クラスが付与される", async () => {
    await startQuiz();
    // 不正解の選択肢テキスト（「ア」以外）を持つラベル内のラジオボタンをクリックする
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const wrongLabel = Array.from(labels).find(
      (l) => l.querySelector(".choice-text")?.textContent !== "ア"
    );
    wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("incorrect")).toBe(true);
    expect(feedback?.classList.contains("correct")).toBe(false);
  });

  it("回答後に次の問題へ移動するとフィードバックが非表示になる", async () => {
    await startQuiz();
    // 1問目に回答
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="answer"]');
    radios[0]?.click();

    // 次へ移動
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    nextBtn.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(true);
  });

  it("回答済みの問題に戻るとフィードバックが再表示される", async () => {
    await startQuiz();
    // 1問目に回答
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="answer"]');
    radios[0]?.click();

    // 次へ移動
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    nextBtn.click();

    // 前へ戻る
    const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
    prevBtn.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(false);
  });

  it("フィードバックのテキストはtextContentで設定されXSSリスクがない", async () => {
    // HTMLタグを含む選択肢が正解の場合でも安全に描画されることを確認する
    const xssPayload = '<img src=x onerror=alert(1)>';
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
        json: () =>
          Promise.resolve({
            ...mockQuestionFile,
            questions: mockQuestionFile.questions.map((q) => ({
              ...q,
              choices: [xssPayload, "イ", "ウ", "エ"],
              correct: 0, // xssPayload が正解
            })),
          }),
      } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // xssPayload 以外のラジオボタンをクリックして不正解フィードバックを表示させる
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const wrongLabel = Array.from(labels).find(
      (l) => l.querySelector(".choice-text")?.textContent !== xssPayload
    );
    wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const resultDiv = document.getElementById("feedbackResult");
    // textContent にはプレーンテキストとして格納される（HTMLとして解析されない）
    expect(resultDiv?.textContent).toContain(xssPayload);
    // img 要素が DOM に生成されていないことを確認
    expect(resultDiv?.querySelector("img")).toBeNull();
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

describe("QuizApp — 解説リンク仕様", () => {
  /** guideUrl ありの問題ファイル */
  const mockManifestForGuide = {
    version: "2.0.0",
    subjects: { english: { name: "英語" } },
    questionFiles: ["english/alphabet.json"],
  };

  const mockQuestionFileWithGuide = {
    subject: "english",
    subjectName: "英語",
    category: "alphabet",
    categoryName: "アルファベット",
    guideUrl: "../contents/english/pronunciation/01-alphabet/guide",
    questions: Array.from({ length: 5 }, (_, i) => ({
      id: `qa${i + 1}`,
      question: `問題 ${i + 1}`,
      choices: ["ア", "イ", "ウ", "エ"],
      correct: 0,
      explanation: `解説 ${i + 1}`,
    })),
  };

  /** guideUrl なしの問題ファイル */
  const mockQuestionFileWithoutGuide = {
    subject: "english",
    subjectName: "英語",
    category: "phonics-1",
    categoryName: "フォニックス（1文字）",
    questions: Array.from({ length: 5 }, (_, i) => ({
      id: `qp${i + 1}`,
      question: `問題 ${i + 1}`,
      choices: ["ア", "イ", "ウ", "エ"],
      correct: 0,
      explanation: `解説 ${i + 1}`,
    })),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("guideUrl ありの問題ファイルでクイズ開始すると #guideLink が表示されURLに .md が補完される", async () => {
    setupMinimalDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const guideLink = document.getElementById("guideLink") as HTMLAnchorElement;
    expect(guideLink).not.toBeNull();
    expect(guideLink.classList.contains("hidden")).toBe(false);
    expect(guideLink.href).toContain("guide.md");
  });

  it("guideUrl なしの問題ファイルでクイズ開始すると #guideLink が hidden のまま", async () => {
    setupMinimalDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithoutGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const guideLink = document.getElementById("guideLink") as HTMLAnchorElement;
    expect(guideLink).not.toBeNull();
    expect(guideLink.classList.contains("hidden")).toBe(true);
  });

  it("guideUrl にクエリパラメータが付いていても拡張子なしなら .md が補完される", async () => {
    setupMinimalDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockQuestionFileWithGuide,
            guideUrl: "../contents/english/pronunciation/01-alphabet/guide?version=1",
          }),
      } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const guideLink = document.getElementById("guideLink") as HTMLAnchorElement;
    expect(guideLink.href).toContain("guide.md");
    expect(guideLink.href).toContain("?version=1");
  });

  it("guideUrl にフラグメントが付いていても拡張子なしなら .md が補完される", async () => {
    setupMinimalDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockQuestionFileWithGuide,
            guideUrl: "../contents/english/pronunciation/01-alphabet/guide#section",
          }),
      } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const guideLink = document.getElementById("guideLink") as HTMLAnchorElement;
    expect(guideLink.href).toContain("guide.md");
    expect(guideLink.href).toContain("#section");
  });
});
