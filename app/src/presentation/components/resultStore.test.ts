// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { getResultSnapshot, setResults, subscribeResultStore } from "./resultStore";

describe("resultStore", () => {
  it("setResults で結果を保持する", () => {
    const results = [
      {
        question: {
          id: "q1",
          subject: "english",
          category: "c1",
          question: "Q",
          choices: ["A", "B"],
          correct: 0,
          explanation: "E",
        },
        userAnswerIndex: 0,
        isCorrect: true,
      },
    ] as any;
    setResults(results);
    expect(getResultSnapshot()).toEqual(results);
  });

  it("更新時に購読者へ通知する", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeResultStore(listener);
    setResults(null);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
