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

  async function chooseAnswerByIndex(index: number): Promise<void> {
    const radio = document.querySelector<HTMLInputElement>(`input[name="answer"][value="${String(index)}"]`);
    expect(radio).not.toBeNull();
    await act(async () => {
      radio?.click();
      radio?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
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
    const radioValues = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="answer"]')).map((radio) =>
      Number(radio.value),
    );
    expect(radioValues.length).toBeGreaterThan(0);

    let foundCorrect = false;
    for (const value of radioValues) {
      setupMinimalDom();
      setupFetchMock();
      localStorage.clear();
      await startQuiz();
      await chooseAnswerByIndex(value);
      const feedback = document.getElementById("answerFeedback");
      if (feedback?.classList.contains("correct")) {
        expect(feedback.classList.contains("incorrect")).toBe(false);
        foundCorrect = true;
        break;
      }
    }

    expect(foundCorrect).toBe(true);
  });

  it("不正解を選択すると incorrect クラスが付与される", async () => {
    await startQuiz();
    const radioValues = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="answer"]')).map((radio) =>
      Number(radio.value),
    );
    expect(radioValues.length).toBeGreaterThan(0);

    let foundIncorrect = false;
    for (const value of radioValues) {
      setupMinimalDom();
      setupFetchMock();
      localStorage.clear();
      await startQuiz();
      await chooseAnswerByIndex(value);
      const feedback = document.getElementById("answerFeedback");
      if (feedback?.classList.contains("incorrect")) {
        expect(feedback.classList.contains("correct")).toBe(false);
        foundIncorrect = true;
        break;
      }
    }

    expect(foundIncorrect).toBe(true);
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

    const app = await startQuiz();
    const dangerousChoice = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="answer"]')).find(
      (input) => {
        const choiceText = input.parentElement?.querySelector(".choice-text")?.textContent;
        return choiceText === xssPayload;
      },
    );
    expect(dangerousChoice).toBeDefined();
    const correctIndex = app.currentSession?.currentQuestion.correct;
    expect(correctIndex).toBeDefined();
    const wrongRadio = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="answer"]')).find(
      (input) => Number(input.value) !== correctIndex,
    );
    expect(wrongRadio).toBeDefined();
    await chooseAnswerByIndex(Number(wrongRadio?.value));

    const resultDiv = document.getElementById("feedbackResult");
    expect(resultDiv?.textContent).toContain(xssPayload);
    expect(resultDiv?.querySelector("img")).toBeNull();
  });
});
