/**
 * QuizApp — 問題一覧タブ仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { setupTabDom, setupFetchMock } from "../quizApp.testHelpers";

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

  it("問題一覧の正解はヒント内（question-list-hint）に表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const rows = document.querySelectorAll(".question-list-row");
    expect(rows.length).toBe(5); // 5問それぞれに1行ある

    rows.forEach((row) => {
      expect(row.querySelector(".question-list-text")).not.toBeNull();
      // 正解は行ではなくヒント内に移動した
      expect(row.querySelector(".question-list-correct")).toBeNull();
      expect(row.querySelector(".question-list-hint-btn")).not.toBeNull();
    });

    // 正解は hint 内に存在する
    const hints = document.querySelectorAll(".question-list-hint");
    hints.forEach((hint) => {
      expect(hint.querySelector(".question-list-correct")).not.toBeNull();
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

  it("「学習済み」フィルターボタンをクリックすると学習済み問題のみ表示される", async () => {
    // 問題を習得済みにしてから確認
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q3"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    // 学習済みフィルターをクリック
    const learnedBtn = document.getElementById("questionListFilterLearned") as HTMLElement;
    learnedBtn?.click();

    const items = document.querySelectorAll(".question-list-item");
    // q1, q3 のみが学習済みなので2件
    expect(items.length).toBe(2);
    // アクティブボタンが切り替わること
    expect(learnedBtn?.classList.contains("active")).toBe(true);
    expect(document.getElementById("questionListFilterAll")?.classList.contains("active")).toBe(false);
  });

  it("「未学習」フィルターボタンをクリックすると未学習問題のみ表示される", async () => {
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q3"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const unlearnedBtn = document.getElementById("questionListFilterUnlearned") as HTMLElement;
    unlearnedBtn?.click();

    const items = document.querySelectorAll(".question-list-item");
    // q2, q4, q5 が未学習なので3件
    expect(items.length).toBe(3);
    expect(unlearnedBtn?.classList.contains("active")).toBe(true);
  });

  it("「すべて」フィルターボタンをクリックすると全問題が再表示される", async () => {
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q3"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    // まず学習済みで絞り込む
    document.getElementById("questionListFilterLearned")?.click();
    expect(document.querySelectorAll(".question-list-item").length).toBe(2);

    // すべてに戻す
    const allBtn = document.getElementById("questionListFilterAll") as HTMLElement;
    allBtn?.click();
    expect(document.querySelectorAll(".question-list-item").length).toBe(5);
    expect(allBtn?.classList.contains("active")).toBe(true);
  });
});
