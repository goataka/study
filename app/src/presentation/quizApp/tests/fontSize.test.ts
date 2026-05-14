/**
 * QuizApp — フォントサイズ切替仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  setupFetchMockWithParent,
  mockQuestionFile,
  setupMinimalDom,
  StubProgressRepository,
} from "../testHelpers";

describe("QuizApp — フォントサイズ切替仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    // body クラスを初期化する
    document.body.classList.remove("font-size-medium", "font-size-large");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時に保存値がなければ bodyにフォントサイズクラスが付かない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("medium が保存されていれば初期化時に body.font-size-medium が付く", async () => {
    const repo = new StubProgressRepository();
    repo.saveFontSizeLevel("medium");
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("large が保存されていれば初期化時に body.font-size-large が付く", async () => {
    const repo = new StubProgressRepository();
    repo.saveFontSizeLevel("large");
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("初期化時に fontSizeLevel の書き戻しが発生しない（保存値がない場合）", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(repo.loadFontSizeLevel()).toBeNull();
  });

  it("初期化時に fontSizeLevel の書き戻しが発生しない（medium が保存されている場合）", async () => {
    const repo = new StubProgressRepository();
    repo.saveFontSizeLevel("medium");
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 初期復元で書き戻しが起きていないことを確認（値は変わらず medium のまま）
    expect(repo.loadFontSizeLevel()).toBe("medium");
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

  it("「中」ボタンクリック後に medium が永続化される", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(repo.loadFontSizeLevel()).toBe("medium");
  });

  it("「大」ボタンクリック後に large が永続化される", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(repo.loadFontSizeLevel()).toBe("large");
  });

  it("「小」ボタンクリック後に small が永続化される", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    smallBtn.click();
    expect(repo.loadFontSizeLevel()).toBe("small");
  });

  it("フォントサイズ変更時に値が永続化される", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();

    expect(repo.loadFontSizeLevel()).toBe("large");
  });
});
