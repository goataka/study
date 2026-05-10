/**
 * 回答フィードバック表示ヘルパー。
 *
 * 解答後の正誤メッセージと解説を `#answerFeedback` 配下に表示する純粋な DOM 関数。
 */

import type { Question } from "../../application/quizUseCase";

/**
 * 回答フィードバック（正誤メッセージ＋解説）を表示する。
 * @param question         問題
 * @param userAnswerIndex  ユーザーが選択した選択肢のインデックス
 * @param userAnswerText   テキスト入力問題における入力テキスト（任意）
 */
export function showAnswerFeedback(question: Question, userAnswerIndex: number, userAnswerText?: string): void {
  const feedbackDiv = document.getElementById("answerFeedback");
  if (!feedbackDiv) return;

  const isCorrect = question.correct === userAnswerIndex;
  const resultDiv = document.getElementById("feedbackResult");
  const explanationDiv = document.getElementById("feedbackExplanation");

  if (resultDiv) {
    if (isCorrect) {
      resultDiv.textContent = "✅ 正解です！";
    } else if (question.questionType === "text-input") {
      const correctAnswer = question.choices[question.correct] ?? "";
      const typed = userAnswerText ?? "";
      resultDiv.textContent = typed
        ? `❌ 不正解です。あなたの解答「${typed}」→ 正解は「${correctAnswer}」`
        : `❌ 不正解です。正解は「${correctAnswer}」`;
    } else {
      const correctAnswer = question.choices[question.correct];
      resultDiv.textContent = `❌ 不正解です。正解は「${correctAnswer}」です。`;
    }
  }

  if (explanationDiv) {
    explanationDiv.textContent = question.explanation;
  }

  feedbackDiv.classList.remove("hidden");
  feedbackDiv.classList.toggle("correct", isCorrect);
  feedbackDiv.classList.toggle("incorrect", !isCorrect);
}

/** 回答フィードバックを隠す。 */
export function hideAnswerFeedback(): void {
  const feedbackDiv = document.getElementById("answerFeedback");
  if (feedbackDiv) {
    feedbackDiv.classList.add("hidden");
  }
}
