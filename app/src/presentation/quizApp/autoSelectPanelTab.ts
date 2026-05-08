/**
 * 解答履歴の有無や選択レベルに応じてパネルタブを自動選択するロジック。
 *
 * 純粋関数として「次に表示すべきタブ ID」を計算する。実際の DOM 反映は呼び出し側に委ねる。
 */

import type { QuizFilter, QuizRecord } from "../../application/quizUseCase";
import type { PanelTab } from "./tabsBuilder";

/** パネルタブ自動選択に必要な状態。 */
export interface AutoSelectPanelTabParams {
  /** ユーザーが明示的にタブを選択していれば true（その場合は自動選択をスキップ）。 */
  isPanelTabUserSelected: boolean;
  /** 現在のパネルタブ。ユーザー選択中の場合はこれをそのまま返す。 */
  activePanelTab: PanelTab;
  /** 単元コンテキスト（総合タブから単元選択中なら非 null）。 */
  selectedUnitContext: { subject: string; categoryId: string } | null;
  /** 教科タブでの選択レベル。 */
  selectionLevel: "none" | "topCategory" | "parentCategory" | "unit";
  filter: QuizFilter;
}

/**
 * 履歴と選択状態から次のパネルタブを決定する。
 *
 * - ユーザーが明示的に選択中: そのまま返す
 * - 総合タブ単元選択時: 履歴あれば quiz、なければ guide
 * - 教科タブで topCategory/parentCategory 選択: guide
 * - 教科タブで unit 選択: 履歴あれば quiz、なければ guide
 * - 未選択: quiz
 */
export function selectNextPanelTab(allRecords: QuizRecord[], params: AutoSelectPanelTabParams): PanelTab {
  if (params.isPanelTabUserSelected) {
    return params.activePanelTab;
  }
  // 総合タブから単元選択時: 履歴があれば確認タブ、なければ解説タブ
  if (params.selectedUnitContext !== null) {
    const ctx = params.selectedUnitContext;
    const hasHistory = allRecords.some((r) => r.subject === ctx.subject && r.category === ctx.categoryId);
    return hasHistory ? "quiz" : "guide";
  }
  if (params.selectionLevel === "topCategory" || params.selectionLevel === "parentCategory") {
    // カテゴリ/サブカテゴリ選択時は常に解説タブを表示
    return "guide";
  }
  if (params.selectionLevel === "unit") {
    const hasHistory = allRecords.some(
      (r) => r.subject === params.filter.subject && r.category === params.filter.category,
    );
    return hasHistory ? "quiz" : "guide";
  }
  return "quiz";
}
