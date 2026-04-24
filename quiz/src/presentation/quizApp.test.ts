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
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習クイズ</h1>
    <span id="headerUserName"></span>
    <div id="startScreen" class="screen active">
      <select id="subjectFilter"><option value="all">すべての教科</option></select>
      <select id="categoryFilter"><option value="all">すべてのカテゴリ</option></select>
      <div id="statsInfo"></div>
      <input type="radio" name="questionCount" value="5">
      <input type="radio" name="questionCount" value="10" checked>
      <input type="radio" name="questionCount" value="20">
      <button id="startRandomBtn">ランダム</button>
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
    </div>
    <div id="resultScreen" class="screen">
      <div id="resultScore"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">もう一度</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">スタート画面に戻る</button>
    </div>
  `;
}

/** タブUIを含むフルレイアウトのDOM */
function setupTabDom(): void {
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習クイズ</h1>
    <span id="headerUserName"></span>
    <div id="startScreen" class="screen active">
      <div class="subject-tabs" role="tablist"></div>
      <div id="subjectContent">
        <button id="hideLearnedBtn" aria-pressed="false">✅ 学習済を非表示</button>
        <div id="categoryList" class="category-list"></div>
        <div class="panel-tabs" role="tablist">
          <button class="panel-tab active" id="panelTab-quiz" data-panel="quiz" role="tab" type="button" aria-selected="true" aria-controls="quizModePanel" tabindex="0">クイズモード選択</button>
          <button class="panel-tab" id="panelTab-guide" data-panel="guide" role="tab" type="button" aria-selected="false" aria-controls="guideContent" tabindex="-1">📖 解説</button>
          <button class="panel-tab" id="panelTab-history" data-panel="history" role="tab" type="button" aria-selected="false" aria-controls="historyContent" tabindex="-1">📊 実行記録</button>
          <button class="panel-tab" id="panelTab-questions" data-panel="questions" role="tab" type="button" aria-selected="false" aria-controls="questionListContent" tabindex="-1">📋 問題一覧</button>
        </div>
        <div id="quizModePanel" role="tabpanel" aria-labelledby="panelTab-quiz">
          <div id="statsInfo"></div>
          <input type="radio" name="questionCount" value="5">
          <input type="radio" name="questionCount" value="10" checked>
          <input type="radio" name="questionCount" value="20">
          <button id="startRandomBtn">ランダム</button>
          <button id="startRetryBtn" disabled>間違えた問題</button>
          <button id="markLearnedBtn" disabled>学習済みにする</button>
        </div>
        <div id="guideContent" class="hidden" role="tabpanel" aria-labelledby="panelTab-guide">
          <iframe id="guidePanelFrame" title="解説"></iframe>
          <p id="guideNoContent" class="hidden">このカテゴリには解説がありません。</p>
        </div>
        <div id="historyContent" class="hidden" role="tabpanel" aria-labelledby="panelTab-history">
          <div id="historyList"></div>
        </div>
        <div id="questionListContent" class="hidden" role="tabpanel" aria-labelledby="panelTab-questions">
          <div id="questionListBody"></div>
        </div>
      </div>
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
      <button id="retryAllBtn">もう一度</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">スタート画面に戻る</button>
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

describe("QuizApp — 教科タブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("問題ロード後にタブに教科（英語・数学・国語）が3件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    expect(tabs.length).toBe(3);
  });

  it("問題ロード後に英語タブに role=tab が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab");
    tabs.forEach((tab) => {
      expect(tab.getAttribute("role")).toBe("tab");
    });
  });

  it("初期状態では「英語」タブがアクティブになっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]');
    expect(englishTab?.classList.contains("active")).toBe(true);
    expect(englishTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("英語タブをクリックすると statsInfo が英語の問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
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

    const catItem = document.querySelector(
      '.category-item[data-category="phonics-1"]'
    ) as HTMLElement;
    catItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全5問");
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

  it("間違えた問題が0件のときのタブ統計表示は「0/総数」の形式である", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statsEls = document.querySelectorAll(".tab-stats");
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

describe("QuizApp — 親カテゴリタブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMockWithParent();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("英語タブをクリックすると親カテゴリのグループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const groupHeaders = document.querySelectorAll(".category-group-header");
    expect(groupHeaders.length).toBe(2); // grammar, phonics
  });

  it("英語タブをクリックすると子カテゴリアイテムが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar の tenses-past + phonics の phonics-1
    const catItems = document.querySelectorAll(".category-item[data-category]");
    expect(catItems.length).toBeGreaterThanOrEqual(2);
  });

  it("文法カテゴリアイテムをクリックすると statsInfo がその配下全問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarCatItem = document.querySelector(
      '.category-item[data-category="tenses-past"]'
    ) as HTMLElement;
    grammarCatItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全3問");
  });
});

describe("QuizApp — 解説パネルタブ仕様", () => {
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
    guideUrl: "../english/pronunciation/01-alphabet/guide",
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

  it("解説パネルタブが学習タブと実行記録タブの間に存在する", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = Array.from(document.querySelectorAll(".panel-tab"));
    const quizIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "quiz");
    const guideIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "guide");
    const historyIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "history");
    expect(guideIdx).toBeGreaterThan(quizIdx);
    expect(guideIdx).toBeLessThan(historyIdx);
  });

  it("guideUrl ありのカテゴリで解説タブをクリックすると iframe に URL が設定される", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]') as HTMLElement;
    guideTab?.click();

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLIFrameElement;
    expect(guideFrame).not.toBeNull();
    expect(guideFrame.src).toContain("guide");
    expect(guideFrame.classList.contains("hidden")).toBe(false);

    const noContent = document.getElementById("guideNoContent");
    expect(noContent?.classList.contains("hidden")).toBe(true);
  });

  it("guideUrl なしのカテゴリで解説タブをクリックすると「解説なし」メッセージが表示される", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithoutGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]') as HTMLElement;
    guideTab?.click();

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLIFrameElement;
    expect(guideFrame.classList.contains("hidden")).toBe(true);

    const noContent = document.getElementById("guideNoContent");
    expect(noContent?.classList.contains("hidden")).toBe(false);
  });

  it("クイズ画面に #guideLink が存在しない", async () => {
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

    const guideLink = document.getElementById("guideLink");
    expect(guideLink).toBeNull();
  });
});

describe("QuizApp — パネルインナータブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("パネルに「クイズモード選択」と「解説」と「実行記録」と「問題一覧」のインナータブが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]');
    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]');
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]');
    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]');
    expect(quizTab).not.toBeNull();
    expect(guideTab).not.toBeNull();
    expect(guideTab?.textContent).toContain("解説");
    expect(historyTab).not.toBeNull();
    expect(historyTab?.textContent).toContain("実行記録");
    expect(questionsTab).not.toBeNull();
    expect(questionsTab?.textContent).toContain("問題一覧");
  });

  it("「実行記録」インナータブをクリックするとhistoryContentが表示されquizModePanelが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    expect(historyTab?.classList.contains("active")).toBe(true);
    expect(historyTab?.getAttribute("aria-selected")).toBe("true");

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(false);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);

    // subjectContentは常に表示される
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("hidden")).toBe(false);
  });

  it("履歴がないとき「実行記録」タブをクリックすると空メッセージが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const historyList = document.getElementById("historyList");
    expect(historyList?.querySelector(".history-empty")).not.toBeNull();
  });

  it("「クイズモード選択」インナータブをクリックするとquizModePanelが再び表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 実行記録タブを開く
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    // クイズモード選択タブに戻る
    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]') as HTMLElement;
    quizTab?.click();

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(false);

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(true);
  });

  it("教科タブを選択すると選択した教科の記録のみ表示される", async () => {
    // 英語と数学の両方の記録をlocalStorageに追加
    const records = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "math",
        subjectName: "数学",
        category: "all",
        categoryName: "数学 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 4,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリック（デフォルトで英語が選択されているが明示的にクリック）
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // 英語の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("数学タブを選択すると数学の記録のみ表示される", async () => {
    // 英語と数学の両方の記録をlocalStorageに追加
    const records = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "math",
        subjectName: "数学",
        category: "all",
        categoryName: "数学 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 4,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 数学タブをクリック
    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // 数学の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("単元を選択するとその単元の記録のみ表示される", async () => {
    // 同じ教科で異なる単元の記録を用意
    const records = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス（1文字）",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 10,
        correctCount: 7,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // phonics-1 カテゴリアイテムをクリック（renderCategoryList で生成される）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // phonics-1 の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("単元選択後に実行記録タブを開いてもその単元の記録のみ表示される", async () => {
    // 同じ教科で異なる単元の記録を用意
    const records = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス（1文字）",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 10,
        correctCount: 7,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // phonics-1 カテゴリアイテムをクリック
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    // 実行記録タブをクリック
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // phonics-1 の記録のみ表示される
    expect(items?.length).toBe(1);
  });
});

describe("QuizApp — 履歴モード表示仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const buildRecord = (mode: string) => ({
    id: "r1",
    date: new Date().toISOString(),
    subject: "english",
    subjectName: "英語",
    category: "phonics-1",
    categoryName: "フォニックス（1文字）",
    mode,
    totalCount: 5,
    correctCount: 5,
    entries: [],
  });

  it("mode=random の履歴は「本番」と表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("random")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl?.textContent).toBe("本番");
  });

  it("mode=practice の履歴は「練習」と表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("practice")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl?.textContent).toBe("練習");
  });

  it("mode=retry の履歴は「復習」と表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("retry")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl?.textContent).toBe("復習");
  });

  it("mode=manual の履歴は「手動」と表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modeEl = document.querySelector(".history-mode");
    expect(modeEl?.textContent).toBe("手動");
  });
});

describe("QuizApp — 学習済カテゴリ非表示トグル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態ではcategoryListにhide-learnedクラスが付与されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("hide-learned")).toBe(true);
  });

  it("初期状態ではaria-pressedがtrueである", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn");
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("「学習済を非表示」ボタンをクリックするとcategoryListからhide-learnedクラスが解除される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("hide-learned")).toBe(false);
  });

  it("「学習済を非表示」ボタンを2回クリックするとhide-learnedクラスが再付与される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();
    btn?.click();

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("hide-learned")).toBe(true);
  });

  it("ボタンクリック後はaria-pressedがfalseになる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();

    expect(btn?.getAttribute("aria-pressed")).toBe("false");
  });

  it("2回クリック後はaria-pressedがtrueに戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();
    btn?.click();

    expect(btn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("学習済カテゴリ（履歴あり・間違いなし）にはlearnedクラスが付与される", async () => {
    // 履歴に phonics-1 を登録（学習済）
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [],
        },
      ])
    );
    // 間違いなし
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.classList.contains("learned")).toBe(true);
  });

  it("学習中（履歴あり・間違いあり）のカテゴリにはlearnedクラスが付与されない", async () => {
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 3,
          entries: [],
        },
      ])
    );
    localStorage.setItem("wrongQuestions", JSON.stringify(["q1"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.classList.contains("learned")).toBe(false);
  });

  it("hide-learned ON かつ learned クラスあり — 両クラスが同時に成立する（非表示の前提条件を満たす）", async () => {
    // 履歴に phonics-1 を登録（学習済）
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [],
        },
      ])
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブを選択してカテゴリを表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const categoryList = document.getElementById("categoryList");
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');

    // 両クラスが同時に成立していること（CSSによる非表示の前提）
    expect(categoryList?.classList.contains("hide-learned")).toBe(true);
    expect(catItem?.classList.contains("learned")).toBe(true);
  });
});

describe("QuizApp — カテゴリ学習状態絵文字仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態（未学習）では ⬜ が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("⬜");
  });

  it("学習済（履歴あり・間違いなし）のカテゴリは ✅ が表示される", async () => {
    // 履歴に phonics-1 を登録（学習済）
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [],
        },
      ])
    );
    // 間違いなし
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("学習中（履歴あり・間違いあり）のカテゴリは 📖 が表示される", async () => {
    // 履歴に phonics-1 を登録
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 3,
          entries: [],
        },
      ])
    );
    // 間違いあり（phonics-1 の問題IDを登録）
    localStorage.setItem("wrongQuestions", JSON.stringify(["q1"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("📖");
  });
});

describe("QuizApp — 学習済みにするボタン仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時に最初の未学習カテゴリが自動選択され「学習済みにする」ボタンが有効になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(false);
  });

  it("特定カテゴリを選択すると「学習済みにする」ボタンが有効になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(false);
  });

  it("「学習済みにする」ボタンをクリックするとカテゴリが ✅ になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();

    // 学習済みになるので ✅ が表示される
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("学習済みのカテゴリを選択するとボタンが「↩ 未学習に戻す」になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();
    // 学習済みになったのでボタンが「未学習に戻す」に変わる
    expect(markLearnedBtn.textContent).toBe("↩ 未学習に戻す");
  });

  it("「↩ 未学習に戻す」ボタンをクリックするとカテゴリが 📖 に戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    // 学習済みにする
    markLearnedBtn.click();
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("✅");

    // 未学習に戻す
    markLearnedBtn.click();
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("📖");
    expect(markLearnedBtn.textContent).toBe("✅ 学習済みにする");
  });
});

describe("QuizApp — 問題一覧タブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("「問題一覧」タブをクリックするとquestionListContentが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    expect(questionsTab?.classList.contains("active")).toBe(true);
    expect(questionsTab?.getAttribute("aria-selected")).toBe("true");
    expect(questionsTab?.getAttribute("tabindex")).toBe("0");

    const questionListContent = document.getElementById("questionListContent");
    expect(questionListContent?.classList.contains("hidden")).toBe(false);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(true);
  });

  it("「問題一覧」タブをクリックすると現在の単元の問題が一覧表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const items = document.querySelectorAll(".question-list-item");
    expect(items.length).toBe(5); // mockQuestionFile に5問あるため
  });

  it("問題一覧には問題・正解・ヒントが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const correctEls = document.querySelectorAll(".question-list-correct");
    expect(correctEls.length).toBe(5); // 5問それぞれに正解が1つある

    const hintEls = document.querySelectorAll(".question-list-hint");
    expect(hintEls.length).toBe(5); // 5問それぞれにヒントが1つある
  });

  it("問題一覧に第N問の表記がない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const numberEls = document.querySelectorAll(".question-list-number");
    expect(numberEls.length).toBe(0); // 第N問の要素が存在しないこと
  });

  it("問題一覧の問題と正解が同じ行（question-list-row）に表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const rows = document.querySelectorAll(".question-list-row");
    expect(rows.length).toBe(5); // 5問それぞれに1行ある

    rows.forEach((row) => {
      expect(row.querySelector(".question-list-text")).not.toBeNull();
      expect(row.querySelector(".question-list-correct")).not.toBeNull();
      expect(row.querySelector(".question-list-hint-btn")).not.toBeNull();
    });
  });

  it("ヒントはデフォルトで非表示で、💡ボタンを押すと表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const firstHint = document.querySelector(".question-list-hint") as HTMLElement;
    expect(firstHint.classList.contains("hidden")).toBe(true); // 初期状態では非表示

    const firstHintBtn = document.querySelector(".question-list-hint-btn") as HTMLElement;
    firstHintBtn.click();
    expect(firstHint.classList.contains("hidden")).toBe(false); // ボタン押下で表示

    firstHintBtn.click();
    expect(firstHint.classList.contains("hidden")).toBe(true); // もう一度押すと非表示に戻る
  });

  it("「クイズモード選択」タブに戻るとquizModePanelが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]') as HTMLElement;
    quizTab?.click();

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(false);

    const questionListContent = document.getElementById("questionListContent");
    expect(questionListContent?.classList.contains("hidden")).toBe(true);
  });
});

describe("QuizApp — 結果画面の全問正解表示仕様", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習クイズ</h1>
      <span id="headerUserName"></span>
      <div id="startScreen" class="screen active">
        <div id="statsInfo"></div>
        <input type="radio" name="questionCount" value="5">
        <input type="radio" name="questionCount" value="10" checked>
        <input type="radio" name="questionCount" value="20">
        <button id="startRandomBtn">ランダム</button>
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
      </div>
      <div id="resultScreen" class="screen">
        <div id="scoreDisplay"></div>
        <div id="resultDetails"></div>
        <button id="retryAllBtn">もう一度</button>
        <button id="retryWrongBtn">間違えた問題</button>
        <button id="backToStartBtn">スタート画面に戻る</button>
      </div>
    `;
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** クイズを開始して全問に正解し採点する */
  async function completeQuizWithAllCorrect(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // 全問（最大5問）に正解する
    for (let i = 0; i < 5; i++) {
      // 正解の選択肢「ア」を持つラベルをクリック
      const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
      const correctLabel = Array.from(labels).find(
        (l) => l.querySelector(".choice-text")?.textContent === "ア"
      );
      correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

      const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
      const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
      if (!submitBtn.classList.contains("hidden") && !submitBtn.disabled) {
        submitBtn.click();
        break;
      } else if (!nextBtn.classList.contains("hidden") && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }

  /** クイズを開始して全問に不正解し採点する */
  async function completeQuizWithAllWrong(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    for (let i = 0; i < 5; i++) {
      // 不正解の選択肢（「ア」以外）をクリック
      const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
      const wrongLabel = Array.from(labels).find(
        (l) => l.querySelector(".choice-text")?.textContent !== "ア"
      );
      wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

      const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
      const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
      if (!submitBtn.classList.contains("hidden") && !submitBtn.disabled) {
        submitBtn.click();
        break;
      } else if (!nextBtn.classList.contains("hidden") && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }

  it("全問正解時にスコアサークルに perfect クラスが付与される", async () => {
    await completeQuizWithAllCorrect();

    const scoreCircle = document.querySelector(".score-circle");
    expect(scoreCircle?.classList.contains("perfect")).toBe(true);
  });

  it("全問正解時に ✅ アイコン要素が表示される", async () => {
    await completeQuizWithAllCorrect();

    const perfectIcon = document.querySelector(".score-perfect-icon");
    expect(perfectIcon).not.toBeNull();
    expect(perfectIcon?.textContent).toBe("✅");
  });

  it("全問正解時に pass クラスは付与されない", async () => {
    await completeQuizWithAllCorrect();

    const scoreCircle = document.querySelector(".score-circle");
    expect(scoreCircle?.classList.contains("pass")).toBe(false);
  });

  it("全問不正解時には perfect クラスが付与されない", async () => {
    await completeQuizWithAllWrong();

    const scoreCircle = document.querySelector(".score-circle");
    expect(scoreCircle?.classList.contains("perfect")).toBe(false);
    expect(document.querySelector(".score-perfect-icon")).toBeNull();
  });
});

describe("QuizApp — カテゴリ進捗バー仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("カテゴリアイテムには .category-progress-bar が含まれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.querySelector(".category-progress-bar")).not.toBeNull();
    expect(catItem?.querySelector(".category-progress-fill")).not.toBeNull();
  });

  it("未学習カテゴリの進捗バーは 0% の幅になっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    expect(fill?.style.width).toBe("0%");
  });

  it("学習済（間違いなし）カテゴリの進捗バーは 100% になり progress-fill-done クラスが付く", async () => {
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [],
        },
      ])
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    expect(fill?.style.width).toBe("100%");
    expect(fill?.classList.contains("progress-fill-done")).toBe(true);
  });
});

