/**
 * QuizApp プレゼンテーション層 — クイズパネル表示制御・確認ダイアログ仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { setupMinimalDom, setupTabDom, setupFetchMock, mockQuestionFile } from "./quizApp.testHelpers";

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
            <button id="filterStatusAll" class="category-status-filter-btn active" type="button" aria-pressed="true">すべて</button>
            <button id="filterStatusUnlearned" class="category-status-filter-btn" type="button" aria-pressed="false">未学習</button>
            <button id="filterStatusStudying" class="category-status-filter-btn" type="button" aria-pressed="false">学習中</button>
            <button id="filterStatusLearned" class="category-status-filter-btn" type="button" aria-pressed="false">学習済</button>
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
        <button id="speakBtn" class="speak-btn hidden" type="button">🔊</button>
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
    expect(guideTab!.classList.contains("active") || guideTab!.getAttribute("aria-selected") === "true").toBe(true);

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
    expect(msg?.textContent).toContain("単元選択に戻りますか");
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
        <button id="speakBtn" class="speak-btn hidden" type="button">🔊</button>
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

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("単元選択に戻りますか"));
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
