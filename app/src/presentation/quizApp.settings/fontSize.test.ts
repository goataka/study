/**
 * QuizApp — フォントサイズ切替仕様
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

describe("QuizApp — フォントサイズ切替仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
    // body クラスを初期化する
    document.body.classList.remove("font-size-medium", "font-size-large");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時にlocalStorageに保存値がなければ bodyにフォントサイズクラスが付かない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("localStorageに medium が保存されていれば初期化時に body.font-size-medium が付く", async () => {
    localStorage.setItem("fontSizeLevel", "medium");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("localStorageに large が保存されていれば初期化時に body.font-size-large が付く", async () => {
    localStorage.setItem("fontSizeLevel", "large");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("初期化時にlocalStorageへの書き戻しが発生しない（localStorageに保存値がない場合）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(localStorage.getItem("fontSizeLevel")).toBeNull();
  });

  it("初期化時にlocalStorageへの書き戻しが発生しない（medium が保存されている場合）", async () => {
    localStorage.setItem("fontSizeLevel", "medium");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 初期復元で書き戻しが起きていないことを確認（値は変わらず medium のまま）
    expect(localStorage.getItem("fontSizeLevel")).toBe("medium");
  });

  it("「中」ボタンをクリックするとbody.font-size-mediumが付く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("「大」ボタンをクリックするとbody.font-size-largeが付く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("「小」ボタンをクリックするとフォントサイズクラスが除去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // まず大きいサイズに変更
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    // 小に戻す
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("「中」ボタンクリック後にaria-pressed属性が正しく更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    mediumBtn.click();
    expect(mediumBtn.getAttribute("aria-pressed")).toBe("true");
    expect(smallBtn.getAttribute("aria-pressed")).toBe("false");
    expect(largeBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("「中」ボタンクリック後にlocalStorageに medium が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("medium");
  });

  it("「大」ボタンクリック後にlocalStorageに large が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("large");
  });

  it("「小」ボタンクリック後にlocalStorageに small が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    smallBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("small");
  });

  it("フォントサイズ変更時にlocalStorageに値が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();

    expect(localStorage.getItem("fontSizeLevel")).toBe("large");
  });
});
