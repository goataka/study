/**
 * 履歴一覧パネルのレンダラー（React 版）。
 *
 * 旧版（`document.createElement` で構築する命令的版）から `HistoryList` React
 * コンポーネント + `renderReactInto` のブリッジに置き換えた。
 * 公開 API（関数名・引数）と生成される DOM 構造（class/id）は維持している。
 */

import type { QuizFilter, QuizRecord, QuizUseCase } from "../../application/quizUseCase";
import { HistoryList } from "./HistoryList";
import { renderReactInto } from "./reactMount";

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

  renderReactInto(
    historyList,
    <HistoryList
      records={records}
      useCase={useCase}
      emptyMessage="まだ回答記録がありません。クイズを解いてみましょう！"
      emptyClassName="history-empty"
    />,
  );
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
