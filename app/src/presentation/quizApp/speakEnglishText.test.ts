// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../../application/quizUseCase";
import { canSpeakEnglishQuestion, extractSpeechText, speakEnglishQuestionText } from "./speakEnglishText";

describe("speakEnglishText 関数", () => {
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
    const question: Question = {
      subject: "english",
      subjectName: "英語",
      category: "alphabet",
      categoryName: "アルファベット",
      id: "q1",
      question: "apple",
      choices: ["a", "b", "c", "d"],
      correct: 0,
      explanation: "x",
    };
    expect(canSpeakEnglishQuestion(question)).toBe(true);
  });

  it("英語以外の問題では読み上げ不可", () => {
    const question: Question = {
      subject: "math",
      subjectName: "数学",
      category: "calc",
      categoryName: "計算",
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

  it("「」で囲まれた部分だけを抽出できる", () => {
    expect(extractSpeechText("「A」の読み方は？")).toBe("A");
  });

  it("バッククォートで囲まれた部分だけを抽出できる", () => {
    expect(extractSpeechText("次の単語 `banana` を読もう")).toBe("banana");
  });

  it("末尾ヒント括弧を除去して抽出できる", () => {
    expect(extractSpeechText("cat (ねこ)")).toBe("cat");
  });
});
