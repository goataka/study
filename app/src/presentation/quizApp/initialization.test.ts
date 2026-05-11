/**
 * QuizApp — 初期化仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { LocalStorageProgressRepository } from "../../infrastructure/localStorageProgressRepository";
import type { IQuestionRepository } from "../../application/ports";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockQuestionFile,
  setupMinimalDom,
} from "./testHelpers";

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

  it("問題のロードが完了したら statsInfo に問題数が表示される", async () => {
    new QuizApp();
    // init() は非同期なので Promiseのキューが流れるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：5問");
  });

  it("明示的に注入した questionRepo / progressRepo でも初期化できる", async () => {
    const questionRepo: IQuestionRepository = {
      loadAll: async () => [
        {
          id: "injected-q1",
          subject: "english",
          subjectName: "英語",
          category: "alphabet",
          categoryName: "アルファベット",
          question: "A",
          choices: ["エー", "ビー", "シー", "ディー"],
          correct: 0,
          explanation: "A の読み",
        },
      ],
    };

    new QuizApp(new LocalStorageProgressRepository(), questionRepo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：1問");
  });
});
