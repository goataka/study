/**
 * QuizApp — URLフラグメント連動仕様
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
} from "../quizApp.testHelpers";

describe("QuizApp — URLフラグメント連動仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("URLフラグメントで単元と表示パネルを指定して初期表示できる", async () => {
    window.history.replaceState({}, "", "/#subject=english&category=phonics-1&panel=guide");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeSubject = document.querySelector('.subject-tab.active[data-subject="english"]');
    const activeCategory = document.querySelector('.category-item.active[data-category="phonics-1"]');
    const activePanel = document.querySelector('.panel-tab.active[data-panel="guide"]');
    expect(activeSubject).not.toBeNull();
    expect(activeCategory).not.toBeNull();
    expect(activePanel).not.toBeNull();
  });

  it("URLフラグメントのpanelが不正値でも既定の表示タブを維持する", async () => {
    window.history.replaceState({}, "", "/#subject=english&category=all&panel=invalid");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activePanel = document.querySelector(".panel-tab.active");
    expect(activePanel?.getAttribute("data-panel")).toBe("quiz");
  });
});
