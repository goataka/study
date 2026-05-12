// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { canSpeakEnglishQuestion, speakEnglishQuestionText } from "./speakEnglishText";

describe("speakEnglishText", () => {
  beforeEach(() => {
    class MockSpeechSynthesisUtterance {
      lang = "";
      constructor(public text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: MockSpeechSynthesisUtterance,
      writable: true,
      configurable: true,
    });
  });

  it("英語問題かつspeech API利用可能なら読み上げ可能", () => {
    Object.defineProperty(window, "speechSynthesis", {
      value: { cancel: vi.fn(), speak: vi.fn() },
      writable: true,
      configurable: true,
    });
    const question = {
      subject: "english",
      id: "q1",
      question: "apple",
      choices: ["a", "b", "c", "d"],
      correct: 0,
      explanation: "x",
    };
    expect(canSpeakEnglishQuestion(question)).toBe(true);
  });

  it("英語以外の問題では読み上げ不可", () => {
    const question = {
      subject: "math",
      id: "q1",
      question: "1+1",
      choices: ["1", "2", "3", "4"],
      correct: 1,
      explanation: "x",
    };
    expect(canSpeakEnglishQuestion(question)).toBe(false);
  });

  it("読み上げ実行時に cancel -> speak を呼ぶ", () => {
    const callOrder: string[] = [];
    const cancel = vi.fn(() => callOrder.push("cancel"));
    const speak = vi.fn(() => callOrder.push("speak"));
    Object.defineProperty(window, "speechSynthesis", {
      value: { cancel, speak },
      writable: true,
      configurable: true,
    });

    speakEnglishQuestionText("  apple  ");

    expect(callOrder).toEqual(["cancel", "speak"]);
    const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.lang).toBe("en-US");
    expect(utterance.text).toBe("apple");
  });
});
