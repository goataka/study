/**
 * QuizApp — 初期化仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockQuestionFile,
  setupMinimalDom,
} from "../quizApp.testHelpers";

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
