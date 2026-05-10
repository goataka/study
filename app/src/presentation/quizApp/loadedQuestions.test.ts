/**
 * QuizApp — 問題ロード後の仕様
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
} from "./testHelpers";

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
    expect(statsInfo?.textContent).toContain("全：5問");
  });
});
