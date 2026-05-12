/**
 * QuizApp — クイズパネル表示制御仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  mockQuestionFile,
  mountTestContentBridge,
  unmountAllTrackedRoots,
} from "../testHelpers";

describe("QuizApp — クイズパネル表示制御仕様", () => {
  beforeEach(() => {
    // 前テストで URL フラグメントが書き換わっている可能性があるためリセットする
    window.history.replaceState({}, "", "/");
    unmountAllTrackedRoots();
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
    mountTestContentBridge();
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

describe("QuizApp — 確認タブの単元説明非表示仕様", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("確認タブに categoryDescription 要素は存在しない", async () => {
    setupTabDom();
    setupFetchMock();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById("categoryDescription")).toBeNull();
  });
});

// ─── 確認ダイアログ仕様 ────────────────────────────────────────────────────
