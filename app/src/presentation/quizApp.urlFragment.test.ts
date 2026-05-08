// @vitest-environment jsdom

/**
 * QuizApp プレゼンテーション層 — URL フラグメント同期仕様テスト
 *
 * 教科タブ・パネルタブ・単元の状態変更時に `window.location.hash` が更新されること、
 * `replaceState` が使われ履歴スタックに余分なエントリを残さないことを検証する。
 */

import { QuizApp } from "./quizApp";
import { setupTabDom, setupFetchMock } from "./quizApp.testHelpers";

describe("QuizApp — URL フラグメント同期仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("初期化直後は screen=start がフラグメントに含まれない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // selectFirstUnlearnedCategory 等で subject/category が書き換わる可能性があるため、
    // 既定状態である `screen=start` が含まれないことのみ検証する
    expect(window.location.hash).not.toContain("screen=start");
  });

  it("教科タブをクリックするとフラグメントに subject が反映される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    expect(window.location.hash).toContain("subject=english");
  });

  it("単元アイテムをクリックするとフラグメントに category が反映される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    expect(window.location.hash).toContain("category=phonics-1");
    expect(window.location.hash).toContain("subject=english");
  });

  it("パネルタブをクリックするとフラグメントに panel が反映される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const guideTab = document.getElementById("panelTab-guide");
    guideTab?.click();

    expect(window.location.hash).toContain("panel=guide");
  });

  it("screen=start はフラグメントに含めない（初期状態と同じため）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    expect(window.location.hash).not.toContain("screen=start");
  });

  it("教科タブ切替で履歴スタックが増えない（pushState ではなく replaceState を使用）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // フラグメント同期は replaceState のみを使用し、pushState を呼ばないことを検証する
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const pushSpy = vi.spyOn(window.history, "pushState");

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    expect(replaceSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("URL フラグメントに subject/category/panel を指定して起動すると状態が復元される", async () => {
    window.history.replaceState({}, "", "/#subject=english&category=phonics-1&panel=guide");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    expect(englishTab?.classList.contains("active")).toBe(true);

    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(false);
  });
});
