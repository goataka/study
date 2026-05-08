/**
 * カテゴリ・親カテゴリ・トップカテゴリ・学年グループ・単元の選択ハンドラー（純粋関数）。
 *
 * QuizApp 内の選択状態（filter / selectedTopCategoryId / selectedGradeGroup /
 * selectedUnitContext / isPanelTabUserSelected）を、引数で受け取った
 * `SelectionStateAccess` 経由で読み書きする。
 *
 * 各ハンドラーは、状態を更新したあとに `SelectionLifecycleEffects` の
 * 共通ライフサイクル（カテゴリリストのアクティブ更新・パネルタブ自動選択・
 * スタート画面更新・URL 反映）を呼び出す。
 */

import type { QuizFilter, QuizRecord } from "../../application/quizUseCase";

/** 単元選択コンテキスト。 */
export interface SelectedUnitContext {
  subject: string;
  categoryId: string;
  categoryName: string;
}

/** 選択状態への読み書きアクセス。 */
export interface SelectionStateAccess {
  /** 現在のフィルター（オブジェクト参照を直接書き換える）。 */
  filter: QuizFilter;
  getSelectedTopCategoryId: () => string | null;
  setSelectedTopCategoryId: (v: string | null) => void;
  getSelectedGradeGroup: () => string | null;
  setSelectedGradeGroup: (v: string | null) => void;
  setSelectedUnitContext: (v: SelectedUnitContext | null) => void;
  setIsPanelTabUserSelected: (v: boolean) => void;
}

/** 選択変更後に共通で呼び出すライフサイクル。 */
export interface SelectionLifecycleEffects {
  updateCategoryListActive: () => void;
  getHistory: () => QuizRecord[];
  autoSelectPanelTab: (records: QuizRecord[]) => void;
  updateStartScreen: (records?: QuizRecord[]) => void;
  syncURLFragment: () => void;
}

/** 選択レベル取得関数。 */
export type GetSelectionLevel = () => "none" | "topCategory" | "parentCategory" | "unit";

/** トップカテゴリヘッダークリック時の選択／非選択トグル処理。 */
export function handleTopHeaderClick(
  state: SelectionStateAccess,
  effects: Omit<SelectionLifecycleEffects, "syncURLFragment">,
  topCatId: string,
): void {
  if (state.getSelectedTopCategoryId() === topCatId) {
    // 既に選択中 → 非選択に戻す
    state.setSelectedTopCategoryId(null);
  } else {
    // 選択（単元選択・親カテゴリ選択を解除してトップカテゴリを選択）
    state.setSelectedTopCategoryId(topCatId);
    state.filter.category = "all";
    state.filter.parentCategory = undefined;
    state.setSelectedGradeGroup(null);
    state.setSelectedUnitContext(null);
    state.setIsPanelTabUserSelected(false);
  }
  effects.updateCategoryListActive();
  const records = effects.getHistory();
  effects.autoSelectPanelTab(records);
  effects.updateStartScreen(records);
}

/** 親カテゴリヘッダークリック時の選択／非選択トグル処理。 */
export function handleParentHeaderClick(
  state: SelectionStateAccess,
  effects: Omit<SelectionLifecycleEffects, "syncURLFragment">,
  getSelectionLevel: GetSelectionLevel,
  parentCatId: string,
): void {
  if (getSelectionLevel() === "parentCategory" && state.filter.parentCategory === parentCatId) {
    // 既に選択中 → 非選択に戻す
    state.filter.parentCategory = undefined;
  } else {
    // 選択（単元選択・トップカテゴリ選択を解除して親カテゴリを選択）
    state.setSelectedTopCategoryId(null);
    state.filter.category = "all";
    state.filter.parentCategory = parentCatId;
    state.setSelectedGradeGroup(null);
    state.setSelectedUnitContext(null);
    state.setIsPanelTabUserSelected(false);
  }
  effects.updateCategoryListActive();
  const records = effects.getHistory();
  effects.autoSelectPanelTab(records);
  effects.updateStartScreen(records);
}

/** 学年グループヘッダークリック時の選択／非選択トグル処理。 */
export function handleGradeHeaderClick(
  state: SelectionStateAccess,
  effects: Omit<SelectionLifecycleEffects, "syncURLFragment">,
  grade: string,
): void {
  if (state.getSelectedGradeGroup() === grade) {
    state.setSelectedGradeGroup(null);
  } else {
    state.setSelectedGradeGroup(grade);
    state.setSelectedTopCategoryId(null);
    state.filter.parentCategory = undefined;
    state.filter.category = "all";
    state.setSelectedUnitContext(null);
    state.setIsPanelTabUserSelected(false);
  }
  effects.updateCategoryListActive();
  const records = effects.getHistory();
  effects.autoSelectPanelTab(records);
  effects.updateStartScreen(records);
}

/**
 * 選択を完全に解除して UI を更新する共通処理。
 * 閉じるボタンや単元アイテムのトグル（既選択クリック）から呼び出す。
 */
export function deselectAndRefresh(state: SelectionStateAccess, effects: SelectionLifecycleEffects): void {
  state.filter.category = "all";
  state.filter.parentCategory = undefined;
  state.setSelectedTopCategoryId(null);
  state.setSelectedGradeGroup(null);
  state.setIsPanelTabUserSelected(false);
  effects.updateCategoryListActive();
  const records = effects.getHistory();
  effects.autoSelectPanelTab(records);
  effects.updateStartScreen(records);
  effects.syncURLFragment();
}

/**
 * 現在タブを維持したまま単元を選択し、詳細表示を更新する。
 */
export function selectUnitContext(
  state: SelectionStateAccess,
  effects: Pick<
    SelectionLifecycleEffects,
    "getHistory" | "autoSelectPanelTab" | "updateStartScreen" | "syncURLFragment"
  >,
  unit: SelectedUnitContext,
): void {
  state.setSelectedUnitContext(unit);
  state.setIsPanelTabUserSelected(false);
  const records = effects.getHistory();
  effects.autoSelectPanelTab(records);
  effects.updateStartScreen(records);
  effects.syncURLFragment();
}

/**
 * 選択した単元の解説表示を閉じ、単元未選択の一覧画面に戻る。
 */
export function closeOverallUnitView(
  state: SelectionStateAccess,
  effects: Pick<SelectionLifecycleEffects, "getHistory" | "updateStartScreen" | "syncURLFragment">,
): void {
  state.setSelectedUnitContext(null);
  const records = effects.getHistory();
  effects.updateStartScreen(records);
  effects.syncURLFragment();
}

/**
 * スマホ用：単元詳細パネルから単元一覧パネルに戻る。
 * 総合タブ・進度タブでは単元選択のみを解除し、
 * 通常タブでは単元・カテゴリ選択を解除する。
 */
export function navigateBackToList(
  state: SelectionStateAccess,
  effects: Pick<SelectionLifecycleEffects, "getHistory" | "updateStartScreen" | "syncURLFragment">,
): void {
  if (state.filter.subject === "all" || state.filter.subject === "progress") {
    // 総合タブ・進度タブの場合は単元選択を解除する
    state.setSelectedUnitContext(null);
  } else {
    // 通常タブの場合は単元・カテゴリ選択を解除する
    state.filter.category = "all";
    state.filter.parentCategory = undefined;
    state.setSelectedTopCategoryId(null);
  }
  state.setIsPanelTabUserSelected(false);
  const records = effects.getHistory();
  effects.updateStartScreen(records);
  effects.syncURLFragment();
}
