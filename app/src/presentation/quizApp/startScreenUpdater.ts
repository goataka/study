/**
 * スタート画面の統計エリア・「履修済にする」ボタン・パネルタブのコンテンツ更新ヘルパー。
 *
 * 全体統計（全N問 / 学習中 / 学習済）の表示と、現在の活性パネルタブに応じた
 * 関連パネル（履歴・問題一覧・解説・総合サマリ）の再描画を担う。
 */

import type { QuizUseCase, QuizFilter, QuizRecord } from "../../application/quizUseCase";
import type { PanelTab } from "./tabsBuilder";

export type { PanelTab };

/** updateStartScreen に渡すパラメータ。 */
export interface UpdateStartScreenParams {
  useCase: QuizUseCase;
  filter: QuizFilter;
  effectiveFilter: QuizFilter;
  activePanelTab: PanelTab;
  hasSelectedUnit: boolean;
  /** 全件履歴。省略時は呼び出し元で内部取得する想定（呼び元が責任を持つ）。 */
  allRecords?: QuizRecord[];
  /** 「現在のカテゴリは学習済み」かを判定するクロージャ。 */
  isCurrentCategoryLearned: () => boolean;
  /** 関連サブパネル更新の副作用群。 */
  updateQuizPanelVisibility: () => void;
  renderHistoryList: (filter: QuizFilter, allRecords?: QuizRecord[]) => void;
  renderQuestionList: () => void;
  updateGuidePanelContent: () => void;
  renderOverallSummaryPanel: (allRecords?: QuizRecord[]) => void;
}

/**
 * スタート画面の統計エリアと関連パネルを更新する。
 */
export function updateStartScreen(params: UpdateStartScreenParams): void {
  params.updateQuizPanelVisibility();
  const statsInfo = document.getElementById("statsInfo");
  const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement | null;
  if (!statsInfo) return;

  const { useCase, effectiveFilter } = params;
  const filteredQuestions = useCase.getFilteredQuestions(effectiveFilter);
  const filteredCount = filteredQuestions.length;
  const masteredIdsSet = new Set(useCase.getMasteredIds());
  const masteredInFilter = filteredQuestions.filter((q) => masteredIdsSet.has(q.id)).length;
  // 学習中: 1回以上回答済みで未習得の問題（イシュー要件: 1回以上回答で学習済みになっていないもの）
  const inProgressInFilter = filteredQuestions.filter((q) => {
    return useCase.getQuestionStat(q.id).total > 0 && !masteredIdsSet.has(q.id);
  }).length;

  statsInfo.textContent = `学習中：${inProgressInFilter}問 / 学習済：${masteredInFilter}問 / 全：${filteredCount}問`;

  // 特定カテゴリが選択されている場合のみ「履修済にする」ボタンを有効化
  if (markLearnedBtn) {
    markLearnedBtn.disabled = effectiveFilter.category === "all";
    markLearnedBtn.textContent = params.isCurrentCategoryLearned() ? "↩ 未学習に戻す" : "✅ 履修済にする";
  }

  params.renderHistoryList(effectiveFilter, params.allRecords);
  if (params.activePanelTab === "questions") {
    params.renderQuestionList();
  }
  if (params.activePanelTab === "guide") {
    params.updateGuidePanelContent();
  }
  if (params.filter.subject === "all") {
    if (params.hasSelectedUnit) {
      // 総合タブで単元選択中: 解説コンテンツを更新する
      params.updateGuidePanelContent();
    } else {
      params.renderOverallSummaryPanel(params.allRecords);
    }
  }
}

/**
 * 管理タブへ遷移する。教科タブを `admin` に切り替え、フィルターをリセットする。
 *
 * @returns 遷移後にカテゴリリスト・スタート画面を再描画する必要がある場合 true
 */
export function navigateToAdmin(filter: QuizFilter): boolean {
  const tabsContainer = document.querySelector(".subject-tabs");
  if (!tabsContainer) return false;

  filter.subject = "admin";
  filter.category = "all";
  filter.parentCategory = undefined;

  tabsContainer.querySelectorAll(".subject-tab").forEach((t) => {
    t.classList.remove("active");
    (t as HTMLElement).setAttribute("aria-selected", "false");
  });
  // 管理タブを非表示にしている場合も含め、data-subject="admin" のタブをアクティブに
  const adminTab = tabsContainer.querySelector('.subject-tab[data-subject="admin"]') as HTMLElement | null;
  if (adminTab) {
    adminTab.classList.add("active");
    adminTab.setAttribute("aria-selected", "true");
  }
  return true;
}

/**
 * サポートモードへ遷移する。
 * `filter.subject` を "support" に設定し、サポートパネルを表示する準備をする。
 */
export function navigateToSupport(filter: QuizFilter): void {
  filter.subject = "support";
  filter.category = "all";
  filter.parentCategory = undefined;
}
