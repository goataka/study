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
  async function startQuiz(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    await act(async () => {
      startBtn.click();
    });
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
    const correctLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent === "ア");
    correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("correct")).toBe(true);
    expect(feedback?.classList.contains("incorrect")).toBe(false);
  });

  it("不正解を選択すると incorrect クラスが付与される", async () => {
    await startQuiz();
    // 不正解の選択肢テキスト（「ア」以外）を持つラベル内のラジオボタンをクリックする
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const wrongLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent !== "ア");
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

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // xssPayload 以外のラジオボタンをクリックして不正解フィードバックを表示させる
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const wrongLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent !== xssPayload);
    wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const resultDiv = document.getElementById("feedbackResult");
    // textContent にはプレーンテキストとして格納される（HTMLとして解析されない）
    expect(resultDiv?.textContent).toContain(xssPayload);
    // img 要素が DOM に生成されていないことを確認
    expect(resultDiv?.querySelector("img")).toBeNull();
  });
});
