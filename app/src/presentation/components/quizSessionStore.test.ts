// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { QuizSession } from "../../domain/quizSession";
import { clearQuizSessionStore, getQuizSessionSnapshot, syncQuizSessionStore } from "./quizSessionStore";

describe("quizSessionStore", () => {
  it("未回答時はフィードバック非表示で next が無効になる", () => {
    clearQuizSessionStore();
    const session = new QuizSession([
      {
        id: "q1",
        subject: "english",
        category: "c1",
        question: "Q1",
        choices: ["A", "B", "C", "D"],
        correct: 0,
        explanation: "E1",
      },
      {
        id: "q2",
        subject: "english",
        category: "c1",
        question: "Q2",
        choices: ["A", "B", "C", "D"],
        correct: 0,
        explanation: "E2",
      },
    ]);

    syncQuizSessionStore(session, { kanjiAvailable: true });
    const snapshot = getQuizSessionSnapshot();
    expect(snapshot.questionNumberText).toBe("問題 1 / 2");
    expect(snapshot.answerFeedback.visible).toBe(false);
    expect(snapshot.nextDisabled).toBe(true);
  });

  it("回答後はフィードバック表示・正誤状態を反映する", () => {
    clearQuizSessionStore();
    const session = new QuizSession([
      {
        id: "q1",
        subject: "english",
        category: "c1",
        question: "Q1",
        choices: ["A", "B", "C", "D"],
        correct: 0,
        explanation: "E1",
      },
    ]);
    session.selectAnswer(0, session.currentQuestion.correct);

    syncQuizSessionStore(session, { kanjiAvailable: false });
    const snapshot = getQuizSessionSnapshot();
    expect(snapshot.answerFeedback.visible).toBe(true);
    expect(snapshot.answerFeedback.isCorrect).toBe(true);
    expect(snapshot.submitHidden).toBe(false);
    expect(snapshot.submitDisabled).toBe(false);
  });
});
