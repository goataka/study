/**
 * QuizApp — 読み上げボタン仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { setupFetchMock, setupMinimalDom } from "./testHelpers";

describe("QuizApp — 読み上げボタン仕様", () => {
  let speechSynthesisMock: {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();

    speechSynthesisMock = {
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: speechSynthesisMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function startQuiz(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();
  }

  it("問題画面の読み上げボタンは常に非表示のまま", async () => {
    await startQuiz();
    const btn = document.getElementById("speakBtn");
    expect(btn).not.toBeNull();
    expect(btn?.classList.contains("hidden")).toBe(true);
    btn?.dispatchEvent(new MouseEvent("click"));
    expect(speechSynthesisMock.cancel).not.toHaveBeenCalled();
    expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
  });

  it("speechSynthesis が利用できない場合は読み上げボタンが非表示になる", async () => {
    Object.defineProperty(window, "speechSynthesis", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    await startQuiz();
    const btn = document.getElementById("speakBtn");
    expect(btn?.classList.contains("hidden")).toBe(true);
  });
});
