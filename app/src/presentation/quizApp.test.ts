/**
 * QuizApp プレゼンテーション層 — 仕様テスト
 *
 * UI コントローラーとしての QuizApp の仕様を記述します。
 * DOM 操作を伴うためjsdom環境で実行します。
 * フルワークフローのE2Eテストは e2e/features/quiz.feature で管理します。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";

// KanjiCanvas グローバルのモック（jsdom環境では kanji-canvas.min.js がロードされないため）
const kanjiCanvasMock = {
  init: vi.fn(),
  erase: vi.fn(),
  deleteLast: vi.fn(),
  recognize: vi.fn().mockReturnValue(""),
  strokeColors: ["#bf0000", "#bf5600"],
};
(globalThis as unknown as Record<string, unknown>).KanjiCanvas = kanjiCanvasMock;

// ─── DOM スタブのセットアップ ────────────────────────────────────────────────

/** テストに必要な最小限のHTML要素を生成する */
function setupMinimalDom(): void {
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
    <div id="fontSizeBtns" class="font-size-btns" role="group" aria-label="文字サイズ">
      <button class="font-size-btn active" data-size="small" aria-pressed="true">小</button>
      <button class="font-size-btn" data-size="medium" aria-pressed="false">中</button>
      <button class="font-size-btn" data-size="large" aria-pressed="false">大</button>
    </div>
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
    <div id="confirmDialog" class="confirm-dialog-overlay hidden">
      <div class="confirm-dialog">
        <p id="confirmDialogMessage"></p>
        <div class="confirm-dialog-buttons">
          <button id="confirmDialogOk">OK</button>
          <button id="confirmDialogCancel">キャンセル</button>
        </div>
      </div>
    </div>
  `;
}

/** タブUIを含むフルレイアウトのDOM */
function setupTabDom(): void {
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
    <div id="fontSizeBtns" class="font-size-btns" role="group" aria-label="文字サイズ">
      <button class="font-size-btn active" data-size="small" aria-pressed="true">小</button>
      <button class="font-size-btn" data-size="medium" aria-pressed="false">中</button>
      <button class="font-size-btn" data-size="large" aria-pressed="false">大</button>
    </div>
    <span id="headerUserName"></span>
    <div id="startScreen" class="screen active">
      <div class="subject-tabs" role="tablist"></div>
      <div id="subjectContent">
        <button id="hideLearnedBtn" aria-pressed="false">✅ 学習済を非表示</button>
        <span id="allSubjectPanelTitle" class="hidden">📌 おすすめ単元</span>
        <div id="overallDateNav" class="hidden">
          <input type="date" id="activityDatePicker" aria-label="日付を選択">
          <button id="prevDateBtn" type="button" aria-label="前の日へ">←</button>
          <button id="nextDateBtn" type="button" aria-label="次の日へ">→</button>
        </div>
        <div id="categoryControls" class="category-controls"></div>
        <div id="categoryList" class="category-list"></div>
        <div id="selectedUnitInfo" class="selected-unit-info hidden"></div>
        <div class="panel-tabs" role="tablist">
          <button class="panel-tab" id="panelTab-guide" data-panel="guide" role="tab" type="button" aria-selected="false" aria-controls="guideContent" tabindex="-1">📖 解説</button>
          <button class="panel-tab" id="panelTab-questions" data-panel="questions" role="tab" type="button" aria-selected="false" aria-controls="questionListContent" tabindex="-1">📋 問題</button>
          <button class="panel-tab active" id="panelTab-quiz" data-panel="quiz" role="tab" type="button" aria-selected="true" aria-controls="quizModePanel" tabindex="0">✅ 確認</button>
          <button class="panel-tab" id="panelTab-history" data-panel="history" role="tab" type="button" aria-selected="false" aria-controls="historyContent" tabindex="-1">📊 履歴</button>
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
        <div id="overallSummaryPanel" class="hidden">
          <div class="overall-panel-tabs" role="tablist">
            <button class="panel-tab active" id="overallTab-learned" data-overall-panel="learned" role="tab" type="button" aria-selected="true">🎓 学習済み</button>
          </div>
          <div id="overallLearnedPanel" class="overall-activity-panel">
            <div id="shareSummaryText"></div>
            <div class="share-actions-row">
              <button id="copySummaryBtn" type="button">📋 コピー</button>
              <button id="openShareUrlBtn" class="hidden" type="button">📤 共有</button>
              <div class="share-url-inline">
                <button id="shareUrlDisplayBtn" type="button">URLを設定</button>
                <div id="shareUrlEditArea" class="hidden">
                  <input type="url" id="shareUrlInput">
                  <button id="saveShareUrlBtn" type="button" aria-label="保存">✓</button>
                </div>
              </div>
            </div>
            <div id="todayActivityContent"></div>
          </div>
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

/** 3階層構造のモックデータ（トップカテゴリ付き） */
const mockManifestWith3Levels = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/tenses.json", "english/assimilation.json"],
};

const mockTensesFile = {
  subject: "english",
  subjectName: "英語",
  category: "tenses-past",
  categoryName: "過去形",
  topCategory: "grammar",
  topCategoryName: "文法",
  parentCategory: "verb",
  parentCategoryName: "動詞",
  questions: Array.from({ length: 3 }, (_, i) => ({
    id: `t${i + 1}`,
    question: `時制問題 ${i + 1}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

const mockAssimilationFile = {
  subject: "english",
  subjectName: "英語",
  category: "assimilation",
  categoryName: "アシミレーション",
  topCategory: "pronunciation",
  topCategoryName: "発音",
  parentCategory: "sound-changes",
  parentCategoryName: "音声変化",
  questions: Array.from({ length: 4 }, (_, i) => ({
    id: `a${i + 1}`,
    question: `音声変化問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

function setupFetchMockWith3Levels(): void {
  global.fetch = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("index.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifestWith3Levels),
      } as Response);
    }
    if (urlStr.includes("tenses.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTensesFile),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockAssimilationFile),
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

  it("問題ロード後にタブに教科（総合・英語・数学・国語）が4件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    expect(tabs.length).toBe(4);
  });

  it("問題ロード後に英語タブに role=tab が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab");
    tabs.forEach((tab) => {
      expect(tab.getAttribute("role")).toBe("tab");
    });
  });

  it("初期状態では「総合」タブがアクティブになっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const allTab = document.querySelector('.subject-tab[data-subject="all"]');
    expect(allTab?.classList.contains("active")).toBe(true);
    expect(allTab?.getAttribute("aria-selected")).toBe("true");
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

  it("教科タブに .tab-stats 要素が描画されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab");
    tabs.forEach((tab) => {
      expect(tab.querySelector(".tab-stats")).toBeNull();
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

  it("グループヘッダーをクリックするとグループが折りたたまれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);
  });

  it("折りたたまれたグループヘッダーを再度クリックすると展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click(); // 折りたたむ
    grammarHeader?.click(); // 展開する

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("グループヘッダーに aria-expanded 属性が設定される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("true");

    grammarHeader?.click();
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("false");
  });

  it("折りたたまれたグループに属するカテゴリを選択するとグループが自動展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar グループを折りたたむ
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();
    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);

    // ここではユーザーの可視要素への操作を再現するのではなく、
    // selectFirstUnlearnedCategory 相当の「プログラム的なカテゴリ選択」を模擬する。
    // そのため、折りたたまれたグループ内の category-item に対して
    // click ハンドラーを直接発火させ、自動展開されることを確認する。
    const grammarCatItem = grammarGroup?.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    grammarCatItem?.click();

    // グループが自動展開されていること
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("解説マーク（📖ボタン）はグループヘッダーに表示されない（ヘッダークリックで解説を表示）", async () => {
    // grammar グループに parentCategoryGuideUrl を追加したモックデータ
    const grammarFileWithParentGuide = {
      ...mockGrammarFile,
      parentCategoryGuideUrl: "../english/grammar/guide",
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestWithParent) } as Response);
      }
      if (urlStr.includes("grammar.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFileWithParentGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 解説ボタン（📖）は表示されないこと（全単元に解説があるため不要）
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    const guideBtn = grammarHeader?.querySelector(".category-group-guide-btn");
    expect(guideBtn).toBeNull();

    // phonics グループにも解説ボタンは表示されない
    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const phonicsGuideBtn = phonicsHeader?.querySelector(".category-group-guide-btn");
    expect(phonicsGuideBtn).toBeNull();
  });

  it("parentCategoryGuideUrl がないグループヘッダーにも解説ボタンは表示されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 解説ボタンは設定有無に関わらず表示されない
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    const guideBtn = grammarHeader?.querySelector(".category-group-guide-btn");
    expect(guideBtn).toBeNull();
  });

  it("親カテゴリヘッダーをクリックすると解説パネルが表示される", async () => {
    const grammarFileWithParentGuide = {
      ...mockGrammarFile,
      parentCategoryGuideUrl: "../english/grammar/guide",
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestWithParent) } as Response);
      }
      if (urlStr.includes("grammar.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFileWithParentGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    // 解説タブがアクティブになること
    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]');
    expect(guideTab?.classList.contains("active")).toBe(true);

    // iframe に親カテゴリの解説 URL が設定されること
    const guideFrame = document.getElementById("guidePanelFrame") as HTMLIFrameElement;
    expect(guideFrame.src).toContain("grammar");
    expect(guideFrame.classList.contains("hidden")).toBe(false);
  });

  it("親カテゴリヘッダーをクリックするとグループの折りたたみ状態が変化する", async () => {
    const grammarFileWithParentGuide = {
      ...mockGrammarFile,
      parentCategoryGuideUrl: "../english/grammar/guide",
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestWithParent) } as Response);
      }
      if (urlStr.includes("grammar.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFileWithParentGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    // ヘッダークリックで折りたたまれること（選択と同時に）
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);
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

  it("問題タブが問題一覧タブと履歴タブの間に存在する", async () => {
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
    const questionsIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "questions");
    expect(guideIdx).toBeGreaterThanOrEqual(0);
    expect(questionsIdx).toBeGreaterThanOrEqual(0);
    expect(quizIdx).toBeGreaterThanOrEqual(0);
    expect(historyIdx).toBeGreaterThanOrEqual(0);
    expect(questionsIdx).toBeGreaterThan(guideIdx);
    expect(quizIdx).toBeGreaterThan(questionsIdx);
    expect(historyIdx).toBeGreaterThan(quizIdx);
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

  it("パネルに「確認」と「解説」と「履歴」と「問題一覧」のインナータブが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]');
    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]');
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]');
    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]');
    expect(quizTab).not.toBeNull();
    expect(quizTab?.textContent).toContain("確認");
    expect(guideTab).not.toBeNull();
    expect(guideTab?.textContent).toContain("解説");
    expect(historyTab).not.toBeNull();
    expect(historyTab?.textContent).toContain("履歴");
    expect(questionsTab).not.toBeNull();
    expect(questionsTab?.textContent).toContain("問題");
  });

  it("「履歴」インナータブをクリックするとhistoryContentが表示されquizModePanelが非表示になる", async () => {
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

  it("履歴がないとき「履歴」タブをクリックすると空メッセージが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const historyList = document.getElementById("historyList");
    expect(historyList?.querySelector(".history-empty")).not.toBeNull();
  });

  it("「確認」インナータブをクリックするとquizModePanelが再び表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 履歴タブを開く
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    // 確認タブに戻る
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

    // 英語タブをクリックしてカテゴリ一覧を表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 カテゴリアイテムをクリック（renderCategoryList で生成される）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // phonics-1 の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("単元選択後に履歴タブを開いてもその単元の記録のみ表示される", async () => {
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

    // 英語タブをクリックしてカテゴリ一覧を表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 カテゴリアイテムをクリック
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    // 履歴タブをクリック
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // phonics-1 の記録のみ表示される
    expect(items?.length).toBe(1);
  });
});

describe("QuizApp — 単元選択時の初期パネルタブ自動選択仕様", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/"); // URL を確実にリセット
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/"); // URL をリセット
  });

  it("解答履歴がない単元をクリックすると解説タブが表示される", async () => {
    // 総合タブではなく英語タブから開始し、かつ selectFirstUnlearnedCategory をスキップする
    // ことで autoSwitchedToHistory=false の状態を作る
    // （?category=all とすることで selectFirstUnlearnedCategory が URL category を検出してスキップ）
    window.history.pushState({}, "", "?subject=english&category=all");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // phonics-1 をクリック（履歴なし、総合タブからの自動復帰なし）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]');
    expect(guideTab?.classList.contains("active")).toBe(true);
    expect(guideTab?.getAttribute("aria-selected")).toBe("true");

    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(false);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);
  });

  it("解答履歴がある単元をクリックすると確認タブが表示される", async () => {
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

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリ一覧を表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 をクリック（履歴あり）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]');
    expect(quizTab?.classList.contains("active")).toBe(true);
    expect(quizTab?.getAttribute("aria-selected")).toBe("true");

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(false);

    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(true);
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

  it("mode=manual の履歴のスコアは「-」と表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const scoreEl = document.querySelector(".history-score");
    expect(scoreEl?.textContent).toBe("-");
  });

  it("mode=manual の履歴には横三角（▶）が表示されない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toggleEl = document.querySelector(".history-toggle");
    expect(toggleEl).toBeNull();
  });

  it("mode=manual の履歴のヘッダーは操作不可で、click や Enter/Space でも詳細は開かない", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("manual")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = document.querySelector<HTMLElement>(".history-item-header");
    const detail = document.querySelector(".history-detail");

    expect(header).not.toBeNull();
    expect(detail).not.toBeNull();
    expect(header?.hasAttribute("role")).toBe(false);
    expect(header?.hasAttribute("tabindex")).toBe(false);
    expect(header?.hasAttribute("aria-expanded")).toBe(false);
    expect(detail?.classList.contains("hidden")).toBe(true);

    header?.click();
    expect(detail?.classList.contains("hidden")).toBe(true);

    header?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(detail?.classList.contains("hidden")).toBe(true);

    header?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(detail?.classList.contains("hidden")).toBe(true);
  });

  it("mode=random の履歴にはスコアが「N/N (N%)」形式で表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("random")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const scoreEl = document.querySelector(".history-score");
    expect(scoreEl?.textContent).toBe("5/5 (100%)");
  });

  it("mode=random の履歴には横三角（▶）が表示される", async () => {
    localStorage.setItem("quizHistory", JSON.stringify([buildRecord("random")]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toggleEl = document.querySelector(".history-toggle");
    expect(toggleEl?.textContent).toBe("▶");
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

  it("初期状態（非表示ON）ではボタンのテキストが「✅ 学習済を表示」になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn");
    expect(btn?.textContent).toBe("✅ 学習済を表示");
  });

  it("ボタンクリック後（非表示OFF）はボタンのテキストが「⬜ 学習済を非表示」になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();

    expect(btn?.textContent).toBe("⬜ 学習済を非表示");
  });

  it("2回クリック後（非表示ON）はボタンのテキストが「✅ 学習済を表示」に戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();
    btn?.click();

    expect(btn?.textContent).toBe("✅ 学習済を表示");
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

  it("学習済み非表示ON時、グループヘッダーのバッジに学習済み数だけ🏆が表示される", async () => {
    setupFetchMockWithParent();
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
          totalCount: 4,
          correctCount: 4,
          entries: [],
        },
      ])
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 は "発音" グループに属するため、発音グループヘッダーのバッジに🏆が表示される
    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const badge = phonicsHeader?.querySelector(".category-group-learned-badge");
    expect(badge?.textContent).toBe("🏆");
  });

  it("学習済み非表示OFFにするとグループヘッダーのバッジが消える", async () => {
    setupFetchMockWithParent();
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
          totalCount: 4,
          correctCount: 4,
          entries: [],
        },
      ])
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 非表示をOFFにする
    const btn = document.getElementById("hideLearnedBtn") as HTMLElement;
    btn?.click();

    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const badge = phonicsHeader?.querySelector(".category-group-learned-badge");
    expect(badge?.textContent).toBe("");
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

  it("学習済（履歴あり・間違いなし）のカテゴリは 🏆 が表示される", async () => {
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
    expect(statusEl?.textContent).toBe("🏆");
  });

  it("学習中（履歴あり・間違いあり）のカテゴリは 🔄 が表示される", async () => {
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
    expect(statusEl?.textContent).toBe("🔄");
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

  it("初期化時（総合タブ表示中）は「学習済みにする」ボタンが無効になっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(true);
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

  it("「学習済みにする」ボタンをクリックするとカテゴリが 🏆 になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();

    // 学習済みになるので 🏆 が表示される
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("🏆");
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

  it("「↩ 未学習に戻す」ボタンをクリックするとカテゴリが 🔄 に戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    // 学習済みにする
    markLearnedBtn.click();
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("🏆");

    // 未学習に戻す
    markLearnedBtn.click();
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("🔄");
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

  it("「確認」タブに戻るとquizModePanelが再表示される", async () => {
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
      <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
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

  it("カテゴリアイテムには .category-progress-pct が含まれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.querySelector(".category-progress-pct")).not.toBeNull();
  });

  it("未学習カテゴリの完了率テキストは非表示（hidden クラスあり）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const pct = catItem?.querySelector(".category-progress-pct") as HTMLElement | null;
    expect(pct?.classList.contains("hidden")).toBe(true);
  });

  it("学習済（間違いなし）カテゴリの完了率テキストは 100% になり hidden クラスが外れる", async () => {
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
    const pct = catItem?.querySelector(".category-progress-pct") as HTMLElement | null;
    expect(pct?.classList.contains("hidden")).toBe(false);
    expect(pct?.textContent).toBe("100%");
  });

  it("間違い問題ありのカテゴリの完了率テキストは 80% になり hidden クラスが外れ、バー幅も 80% になる", async () => {
    // mockQuestionFile には q1–q5 の5問がある。q1 を間違いとして登録する。
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
          correctCount: 4,
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
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    const pct = catItem?.querySelector(".category-progress-pct") as HTMLElement | null;

    expect(fill?.style.width).toBe("80%");
    expect(pct?.classList.contains("hidden")).toBe(false);
    expect(pct?.textContent).toBe("80%");
  });
});

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
    expect(catItem?.querySelector(".category-item-inline-info .category-example")).not.toBeNull();

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
    expect(catItem?.querySelector(".category-item-inline-info .category-item-description")).not.toBeNull();

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

describe("QuizApp — 確認タブの単元説明非表示仕様", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("確認タブに categoryDescription 要素は存在しない", async () => {
    setupTabDom();
    setupFetchMock();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById("categoryDescription")).toBeNull();
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
              <button class="panel-tab" id="panelTab-guide" data-panel="guide" role="tab" type="button" aria-selected="false" tabindex="-1">📖 解説</button>
              <button class="panel-tab" id="panelTab-questions" data-panel="questions" role="tab" type="button" aria-selected="false" tabindex="-1">📋 問題</button>
              <button class="panel-tab active" id="panelTab-quiz" data-panel="quiz" role="tab" type="button" aria-selected="true" tabindex="0">✅ 確認</button>
              <button class="panel-tab" id="panelTab-history" data-panel="history" role="tab" type="button" aria-selected="false" tabindex="-1">📊 履歴</button>
            </div>
            <div id="guideContent" class="hidden" role="tabpanel"></div>
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

  it("初期化後は総合タブが表示され通常パネルタブが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 総合タブでは通常のパネルタブが非表示になる
    const guideTab = document.getElementById("panelTab-guide");
    const quizTab = document.getElementById("panelTab-quiz");
    expect(guideTab?.classList.contains("hidden")).toBe(true);
    expect(quizTab?.classList.contains("hidden")).toBe(true);
    // 総合タブでは右パネルを隠さない（総合サマリパネルを表示する）ため category-only クラスは付かない
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

  it("総合タブ表示中は「解説」タブボタンが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.getElementById("panelTab-guide");
    expect(guideTab?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブ表示中は「問題」タブボタンが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizTab = document.getElementById("panelTab-quiz");
    expect(quizTab?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブから教科タブに切り替えると「解説」「問題」タブボタンが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const guideTab = document.getElementById("panelTab-guide");
    const quizTab = document.getElementById("panelTab-quiz");
    expect(guideTab?.classList.contains("hidden")).toBe(false);
    expect(quizTab?.classList.contains("hidden")).toBe(false);
  });

  it("総合タブから教科タブに切り替えると「問題」パネルが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 初期状態（総合タブ）では quizModePanel が非表示
    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);

    // 英語タブに切り替えると quizModePanel が再表示される
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    expect(quizModePanel?.classList.contains("hidden")).toBe(false);
  });

  it("総合タブ表示中はすべてのパネルタブとコンテンツが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.getElementById("panelTab-history");
    expect(historyTab?.classList.contains("hidden")).toBe(true);

    const questionsTab = document.getElementById("panelTab-questions");
    expect(questionsTab?.classList.contains("hidden")).toBe(true);

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(true);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブに切り替えると「履歴」タブボタンが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const overallTab = document.querySelector('.subject-tab[data-subject="all"]') as HTMLElement;
    overallTab?.click();

    const historyTab = document.getElementById("panelTab-history");
    expect(historyTab?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブに切り替えると「問題一覧」タブボタンが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const overallTab = document.querySelector('.subject-tab[data-subject="all"]') as HTMLElement;
    overallTab?.click();

    const questionsTab = document.getElementById("panelTab-questions");
    expect(questionsTab?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブから教科タブに切り替えると「履歴」「問題一覧」タブが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 初期状態は総合タブ → すべてのパネルタブが非表示
    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);

    // 英語タブをクリックしてカテゴリを選択
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // 履歴・問題一覧タブが再表示される
    const historyTab = document.getElementById("panelTab-history");
    expect(historyTab?.classList.contains("hidden")).toBe(false);

    const questionsTab = document.getElementById("panelTab-questions");
    expect(questionsTab?.classList.contains("hidden")).toBe(false);

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(true);
  });

  it("ユーザーが明示的に履歴タブを選択した後はカテゴリ選択で自動復帰しない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリを選択
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 履歴タブを明示的に選択
    const historyTab = document.getElementById("panelTab-history") as HTMLElement;
    historyTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // history は明示選択なのでそのまま historyContent が表示される
    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(false);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);
  });

  it("選択済みのカテゴリアイテムを再クリックすると非選択になり active クラスが除去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    // 1回目クリック：選択
    catItem?.click();
    expect(catItem?.classList.contains("active")).toBe(true);

    // 2回目クリック：非選択（トグル）
    catItem?.click();
    expect(catItem?.classList.contains("active")).toBe(false);
  });

  it("選択済みのカテゴリアイテムを再クリックすると category-only クラスが付く（カテゴリ未選択状態に戻る）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    // 1回目クリック：選択
    catItem?.click();

    // 2回目クリック：非選択（トグル）
    catItem?.click();

    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("解説タブがアクティブな状態で選択済み単元を再クリックすると先頭が自動選択されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement | null;
    expect(englishTab).not.toBeNull();
    englishTab!.click();

    // 解説タブをアクティブにする
    const guideTab = document.getElementById("panelTab-guide") as HTMLElement | null;
    expect(guideTab).not.toBeNull();
    guideTab!.click();
    expect(
      guideTab!.classList.contains("active") || guideTab!.getAttribute("aria-selected") === "true",
    ).toBe(true);

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement | null;
    expect(catItem).not.toBeNull();
    // 1回目クリック：選択
    catItem!.click();
    expect(catItem!.classList.contains("active")).toBe(true);

    // 2回目クリック：非選択（トグル）→ 先頭カテゴリが自動選択されないこと
    catItem!.click();
    expect(catItem!.classList.contains("active")).toBe(false);

    // 他のカテゴリアイテムも active になっていないこと
    const activeItems = document.querySelectorAll(".category-item.active");
    expect(activeItems.length).toBe(0);
  });
});

// ─── テキスト入力問題のタッチペン入力仕様 ──────────────────────────────────

const mockTextInputManifest = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/kanji.json"],
};

const mockTextInputFile = {
  subject: "english",
  subjectName: "英語",
  category: "text-practice",
  categoryName: "テキスト練習",
  questionType: "text-input",
  questions: [
    { id: "t1", question: "「やま」と入力してください", choices: ["やま"], correct: 0, explanation: "やま" },
    { id: "t2", question: "「かわ」と入力してください", choices: ["かわ"], correct: 0, explanation: "かわ" },
    { id: "t3", question: "「ひ」と入力してください", choices: ["ひ"], correct: 0, explanation: "ひ" },
    { id: "t4", question: "「つき」と入力してください", choices: ["つき"], correct: 0, explanation: "つき" },
    { id: "t5", question: "「ほし」と入力してください", choices: ["ほし"], correct: 0, explanation: "ほし" },
  ],
};

/** テキスト入力問題用のDOMセットアップ（メモエリアのnotesCanvas・KanjiCanvas含む） */
function setupTextInputDom(): void {
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
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
      <a id="guideLink" class="hidden" href="#">解説</a>
      <div id="notesMemoContent">
        <span id="notesTitle">タッチペンで書けます</span>
        <div class="notes-controls"></div>
        <canvas id="notesCanvas"></canvas>
        <div id="kanjiInputArea" class="hidden">
          <button id="kanjiDeleteLastBtn" type="button">↩</button>
          <button id="kanjiEraseBtn" type="button">🗑️</button>
          <canvas id="kanjiCanvas" width="256" height="256"></canvas>
          <div id="kanjiCandidateList"></div>
        </div>
      </div>
    </div>
    <div id="resultScreen" class="screen">
      <div id="scoreDisplay"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">もう一度</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">スタート画面に戻る</button>
    </div>
  `;
}

describe("QuizApp — テキスト入力問題のKanjiCanvas入力仕様", () => {
  beforeEach(() => {
    setupTextInputDom();
    kanjiCanvasMock.recognize.mockReturnValue("");

    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputFile) } as Response);
    });

    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("テキスト入力問題ではメモエリアのnotesTitleが手書き入力を促すテキストに変わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const notesTitle = document.getElementById("notesTitle");
    expect(notesTitle?.textContent).toContain("書いて");
  });

  it("テキスト入力問題ではKanjiCanvas入力エリアが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(false);
  });

  it("テキスト入力問題ではKanjiCanvasが初期化される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    expect(kanjiCanvasMock.init).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("KanjiCanvas初期化後にstrokeColorsが空配列に設定される（書き順番号・色変化の無効化）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    expect(kanjiCanvasMock.strokeColors).toEqual([]);
  });

  it("候補ボタンをクリックすると文字が答えの入力エリアに追加される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  ゆ  よ");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // 候補を手動で描画後の認識をシミュレート
    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateList = document.getElementById("kanjiCandidateList");
    const firstBtn = candidateList?.querySelector<HTMLButtonElement>(".kanji-candidate-btn");
    expect(firstBtn?.textContent).toBe("や");

    firstBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    expect(textInput?.value).toBe("や");
  });

  it("候補ボタンをクリックするとKanjiCanvasがクリアされる", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const firstBtn = document.querySelector<HTMLButtonElement>(".kanji-candidate-btn");
    firstBtn?.click();

    expect(kanjiCanvasMock.erase).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("候補ボタンを複数回クリックするとテキストが追記される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;

    // 1文字目
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>(".kanji-candidate-btn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 2文字目
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>(".kanji-candidate-btn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    expect(textInput?.value).toBe("やや");
  });

  it("候補ボタンをクリックしても回答はまだ送信されない", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.querySelector<HTMLButtonElement>(".kanji-candidate-btn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 回答が登録されていないこと（フィードバックが非表示のまま）
    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(true);

    // テキスト入力欄が無効化されていないこと
    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    expect(textInput?.disabled).toBe(false);
  });

  it("ストロークがないとき認識後に候補ボタンが表示されない", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll(".kanji-candidate-btn");
    expect(candidateBtns.length).toBe(0);
  });

  it("認識候補が6個以上あっても候補ボタンは5個まで表示される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や い う え お か き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll(".kanji-candidate-btn");
    expect(candidateBtns.length).toBe(5);
  });

  it("↩ボタンをクリックするとKanjiCanvasの最後のストロークが削除される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    document.getElementById("kanjiDeleteLastBtn")?.click();

    expect(kanjiCanvasMock.deleteLast).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("🗑️ボタンをクリックするとKanjiCanvasが全消去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    document.getElementById("kanjiEraseBtn")?.click();

    expect(kanjiCanvasMock.erase).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("回答後に次の問題へ移動するとKanjiCanvas入力エリアが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // テキスト入力欄に入力して「確認する」で回答登録
    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    if (textInput) textInput.value = "やま";
    const submitBtn = document.querySelector<HTMLButtonElement>(".text-answer-submit-btn");
    submitBtn?.click();

    // 次の問題へ移動
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    expect(nextBtn?.disabled).toBe(false);
    nextBtn?.click();

    // 次の問題（未回答）でKanjiCanvas入力エリアが表示されていること
    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(false);
  });

  it("KanjiCanvasが未ロードの場合はKanjiCanvas入力エリアが非表示になりノートキャンバスが表示される", async () => {
    // KanjiCanvas グローバルを一時的に削除して未ロード状態をシミュレート
    const original = (globalThis as unknown as Record<string, unknown>).KanjiCanvas;
    delete (globalThis as unknown as Record<string, unknown>).KanjiCanvas;

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(true);

    const notesCanvas = document.getElementById("notesCanvas");
    expect(notesCanvas?.classList.contains("hidden")).toBe(false);

    // 後片付け
    (globalThis as unknown as Record<string, unknown>).KanjiCanvas = original;
  });

  it("選択肢問題ではKanjiCanvas入力エリアが非表示のままで notesTitleが変わらない", async () => {
    // 選択肢問題のモックに差し替え
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(true);

    const notesTitle = document.getElementById("notesTitle");
    expect(notesTitle?.textContent).toBe("タッチペンで書けます");
  });
  it("ひらがな問題では認識候補のうちひらがな以外が除外される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  山  き  川");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll<HTMLButtonElement>(".kanji-candidate-btn");
    const candidateTexts = Array.from(candidateBtns).map((btn) => btn.textContent);
    expect(candidateTexts).toEqual(["や", "き"]);
  });

  it("漢字書き取り問題（正解が漢字）では認識候補がフィルタされず漢字も表示される", async () => {
    const mockKanjiWritingFile = {
      subject: "japanese",
      subjectName: "国語",
      category: "kanji-writing",
      categoryName: "漢字書き取り",
      questionType: "text-input",
      questions: [
        { id: "kw1", question: "「やま」を漢字で書いてください", choices: ["山"], correct: 0, explanation: "山" },
      ],
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockKanjiWritingFile) } as Response);
    });
    kanjiCanvasMock.recognize.mockReturnValue("山  川  や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll<HTMLButtonElement>(".kanji-candidate-btn");
    const candidateTexts = Array.from(candidateBtns).map((btn) => btn.textContent);
    // 漢字問題では全候補が表示される（フィルタされない）
    expect(candidateTexts).toEqual(["山", "川", "や", "き"]);
  });
});

