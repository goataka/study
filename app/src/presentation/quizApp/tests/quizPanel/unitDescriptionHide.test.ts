/**
 * QuizApp — 確認タブの単元説明非表示仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  mockQuestionFile,
} from "../../../quizApp.testHelpers";

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
