/**
 * 履歴一覧パネルのレンダラー。
 *
 * `quizApp.ts` から切り出された純粋な DOM 操作関数。
 * QuizApp の状態には依存せず、フィルター・ユースケース・履歴配列を引数で受け取る。
 */

import type { QuizFilter, QuizRecord, QuizUseCase } from "../../application/quizUseCase";
import { buildHistoryItem } from "../historyItemView";

/**
 * 履歴一覧（`#historyList`）を描画する。
 * フィルターに合致するレコードを日付の降順で並べて表示する。
 *
 * @param filter   フィルター（subject/category）
 * @param useCase  ユースケース。履歴取得と教科表示判定に使用
 * @param allRecords 呼び出し元で取得済みの履歴配列（省略時は内部で取得）
 */
export function renderHistoryList(filter: QuizFilter, useCase: QuizUseCase, allRecords?: QuizRecord[]): void {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  const records = (allRecords ?? useCase.getHistory())
    .filter((r) => matchesRecordFilterIncludingAllCategory(r, filter, useCase))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  historyList.innerHTML = "";

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "まだ回答記録がありません。クイズを解いてみましょう！";
    historyList.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    historyList.appendChild(buildHistoryItem(record, useCase));
  });
}

function matchesRecordFilterIncludingAllCategory(
  record: QuizRecord,
  filter: QuizFilter,
  useCase: QuizUseCase,
): boolean {
  if (filter.subject !== "all" && record.subject !== filter.subject) return false;
  if (filter.category === "all") return true;
  if (record.category === filter.category) return true;
  if (record.category !== "all") return false;
  return record.entries.some((entry) => useCase.getQuestionById(entry.questionId)?.category === filter.category);
}