describe("QuizApp — 総合タブの教科一覧仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態（総合タブ）では教科概要アイテムが教科数分（総合除く）描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const overviewItems = document.querySelectorAll(".subject-overview-item");
    // SUBJECTS から "all" を除いた 3 教科（英語・数学・国語）
    expect(overviewItems.length).toBe(3);
  });

  it("各教科概要アイテムに data-subject が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const overviewItems = document.querySelectorAll<HTMLElement>(".subject-overview-item");
    overviewItems.forEach((item) => {
      expect(item.dataset.subject).toBeTruthy();
    });
  });

  it("推奨単元がある教科概要アイテムに role=button が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 推奨単元がある英語アイテム（モックデータには英語の問題のみある）
    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    expect(englishItem?.getAttribute("role")).toBe("button");
  });

  it("英語教科アイテムには推奨の単元テキストが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const recName = englishItem?.querySelector(".subject-overview-rec-name");
    expect(recName?.textContent).toBeTruthy();
  });

  it("未学習の場合、教科アイテムの進捗率は0%と表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const pctSpan = englishItem?.querySelector(".subject-overview-pct");
    expect(pctSpan?.textContent).toBe("0%");
  });

  it("学習履歴がある場合でも最終学習日は表示されない（outerDateは廃止）", async () => {
    const studyDate = "2025-04-01T10:00:00.000Z";
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: studyDate,
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

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const wrapper = document.querySelector('.subject-overview-wrapper:has([data-subject="english"])');
    const outerDate = wrapper?.querySelector(".subject-overview-outer-date");
    expect(outerDate).toBeNull();
  });

  it("教科概要アイテムをクリックしても総合タブのままで教科タブに切り替わらない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>(
      '.subject-overview-item[data-subject="english"]'
    );
    englishItem?.click();

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]');
    expect(englishTab?.classList.contains("active")).toBe(false);

    const allTab = document.querySelector('.subject-tab[data-subject="all"]');
    expect(allTab?.classList.contains("active")).toBe(true);
  });

  it("教科概要アイテムをクリックすると解説パネルが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>(
      '.subject-overview-item[data-subject="english"]'
    );
    englishItem?.click();

    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(false);

    const overallPanel = document.getElementById("overallSummaryPanel");
    expect(overallPanel?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブ時に allSubjectPanelTitle が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const title = document.getElementById("allSubjectPanelTitle");
    expect(title?.classList.contains("hidden")).toBe(false);
  });

  it("教科タブに切り替えると allSubjectPanelTitle が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    englishTab?.click();

    const title = document.getElementById("allSubjectPanelTitle");
    expect(title?.classList.contains("hidden")).toBe(true);
  });
});

