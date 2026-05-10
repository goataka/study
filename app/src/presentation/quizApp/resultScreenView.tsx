/**
 * クイズ結果画面（`#resultScreen`）のスコア・メッセージ・解答一覧を描画するヘルパー。
 */

import type { AnswerResult } from "../../application/quizUseCase";
import { ResultDetailsList } from "./ResultDetailsList";
import { renderReactInto } from "./reactMount";
import { scoreCircle } from "../styles/scoreCircleStyles";

/**
 * 結果画面の本文（単元名・メッセージ・スコア円・解答一覧）を描画する。
 * 画面切り替えや「全問学習済み」判定は呼び出し元の責務。
 */
export function renderResultScreenContent(results: AnswerResult[]): void {
  const correctCount = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  renderResultUnitName(results);
  renderResultMessage(percentage);
  renderScoreDisplay(correctCount, total, percentage);
  renderResultDetails(results);

  // 回答完了後にスクロール位置をトップに戻す
  const resultScreen = document.getElementById("resultScreen");
  if (resultScreen) resultScreen.scrollTop = 0;
}

function renderResultUnitName(results: AnswerResult[]): void {
  const resultUnitName = document.getElementById("resultUnitName");
  if (!resultUnitName) return;
  const firstResult = results[0];
  if (firstResult) {
    const q = firstResult.question;
    const parts: string[] = [];
    if (q.subjectName) parts.push(q.subjectName);
    if (q.topCategoryName) parts.push(q.topCategoryName);
    if (q.parentCategoryName) parts.push(q.parentCategoryName);
    if (q.categoryName) parts.push(q.categoryName);
    if (parts.length > 0) {
      resultUnitName.textContent = parts.join(" › ");
      resultUnitName.classList.remove("hidden");
    } else {
      resultUnitName.textContent = "";
      resultUnitName.classList.add("hidden");
    }
  } else {
    resultUnitName.textContent = "";
    resultUnitName.classList.add("hidden");
  }
}

function renderResultMessage(percentage: number): void {
  const resultMessage = document.getElementById("resultMessage");
  if (!resultMessage) return;
  resultMessage.textContent =
    percentage === 100
      ? "🌟 満点！すごい！"
      : percentage >= 80
        ? "🎉 よくできました！"
        : percentage >= 60
          ? "😊 もう少し！次はきっとできる！"
          : "💪 がんばれ！次は必ず正解できます！";
}

function renderScoreDisplay(correctCount: number, total: number, percentage: number): void {
  const scoreDisplay = document.getElementById("scoreDisplay");
  if (!scoreDisplay) return;
  const isPerfect = total > 0 && correctCount === total;
  const result: "perfect" | "pass" | "fail" = isPerfect ? "perfect" : percentage >= 70 ? "pass" : "fail";
  const circleClass = scoreCircle({ result });
  // `score-percentage` クラス名は `10-responsive-base.css` の
  // `@media (max-width: 600px)` 内で font-size を上書きするため残置。
  scoreDisplay.innerHTML = `
        <div class="${circleClass}">
          ${isPerfect ? '<div class="score-perfect-icon mb-1 text-[38px]">✅</div>' : ""}
          <div class="score-percentage mb-2.5 text-[50px] font-bold">${percentage}%</div>
          <div class="text-lg">${correctCount} / ${total} 正解</div>
        </div>
      `;
}

function renderResultDetails(results: AnswerResult[]): void {
  const resultDetails = document.getElementById("resultDetails");
  if (!resultDetails) return;
  renderReactInto(resultDetails, <ResultDetailsList results={results} />);
}