describe("QuizApp — カテゴリ解説リンク仕様", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("guideUrl なしのカテゴリでは解説リンクが hidden のまま", async () => {
    setupTabDom();
    setupFetchMock(); // mockQuestionFile には guideUrl がない
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const guideLink = catItem?.querySelector(".category-guide-link") as HTMLElement | null;
    expect(guideLink?.classList.contains("hidden")).toBe(true);
  });

  it("guideUrl ありのカテゴリでは解説リンクが表示され href が設定される", async () => {
    setupTabDom();
    const guideManifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/phonics-1.json"],
    };
    const questionFileWithGuide = {
      subject: "english",
      subjectName: "英語",
      category: "phonics-1",
      categoryName: "フォニックス（1文字）",
      guideUrl: "../english/pronunciation/03-phonics-1letter/guide",
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
        return Promise.resolve({ ok: true, json: () => Promise.resolve(guideManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(questionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const guideLink = catItem?.querySelector(".category-guide-link") as HTMLAnchorElement | null;
    expect(guideLink?.classList.contains("hidden")).toBe(false);
    expect(guideLink?.href).toContain("guide");
  });
});

describe("QuizApp — クイズパネル表示制御仕様", () => {
  beforeEach(() => {
    // quiz-panel クラスを含む DOM を追加
    document.body.innerHTML = `
      <div id="startScreen" class="screen active">
        <div class="subject-tabs" role="tablist"></div>
        <div class="start-content-layout" id="subjectContent">
          <div class="category-panel">
            <button id="hideLearnedBtn" aria-pressed="false">✅ 学習済を非表示</button>
            <div id="categoryList" class="category-list"></div>
          </div>
          <div class="quiz-panel">
            <div class="panel-tabs" role="tablist">
              <button class="panel-tab active" id="panelTab-quiz" data-panel="quiz" role="tab" type="button" aria-selected="true" tabindex="0">学習</button>
              <button class="panel-tab" id="panelTab-history" data-panel="history" role="tab" type="button" aria-selected="false" tabindex="-1">📊 実行記録</button>
              <button class="panel-tab" id="panelTab-questions" data-panel="questions" role="tab" type="button" aria-selected="false" tabindex="-1">📋 問題一覧</button>
            </div>
            <div id="quizModePanel" role="tabpanel">
              <button id="startPracticeBtn">練習</button>
              <button id="startRandomBtn">ランダム</button>
              <button id="startRetryBtn" disabled>間違えた問題</button>
              <button id="markLearnedBtn" disabled>学習済みにする</button>
              <div id="statsInfo">読み込み中...</div>
            </div>
            <div id="historyContent" class="hidden" role="tabpanel">
              <div id="historyList" class="history-list"></div>
            </div>
            <div id="questionListContent" class="hidden" role="tabpanel">
              <div id="questionListBody"></div>
            </div>
          </div>
        </div>
      </div>
      <div id="quizScreen" class="screen hidden">
        <div id="questionNumber"></div>
        <div id="topicName"></div>
        <div id="progressFill" style="width:0%"></div>
        <div id="questionText"></div>
        <div id="choicesContainer"></div>
        <div id="answerFeedback" class="hidden"></div>
        <button id="prevBtn" disabled>前へ</button>
        <button id="nextBtn">次へ</button>
        <button id="submitBtn" disabled>提出</button>
      </div>
      <div id="resultScreen" class="screen hidden">
        <div id="scoreDisplay"></div>
        <div id="resultDetails"></div>
        <button id="retryAllBtn">もう一度</button>
        <button id="retryWrongBtn">間違えた問題</button>
        <button id="backToStartBtn">スタート画面に戻る</button>
      </div>
    `;
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化後は特定カテゴリが選択され category-only クラスが付かない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // selectFirstUnlearnedCategory が実行されてカテゴリが選択されるため
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(false);
  });

  it("教科タブをクリックすると category-only クラスが付く（カテゴリ未選択状態）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("カテゴリアイテムをクリックすると category-only クラスが除去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 教科タブをクリックしてカテゴリ未選択状態にする
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // カテゴリアイテムをクリック
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(false);
  });
});
