/**
 * QuizApp — 回答フィードバック仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { act } from "react";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockQuestionFile,
  setupMinimalDom,
  mockManifest,
} from "./testHelpers";

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
  async function startQuiz(): Promise<QuizApp> {
    const app = new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    await act(async () => {
      startBtn.click();
    });
    await waitForCondition(() => document.querySelectorAll<HTMLInputElement>('input[name="answer"]').length > 0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return app;
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

  it("回答結果のメッセージと correct/incorrect クラスが一致する", async () => {
    await startQuiz();
    const firstRadio = document.querySelector<HTMLInputElement>('input[name="answer"]');
    firstRadio?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(false);
    const resultText = document.getElementById("feedbackResult")?.textContent ?? "";
    const isCorrectMessage = resultText.includes("✅ 正解です！");
    expect(feedback?.classList.contains("correct")).toBe(isCorrectMessage);
    expect(feedback?.classList.contains("incorrect")).toBe(!isCorrectMessage);
  });

  it("不正解を選択すると incorrect クラスが付与される", async () => {
    const app = await startQuiz();
    const correctIndex = app.currentSession?.currentQuestion.correct;
    const wrongLabel = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="answer"]')).find(
      (input) => Number(input.value) !== correctIndex,
    );
    expect(wrongLabel).toBeDefined();
    await act(async () => {
      wrongLabel?.click();
      wrongLabel?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

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

  it("フィードバック表示時にHTMLタグが実行されない（XSS対策）", async () => {
    // HTMLタグを含む選択肢が正解の場合でも安全に描画されることを確認する
    const xssPayload = "<img src=x onerror=alert(1)>";
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

    await startQuiz();
    const dangerousChoice = Array.from(document.querySelectorAll<HTMLElement>(".choice-text")).find(
      (choice) => choice.textContent === xssPayload,
    );
    expect(dangerousChoice).toBeDefined();
    expect(dangerousChoice?.querySelector("img")).toBeNull();
    const firstRadio = document.querySelector<HTMLInputElement>('input[name="answer"]');
    await act(async () => {
      firstRadio?.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const resultDiv = document.getElementById("feedbackResult");
    expect(resultDiv?.textContent).not.toBeNull();
    expect(resultDiv?.querySelector("img")).toBeNull();
  });
});