// ─── 総合タブのサマリパネル仕様 ────────────────────────────────────────────

describe("QuizApp — 総合タブのサマリパネル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化後に総合タブでは overallSummaryPanel が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.getElementById("overallSummaryPanel");
    expect(panel?.classList.contains("hidden")).toBe(false);
  });

  it("教科タブに切り替えると overallSummaryPanel が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    englishTab?.click();

    const panel = document.getElementById("overallSummaryPanel");
    expect(panel?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブに戻ると overallSummaryPanel が再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    englishTab?.click();

    const allTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="all"]');
    allTab?.click();

    const panel = document.getElementById("overallSummaryPanel");
    expect(panel?.classList.contains("hidden")).toBe(false);
  });

  it("今日の学習記録がない場合、todayActivityContent に未実施メッセージが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    expect(container?.textContent).toContain("この日はクイズをしていません");
  });

  it("今日の学習記録がある場合、todayActivityContent にスコアが表示される", async () => {
    const today = new Date().toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: today,
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 10,
          correctCount: 8,
          entries: [],
        },
      ])
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    expect(container?.textContent).toContain("8/10 (80%)");
  });

  it("活動サマリテキストに今日の日付が含まれる（学習サマリヘッダーは含まれない）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const summaryEl = document.getElementById("shareSummaryText");
    const today = new Date();
    const year = String(today.getFullYear());
    expect(summaryEl?.textContent).toContain(year);
    expect(summaryEl?.textContent).not.toContain("学習サマリ");
  });

  it("共有URLを保存すると openShareUrlBtn が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "https://twitter.com";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(false);
  });

  it("共有URLが空の場合 openShareUrlBtn が非表示になる", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // URLをクリアして保存
    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("保存した共有URLが localStorageに保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "https://example.com/share";
    document.getElementById("saveShareUrlBtn")?.click();

    expect(localStorage.getItem("overallShareUrl")).toBe("https://example.com/share");
  });

  it("localhost に共有URLが保存されていれば初期表示時に openShareUrlBtn が表示される", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(false);
  });

  it("javascript: スキームの URL を保存しても openShareUrlBtn が非表示のままになる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "javascript:alert(1)";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("javascript: スキームの URL は localStorage に保存されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "javascript:alert(1)";
    document.getElementById("saveShareUrlBtn")?.click();

    expect(localStorage.getItem("overallShareUrl")).toBeNull();
  });

  it("localStorage に javascript: の URL が保存されていても初期表示時に openShareUrlBtn が非表示のままになる", async () => {
    localStorage.setItem("overallShareUrl", "javascript:alert(1)");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("shareUrlDisplayBtn をクリックすると編集エリアが開き入力フィールドに現在のURLが設定される", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();

    const editArea = document.getElementById("shareUrlEditArea");
    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;

    expect(editArea?.classList.contains("hidden")).toBe(false);
    expect(displayBtn?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(input?.value).toBe("https://twitter.com");
  });

  it("URL未設定時に shareUrlDisplayBtn をクリックすると編集エリアが開き入力は空", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();

    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    expect(input?.value).toBe("");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(false);
  });

  it("saveShareUrlBtn をクリックすると編集エリアが閉じ表示ボタンが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 編集エリアを開く
    document.getElementById("shareUrlDisplayBtn")?.click();

    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com";
    document.getElementById("saveShareUrlBtn")?.click();

    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.classList.contains("hidden")).toBe(false);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(displayBtn?.textContent).toBe("https://example.com");
  });

  it("共有URLのURLInputでEnterキーを押すと保存して編集エリアが閉じる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com/enter";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(localStorage.getItem("overallShareUrl")).toBe("https://example.com/enter");
  });

  it("共有URLのURLInputでEscapeキーを押すと保存せずに編集エリアが閉じ aria-expanded が false になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com/escape";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(localStorage.getItem("overallShareUrl")).toBeNull();
  });

  it("openShareUrlBtn をクリックすると window.open が正しい引数で呼ばれる", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("openShareUrlBtn")?.click();

    expect(openSpy).toHaveBeenCalledWith("https://twitter.com", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("prevDateBtn をクリックすると活動サマリの日付が1日前に移動する", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const picker = document.getElementById("activityDatePicker") as HTMLInputElement;
    const beforeDate = picker.value;

    document.getElementById("prevDateBtn")?.click();

    const afterDate = picker.value;
    const before = new Date(beforeDate + "T00:00:00");
    const after = new Date(afterDate + "T00:00:00");
    const diffDays = Math.round((before.getTime() - after.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(1);
  });

  it("今日の日付では nextDateBtn が無効化される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const nextBtn = document.getElementById("nextDateBtn") as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it("1日前に移動すると nextDateBtn が有効化される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("prevDateBtn")?.click();

    const nextBtn = document.getElementById("nextDateBtn") as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(false);
  });

  it("1日前に移動した後に nextDateBtn をクリックすると今日の日付に戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const picker = document.getElementById("activityDatePicker") as HTMLInputElement;
    const today = picker.value;

    document.getElementById("prevDateBtn")?.click();
    document.getElementById("nextDateBtn")?.click();

    expect(picker.value).toBe(today);
  });

  it("activityDatePicker で日付を変更すると活動一覧が更新される", async () => {
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: yesterday + "T10:00:00.000",
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 4,
          entries: [],
        },
      ])
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 今日では活動なし
    const container = document.getElementById("todayActivityContent");
    expect(container?.querySelector(".today-activity-empty")).not.toBeNull();

    // カレンダーで昨日を選択
    const picker = document.getElementById("activityDatePicker") as HTMLInputElement;
    picker.value = yesterday;
    picker.dispatchEvent(new Event("change", { bubbles: true }));

    // 昨日の記録が表示される
    expect(container?.querySelectorAll(".history-item").length).toBe(1);
  });
});

