/**
 * QuizApp — 確認ダイアログ仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  mockQuestionFile,
  setupMinimalDom,
} from "../quizApp.testHelpers";

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
