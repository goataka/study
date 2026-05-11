/**
 * 履歴一覧パネルのレンダラー。
 *
 * `historyListContentStore` を通じて React ツリーに描画する。
 * 生成される DOM 構造（class/id）は他のビューと統一されている。
 */

import type { QuizFilter, QuizRecord, QuizUseCase } from "../../application/quizUseCase";
import { HistoryList } from "./HistoryList";
import { historyListContentStore } from "../components/historyListContentStore";

/**
 * 履歴一覧（`#historyList`）を描画する。
 * フィルターに合致するレコードを日付の降順で並べて表示する。
 *
 * @param filter   フィルター（subject/category）
 * @param useCase  ユースケース。履歴取得と教科表示判定に使用
 * @param allRecords 呼び出し元で取得済みの履歴配列（省略時は内部で取得）
 */
export function renderHistoryList(filter: QuizFilter, useCase: QuizUseCase, allRecords?: QuizRecord[]): void {
  const records = (allRecords ?? useCase.getHistory())
    .filter((r) => matchesRecordFilterIncludingAllCategory(r, filter, useCase))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  historyListContentStore.set(
    <HistoryList
      records={records}
      useCase={useCase}
      emptyMessage="まだ回答記録がありません。クイズを解いてみましょう！"
      emptyClassName="history-empty py-10 px-5 text-center text-[17px] text-[#586069]"
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
