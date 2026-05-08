/**
 * クイズ画面下部のナビゲーションボタン（前へ・次へ・採点）の表示更新ヘルパー。
 */

import type { QuizSession } from "../../domain/quizSession";

/**
 * 現在のセッション状態に応じて前へ／次へ／採点ボタンの表示・活性状態を更新する。
 */
export function updateNavigationButtons(session: QuizSession): void {
  const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
  const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
  const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
  const isLast = session.currentIndex === session.totalCount - 1;

  prevBtn.disabled = session.currentIndex === 0;

  if (isLast) {
    nextBtn.classList.add("hidden");
    submitBtn.classList.remove("hidden");
    submitBtn.disabled = !session.canSubmit();
  } else {
    nextBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
    nextBtn.disabled = session.getAnswer(session.currentIndex) === undefined;
  }
}
