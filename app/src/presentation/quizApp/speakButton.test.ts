/**
 * QuizApp — 読み上げボタン仕様
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

describe("QuizApp — 読み上げボタン仕様", () => {
  let speechSynthesisMock: {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();

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

  it("英語の問題では読み上げボタンが表示される", async () => {
    await startQuiz();
    const btn = document.getElementById("speakBtn");
    expect(btn?.classList.contains("hidden")).toBe(false);
  });

  it("読み上げボタンをクリックすると speechSynthesis.speak が呼ばれる", async () => {
    await startQuiz();
    const btn = document.getElementById("speakBtn") as HTMLButtonElement;
    btn.click();
    expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1);
    const utterance = speechSynthesisMock.speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.lang).toBe("en-US");
  });

  it("「〜の読み方は？」形式では引用された英字だけを読み上げる", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/alphabet.json"],
    };
    const alphabetFile = {
      subject: "english",
      subjectName: "英語",
      category: "alphabet",
      categoryName: "アルファベット",
      questions: [
        {
          id: "a1",
          question: "「A」の読み方は？",
          choices: ["エー", "ビー", "シー", "ディー"],
          correct: 0,
          explanation: "A",
        },
      ],
    };
    global.fetch = vi.fn((url: string) => {
      if (String(url).includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(alphabetFile) } as Response);
    });

    await startQuiz();
    (document.getElementById("speakBtn") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1);
    const utterance = speechSynthesisMock.speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe("A");
  });

  it("読み上げボタンをクリックすると cancel → speak の順で呼ばれる", async () => {
    const callOrder: string[] = [];
    speechSynthesisMock.cancel.mockImplementation(() => callOrder.push("cancel"));
    speechSynthesisMock.speak.mockImplementation(() => callOrder.push("speak"));

    await startQuiz();
    const btn = document.getElementById("speakBtn") as HTMLButtonElement;
    btn.click();

    expect(callOrder).toEqual(["cancel", "speak"]);
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