// ─── 確認ダイアログ仕様 ────────────────────────────────────────────────────

describe("QuizApp — 確認ダイアログ仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function startQuizFromMinimalDom(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();
  }

  it("クイズ進行中にタイトルをクリックすると確認ダイアログが表示される", async () => {
    await startQuizFromMinimalDom();

    const quizScreen = document.getElementById("quizScreen");
    expect(quizScreen?.classList.contains("hidden")).toBe(false);

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialog = document.getElementById("confirmDialog");
    expect(dialog?.classList.contains("hidden")).toBe(false);
  });

  it("確認ダイアログで「OK」をクリックするとスタート画面に遷移する", async () => {
    await startQuizFromMinimalDom();

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const startScreen = document.getElementById("startScreen");
    expect(startScreen?.classList.contains("hidden")).toBe(false);
    const dialog = document.getElementById("confirmDialog");
    expect(dialog?.classList.contains("hidden")).toBe(true);
  });

  it("確認ダイアログで「キャンセル」をクリックするとクイズ画面に留まる", async () => {
    await startQuizFromMinimalDom();

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("confirmDialogCancel")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizScreen = document.getElementById("quizScreen");
    expect(quizScreen?.classList.contains("hidden")).toBe(false);
    const dialog = document.getElementById("confirmDialog");
    expect(dialog?.classList.contains("hidden")).toBe(true);
  });

  it("確認ダイアログのメッセージが設定されている", async () => {
    await startQuizFromMinimalDom();

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const msg = document.getElementById("confirmDialogMessage");
    expect(msg?.textContent).toContain("スタート画面に戻りますか");
  });

  it("確認ダイアログDOM要素がない場合はwindow.confirmにフォールバックする", async () => {
    // confirmDialog 要素を除いた最小限のDOMでセットアップ
    document.body.innerHTML = `
      <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
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
          <div id="feedbackResult"></div>
          <div id="feedbackExplanation"></div>
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
    // confirmDialog は意図的に追加しない

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("スタート画面に戻りますか"));
    const startScreen = document.getElementById("startScreen");
    expect(startScreen?.classList.contains("hidden")).toBe(false);
  });

  it("確認ダイアログ表示時にOKボタンへフォーカスが移動する", async () => {
    await startQuizFromMinimalDom();

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.activeElement?.id).toBe("confirmDialogOk");
  });

  it("確認ダイアログでEscキーを押すとキャンセルしてクイズ画面に留まる", async () => {
    await startQuizFromMinimalDom();

    document.getElementById("titleBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlay = document.getElementById("confirmDialog");
    overlay?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizScreen = document.getElementById("quizScreen");
    expect(quizScreen?.classList.contains("hidden")).toBe(false);
    const dialog = document.getElementById("confirmDialog");
    expect(dialog?.classList.contains("hidden")).toBe(true);
  });
});


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

    const grammarHeader = document.querySelector<HTMLElement>('.category-top-group-header[data-top-category="grammar"]');
    grammarHeader?.click();

    const grammarTopGroup = document.querySelector('.category-top-group[data-top-category="grammar"]');
    expect(grammarTopGroup?.classList.contains("collapsed")).toBe(true);
  });

  it("折りたたまれたトップカテゴリヘッダーを再クリックすると展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-top-group-header[data-top-category="grammar"]');
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
    const grammarHeader = document.querySelector<HTMLElement>('.category-top-group-header[data-top-category="grammar"]');
    grammarHeader?.click();
    expect(document.querySelector('.category-top-group[data-top-category="grammar"]')?.classList.contains("collapsed")).toBe(true);

    // カテゴリアイテムをプログラム的にクリック
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();

    // トップグループが自動展開されること
    expect(document.querySelector('.category-top-group[data-top-category="grammar"]')?.classList.contains("collapsed")).toBe(false);
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

  it("単元をクリックするとそのカテゴリが選択されて解説タブが開く", async () => {
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

    // 単元をクリックすると選択されて解説タブが開く（guideUrl があり未学習のため）
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-present"]');
    catItem?.click();

    // 解説タブが有効になっていること
    const guideTab = document.getElementById("panelTab-guide");
    expect(guideTab?.classList.contains("active")).toBe(true);

    // guideContent が表示されていること
    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(false);
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    // 「小学」フィルターボタンをクリック
    const filterBtns = document.querySelectorAll<HTMLElement>(".grade-filter-btn");
    const elemBtn = Array.from(filterBtns).find(b => b.textContent === "小学");
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    // 「小学」を選んでからリセット
    const filterBtns = document.querySelectorAll<HTMLElement>(".grade-filter-btn");
    const elemBtn = Array.from(filterBtns).find(b => b.textContent === "小学");
    elemBtn?.click();

    // 「すべて」ボタンをクリック
    const allBtn = Array.from(document.querySelectorAll<HTMLElement>(".grade-filter-btn")).find(b => b.textContent === "すべて");
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
      if (String(url).includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
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
      if (String(url).includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
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
      subject: "math", subjectName: "数学", category: "addition", categoryName: "たし算",
      referenceGrade: "小学1年",
      questions: [{ id: "e1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const middleFile = {
      subject: "math", subjectName: "数学", category: "algebra", categoryName: "代数",
      referenceGrade: "中学1年",
      questions: [{ id: "m1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const englishBasicFile = {
      subject: "english", subjectName: "英語", category: "basic", categoryName: "基礎",
      // referenceGrade なし
      questions: [{ id: "b1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("elem.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(elemFile) } as Response);
      if (u.includes("middle.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(middleFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(englishBasicFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 数学タブで「小学」フィルターを適用
    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();
    const elemBtn = Array.from(document.querySelectorAll<HTMLElement>(".grade-filter-btn")).find(b => b.textContent === "小学");
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("grammar.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
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
      if (u.includes("index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
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

describe("QuizApp — フォントサイズ切替仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
    // body クラスを初期化する
    document.body.classList.remove("font-size-medium", "font-size-large");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時にlocalStorageに保存値がなければ bodyにフォントサイズクラスが付かない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("localStorageに medium が保存されていれば初期化時に body.font-size-medium が付く", async () => {
    localStorage.setItem("fontSizeLevel", "medium");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("localStorageに large が保存されていれば初期化時に body.font-size-large が付く", async () => {
    localStorage.setItem("fontSizeLevel", "large");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("初期化時にlocalStorageへの書き戻しが発生しない（localStorageに保存値がない場合）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(localStorage.getItem("fontSizeLevel")).toBeNull();
  });

  it("初期化時にlocalStorageへの書き戻しが発生しない（medium が保存されている場合）", async () => {
    localStorage.setItem("fontSizeLevel", "medium");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 初期復元で書き戻しが起きていないことを確認（値は変わらず medium のまま）
    expect(localStorage.getItem("fontSizeLevel")).toBe("medium");
  });

  it("「中」ボタンをクリックするとbody.font-size-mediumが付く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("「大」ボタンをクリックするとbody.font-size-largeが付く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("「小」ボタンをクリックするとフォントサイズクラスが除去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // まず大きいサイズに変更
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    // 小に戻す
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("「中」ボタンクリック後にaria-pressed属性が正しく更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    mediumBtn.click();
    expect(mediumBtn.getAttribute("aria-pressed")).toBe("true");
    expect(smallBtn.getAttribute("aria-pressed")).toBe("false");
    expect(largeBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("「中」ボタンクリック後にlocalStorageに medium が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("medium");
  });

  it("「大」ボタンクリック後にlocalStorageに large が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("large");
  });

  it("「小」ボタンクリック後にlocalStorageに small が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    smallBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("small");
  });

  it("フォントサイズ変更時に .guide-frame の iframe へ fontSizeChanged メッセージが送信される", async () => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
    document.body.classList.remove("font-size-medium", "font-size-large");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLIFrameElement;
    guideFrame.classList.add("guide-frame");

    const postedMessages: Array<{ msg: unknown; targetOrigin: string }> = [];
    if (guideFrame.contentWindow) {
      guideFrame.contentWindow.postMessage = (msg: unknown, targetOrigin: string) => {
        postedMessages.push({ msg, targetOrigin });
      };
    }

    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();

    expect(postedMessages).toContainEqual({
      msg: { type: "fontSizeChanged", level: "large" },
      targetOrigin: "*",
    });
  });
});

describe("QuizApp — 選択中の単元情報パネル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では selectedUnitInfo は非表示", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);
  });

  it("単元を選択すると selectedUnitInfo が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(false);
  });

  it("単元選択時に selectedUnitInfo に単元名が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const nameEl = document.querySelector(".selected-unit-info-name");
    expect(nameEl?.textContent).toBe("フォニックス（1文字）");
  });

  it("selectedUnitInfo の閉じるボタンをクリックすると選択が解除されパネルが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const closeBtn = document.querySelector<HTMLButtonElement>(".selected-unit-close-btn");
    closeBtn?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);

    // カテゴリ選択も解除されること
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("同じ教科タブを再クリックすると selectedUnitInfo が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    // 同じ教科タブを再クリックすると category="all" にリセットされる
    englishTab?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);
  });

  it("親カテゴリのみの単元選択時にカテゴリパスバッジが表示される", async () => {
    setupTabDom();
    setupFetchMockWithParent();
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).not.toBeNull();
    expect(catLabel?.textContent).toBe("発音");
  });

  it("トップカテゴリ＋親カテゴリの単元選択時にカテゴリパスバッジが `Top › Parent` 形式で表示される", async () => {
    setupTabDom();
    setupFetchMockWith3Levels();
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).not.toBeNull();
    expect(catLabel?.textContent).toBe("文法 › 動詞");
  });

  it("カテゴリ階層のない単元選択時にはカテゴリパスバッジが表示されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).toBeNull();
  });
});
