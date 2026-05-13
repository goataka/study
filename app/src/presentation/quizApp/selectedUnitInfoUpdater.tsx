/**
 * 「選択中の単元情報」パネル（`#selectedUnitInfo`）の更新ヘルパー（React 版）。
 *
 * 選択レベル（unit / parentCategory / topCategory / 学年グループ）に応じて
 * 対応する詳細サマリ（タイトル・カテゴリ・例文・進捗バー＋閉じるボタン）を
 * `selectedUnitInfoContentStore` 経由で `SelectedUnitInfoPanel` に描画する。
 * クイズ画面用の表示専用コンテンツは `quizUnitInfoContentStore` に設定する。
 */

import * as React from "react";
import type { QuizUseCase, QuizFilter } from "../../application/quizUseCase";
import {
  SelectedUnitInfoPanel,
  SelectedUnitInfoBody,
  SelectedUnitInfoSimpleBody,
} from "../components/SelectedUnitInfoPanel";
import type { SelectedUnitInfoViewModel } from "../components/SelectedUnitInfoPanel";
import {
  buildSingleUnitViewModel,
  buildGradeGroupViewModel,
  buildCategoryOrTopViewModel,
} from "./selectedUnitInfoViewModel";
import { selectedUnitInfoContentStore } from "../components/selectedUnitInfoContentStore";
import { quizUnitInfoContentStore } from "../components/quizUnitInfoContentStore";

/** 選択中の単元コンテキスト（総合タブから単元選択中の場合に使われる）。 */
export interface SelectedUnitContext {
  subject: string;
  categoryId: string;
  categoryName: string;
}

/** updateSelectedUnitInfo に渡すパラメータ群。 */
export interface UpdateSelectedUnitInfoParams {
  useCase: QuizUseCase;
  filter: QuizFilter;
  selectionLevel: "none" | "topCategory" | "parentCategory" | "unit";
  /** 総合タブから単元を選択した際のコンテキスト。 */
  selectedUnitContext: SelectedUnitContext | null;
  /** 教科タブのカテゴリビュー（"category" or "grade"）。 */
  categoryViewMode: "category" | "grade";
  /** 学年別ビューで選択中の学年グループ ID。 */
  selectedGradeGroup: string | null;
  /** トップカテゴリ選択中の ID。 */
  selectedTopCategoryId: string | null;
  /** 「単元の解説を閉じる」（総合タブから単元選択時）の閉じるハンドラ。 */
  onCloseOverallUnitView: () => void;
  /** 「選択を解除して閉じる」の閉じるハンドラ。 */
  onDeselect: () => void;
}

/**
 * 「選択中の単元情報」パネルを更新する。
 */
export function updateSelectedUnitInfo(params: UpdateSelectedUnitInfoParams): void {
  const container = document.getElementById("selectedUnitInfo");
  const { useCase, filter, selectionLevel, selectedUnitContext, categoryViewMode, selectedGradeGroup } = params;
  const categoryListEl = document.getElementById("categoryList");

  // 総合タブから単元が選択されている場合: 教科の画面と同じ形式で詳細を表示
  if (selectedUnitContext !== null) {
    const { subject, categoryId, categoryName } = selectedUnitContext;
    const vm = buildSingleUnitViewModel({
      useCase,
      subject,
      categoryId,
      categoryName,
      closeAriaLabel: "単元の解説を閉じる",
      onClose: params.onCloseOverallUnitView,
    });
    showPanel(container, categoryListEl, <SelectedUnitInfoPanel vm={vm} />, vm);
    return;
  }

  if (categoryViewMode === "grade" && selectedGradeGroup !== null && filter.subject !== "all") {
    const vm = buildGradeGroupViewModel({
      useCase,
      subject: filter.subject,
      grade: selectedGradeGroup,
      onDeselect: params.onDeselect,
    });
    showPanel(container, categoryListEl, <SelectedUnitInfoPanel vm={vm} />, vm);
    return;
  }

  if (selectionLevel === "none" || filter.subject === "all") {
    container?.classList.add("hidden");
    categoryListEl?.classList.remove("detail-active");
    quizUnitInfoContentStore.reset();
    return;
  }

  if (selectionLevel === "unit") {
    const cats = useCase.getCategoriesForSubject(filter.subject);
    const name = cats[filter.category] ?? filter.category;
    const vm = buildSingleUnitViewModel({
      useCase,
      subject: filter.subject,
      categoryId: filter.category,
      categoryName: name,
      closeAriaLabel: "選択を解除して閉じる",
      onClose: params.onDeselect,
    });
    showPanel(container, categoryListEl, <SelectedUnitInfoPanel vm={vm} />, vm);
    return;
  }

  const vm = buildCategoryOrTopViewModel({
    useCase,
    filter,
    selectionLevel,
    selectedTopCategoryId: params.selectedTopCategoryId,
    onDeselect: params.onDeselect,
  });
  showPanel(container, categoryListEl, <SelectedUnitInfoPanel vm={vm} />, vm);
}

/** パネルを表示し、関連する class 属性を同期する共通処理。 */
function showPanel(
  container: HTMLElement | null,
  categoryListEl: HTMLElement | null,
  element: React.ReactElement,
  vm: SelectedUnitInfoViewModel,
): void {
  container?.classList.remove("hidden");
  selectedUnitInfoContentStore.set(element);
  categoryListEl?.classList.add("detail-active");
  // クイズ画面用：閉じるボタンなしの表示専用コンテンツを設定
  const quizElement =
    vm.kind === "full" ? <SelectedUnitInfoBody data={vm.data} /> : <SelectedUnitInfoSimpleBody name={vm.name} />;
  quizUnitInfoContentStore.set(quizElement);
}
