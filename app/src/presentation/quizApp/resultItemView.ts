/**
 * クイズ結果画面の各問題エントリ（result-item）の DOM ビルダー。
 * 純粋な DOM 操作関数で、QuizApp の状態には依存しない。
 */

import type { AnswerResult } from "../../application/quizUseCase";

/**
 * 1問分の結果アイテム要素を構築する。
 *
 * 構造:
 * ```
 * .result-item.{correct|incorrect}
 *   .result-header   ( ✓/✗ アイコン + 問題文 + あなたの解答 )
 *   .result-answer   ( 正解 + .explanation )
 * ```
 */
export function buildResultItem(r: AnswerResult): HTMLElement {
  const { question, userAnswerIndex, isCorrect } = r;
  const div = document.createElement("div");
  div.className = `result-item ${isCorrect ? "correct" : "incorrect"}`;

  const header = document.createElement("div");
  header.className = "result-header";

  const icon = document.createElement("span");
  icon.className = "result-icon";
  icon.textContent = isCorrect ? "✓" : "✗";

  const questionText = document.createElement("span");
  questionText.className = "result-question";
  questionText.textContent = question.question;

  // あなたの解答を問題と同じ行の右側に表示する
  const userAnswerInline = document.createElement("span");
  userAnswerInline.className = "result-user-answer";
  const userAnswerLabel = document.createTextNode("あなた: ");
  const userAnswerValue = document.createElement("strong");
  if (question.questionType === "text-input") {
    userAnswerValue.textContent = r.userAnswerText ?? "（未入力）";
  } else {
    userAnswerValue.textContent = question.choices[userAnswerIndex] ?? "未回答";
  }
  userAnswerInline.appendChild(userAnswerLabel);
  userAnswerInline.appendChild(userAnswerValue);

  header.appendChild(icon);
  header.appendChild(questionText);
  header.appendChild(userAnswerInline);

  const answer = document.createElement("div");
  answer.className = "result-answer";

  const correctDiv = document.createElement("div");
  correctDiv.appendChild(document.createTextNode("正解: "));
  const correctValue = document.createElement("strong");
  correctValue.textContent = question.choices[question.correct] ?? "";
  correctDiv.appendChild(correctValue);
  answer.appendChild(correctDiv);

  const explanation = document.createElement("div");
  explanation.className = "explanation";
  explanation.textContent = question.explanation;
  answer.appendChild(explanation);

  div.appendChild(header);
  div.appendChild(answer);
  return div;
}
