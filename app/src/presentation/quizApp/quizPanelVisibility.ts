/**
 * クイズパネルの表示/非表示制御。
 *
 * 教科タブ（admin / progress / all / それ以外）と選択状態に応じて、
 * パネルタブやコンテンツパネルの表示/非表示を切り替える DOM 操作専用ヘルパー。
 */

import { getPanelTabsSnapshot, setHiddenPanelTabs } from "../components/startScreen/panelTabsStore";
import {
  setOverallSummaryPanelHidden,
  setProgressDetailPanelHidden,
} from "../components/startScreen/panelVisibilityStore";
import type { PanelTab } from "./tabsBuilder";

/** ID → PanelTab マッピング。 */
const PANEL_TAB_BY_ID: Record<string, PanelTab> = {
  "panelTab-guide": "guide",
  "panelTab-quiz": "quiz",
  "panelTab-history": "history",
  "panelTab-questions": "questions",
};

const ALL_PANEL_TAB_IDS = Object.keys(PANEL_TAB_BY_ID);
const NON_GUIDE_PANEL_TAB_IDS = ["panelTab-quiz", "panelTab-history", "panelTab-questions"];

/**
 * panel-tab の hidden 状態を更新する。
 *
 * panel-tab は `<QuizPanel>` 配下の React コンポーネントが所有するため、DOM を
 * 直接操作すると次回 React 再レンダリング時に上書きされてしまう。そこでストア
 * (`hiddenPanelTabs`) 経由で React に反映する。
 *
 * 指定されなかった ID の hidden 状態は、ストアの現在値をそのまま維持する
 * （DOM ではなくストアを参照することで純粋な状態遷移として扱う）。
 *
 * 後方互換: React 未マウントのテスト構成向けに命令的 DOM 更新も併用する。
 * React マウント時は store 経由で同じ状態に収束するため二重書き込みは無害。
 */
function updateHiddenPanelTabs(updates: Partial<Record<string, boolean>>): void {
  const current = getPanelTabsSnapshot().hiddenPanelTabs;
  const next = new Set<PanelTab>();
  for (const id of ALL_PANEL_TAB_IDS) {
    const tab = PANEL_TAB_BY_ID[id];
    if (!tab) continue;
    const isHidden = id in updates ? !!updates[id] : current.has(tab);
    if (isHidden) next.add(tab);
  }
  setHiddenPanelTabs(next);

  for (const id of Object.keys(updates)) {
    document.getElementById(id)?.classList.toggle("hidden", !!updates[id]);
  }
}

/** クイズパネル表示制御に必要な状態とコールバック。 */
export interface QuizPanelVisibilityParams {
  /** 現在の教科 ID（"admin" / "progress" / "all" / 通常）。 */
  subject: string;
  /** 単元コンテキスト（総合タブや進度タブから単元選択中なら非 null）。 */
  hasSelectedUnit: boolean;
  /** 教科タブでの選択レベル。 */
  selectionLevel: "none" | "topCategory" | "parentCategory" | "unit";
  /** 学年グループが選択されているか（categoryViewMode === "grade" かつ selectedGradeGroup !== null）。 */
  isGradeGroupSelected: boolean;
  /** 現在アクティブなパネルタブ（quiz/guide/history/questions）。 */
  activePanelTab: PanelTab;

  /** 進度タブ詳細パネルの再描画ハンドラ。 */
  onRenderProgressDetail: () => void;
  /** パネルタブ表示切替ハンドラ。 */
  onShowPanelTab: (tab: PanelTab) => void;
  /** 選択中単元情報パネルの再描画ハンドラ。 */
  onUpdateSelectedUnitInfo: () => void;
}

/**
 * クイズパネルの表示/非表示を更新する。
 * 教科タブでカテゴリが未選択（category === "all"）の場合はクイズパネルを非表示にし、
 * カテゴリが選択されている場合は表示する。
 */
export function updateQuizPanelVisibility(params: QuizPanelVisibilityParams): void {
  const subjectContent = document.getElementById("subjectContent");
  if (!subjectContent) return;

  if (params.subject === "admin") {
    applyAdminTabLayout(subjectContent);
    return;
  }

  if (params.subject === "support") {
    applySupportTabLayout(subjectContent);
    return;
  }

  if (params.subject === "progress") {
    applyProgressTabLayout(subjectContent, params);
    return;
  }

  applyDefaultTabLayout(subjectContent, params);
}

function applyAdminTabLayout(subjectContent: HTMLElement): void {
  setCategoryPanelBackground("default");
  subjectContent.classList.remove("category-only");
  subjectContent.classList.remove("all-subject-layout");
  subjectContent.classList.remove("all-subject-unit-selected");
  ensureQuizPanelVisible(subjectContent);
  // 管理タブでは学習状態フィルターを非表示にする
  const adminStatusFilter = document.querySelector(".category-status-filter") as HTMLElement | null;
  if (adminStatusFilter) adminStatusFilter.classList.add("hidden");
  // 管理タブでは日付ナビを非表示にする
  document.getElementById("overallDateNav")?.classList.add("hidden");
  // 管理タブでは「おすすめ単元」タイトルを非表示、「管理」タイトルを表示
  document.getElementById("allSubjectPanelTitle")?.classList.add("hidden");
  document.getElementById("categoryListTitle")?.classList.remove("hidden");
  document.getElementById("supportMenuTitle")?.classList.add("hidden");
  // 管理タブでは通常のパネルタブ・コンテンツ・総合サマリパネルを非表示にして、管理コンテンツを表示する
  updateHiddenPanelTabs({
    "panelTab-guide": true,
    "panelTab-quiz": true,
    "panelTab-history": true,
    "panelTab-questions": true,
  });
  setOverallSummaryPanelHidden(true);
  setProgressDetailPanelHidden(true);
  [
    "quizModePanel",
    "guideContent",
    "historyContent",
    "questionListContent",
    "overallSummaryPanel",
    "progressDetailPanel",
  ].forEach((id) => {
    document.getElementById(id)?.classList.add("hidden");
  });
  document.getElementById("selectedUnitInfo")?.classList.add("hidden");
  document.getElementById("adminContent")?.classList.remove("hidden");
  document.getElementById("supportContent")?.classList.add("hidden");
}

function applySupportTabLayout(subjectContent: HTMLElement): void {
  setCategoryPanelBackground("default");
  subjectContent.classList.remove("category-only");
  subjectContent.classList.remove("all-subject-layout");
  subjectContent.classList.remove("all-subject-unit-selected");
  ensureQuizPanelVisible(subjectContent);
  // サポートタブでは学習状態フィルターを非表示にする
  const supportStatusFilter = document.querySelector(".category-status-filter") as HTMLElement | null;
  if (supportStatusFilter) supportStatusFilter.classList.add("hidden");
  // サポートタブでは日付ナビを非表示にする
  document.getElementById("overallDateNav")?.classList.add("hidden");
  // サポートタブでは「おすすめ単元」タイトルと通常の単元一覧タイトルを非表示、サポートメニュータイトルを表示
  document.getElementById("allSubjectPanelTitle")?.classList.add("hidden");
  document.getElementById("categoryListTitle")?.classList.add("hidden");
  document.getElementById("supportMenuTitle")?.classList.remove("hidden");
  // サポートタブでは通常のパネルタブ・コンテンツ・総合サマリパネルを非表示にして、サポートコンテンツを表示する
  updateHiddenPanelTabs({
    "panelTab-guide": true,
    "panelTab-quiz": true,
    "panelTab-history": true,
    "panelTab-questions": true,
  });
  setOverallSummaryPanelHidden(true);
  setProgressDetailPanelHidden(true);
  [
    "quizModePanel",
    "guideContent",
    "historyContent",
    "questionListContent",
    "overallSummaryPanel",
    "progressDetailPanel",
  ].forEach((id) => {
    document.getElementById(id)?.classList.add("hidden");
  });
  document.getElementById("selectedUnitInfo")?.classList.add("hidden");
  document.getElementById("adminContent")?.classList.add("hidden");
  const supportContent = document.getElementById("supportContent");
  if (supportContent) {
    supportContent.classList.remove("hidden");
    supportContent.classList.add("flex");
  }
}

function applyProgressTabLayout(subjectContent: HTMLElement, params: QuizPanelVisibilityParams): void {
  setCategoryPanelBackground("default");
  const hasProgressUnit = params.hasSelectedUnit;
  subjectContent.classList.remove("category-only");
  subjectContent.classList.remove("all-subject-layout");
  subjectContent.classList.remove("all-subject-unit-selected");
  ensureQuizPanelVisible(subjectContent);
  // 進度タブでは学習状態フィルターを非表示にする
  const progressStatusFilter = document.querySelector(".category-status-filter") as HTMLElement | null;
  if (progressStatusFilter) progressStatusFilter.classList.add("hidden");
  // 進度タブでは日付ナビを非表示にする
  document.getElementById("overallDateNav")?.classList.add("hidden");
  // 進度タブでは「おすすめ単元」タイトルを非表示、「進度」タイトルを表示
  document.getElementById("allSubjectPanelTitle")?.classList.add("hidden");
  document.getElementById("categoryListTitle")?.classList.remove("hidden");
  document.getElementById("supportMenuTitle")?.classList.add("hidden");
  // 進度タブでは、単元未選択時は進度詳細のみ表示、単元選択時は単元詳細のみ表示する
  updateHiddenPanelTabs({
    "panelTab-guide": !hasProgressUnit,
    "panelTab-quiz": !hasProgressUnit,
    "panelTab-history": !hasProgressUnit,
    "panelTab-questions": !hasProgressUnit,
  });
  if (hasProgressUnit) {
    setProgressDetailPanelHidden(true);
    document.getElementById("progressDetailPanel")?.classList.add("hidden");
    params.onShowPanelTab(params.activePanelTab);
  } else {
    params.onRenderProgressDetail();
    ["quizModePanel", "guideContent", "historyContent", "questionListContent"].forEach((id) => {
      document.getElementById(id)?.classList.add("hidden");
    });
  }
  setOverallSummaryPanelHidden(true);
  document.getElementById("overallSummaryPanel")?.classList.add("hidden");
  document.getElementById("adminContent")?.classList.add("hidden");
  document.getElementById("supportContent")?.classList.remove("flex");
  document.getElementById("supportContent")?.classList.add("hidden");
  if (hasProgressUnit) {
    params.onUpdateSelectedUnitInfo();
  } else {
    document.getElementById("selectedUnitInfo")?.classList.add("hidden");
  }
}

function applyDefaultTabLayout(subjectContent: HTMLElement, params: QuizPanelVisibilityParams): void {
  setCategoryPanelBackground("default");
  const isAll = params.subject === "all";
  const hasOverallUnit = params.hasSelectedUnit;
  const noCategory = !isAll && params.selectionLevel === "none" && !params.isGradeGroupSelected;
  const isGuideOnlySelection =
    !isAll &&
    (params.selectionLevel === "topCategory" ||
      params.selectionLevel === "parentCategory" ||
      params.isGradeGroupSelected);

  // 総合タブ時は単元選択を左・活動パネルを右にするレイアウトを適用
  subjectContent.classList.toggle("all-subject-layout", isAll);
  // 総合タブで単元選択時は 1:2 比率のレイアウトを適用
  subjectContent.classList.toggle("all-subject-unit-selected", isAll && hasOverallUnit);
  // 何も選択されていない場合（総合タブを除く）は右パネルを非表示にしてカテゴリリストを全幅表示する
  // 総合タブは総合サマリパネルを右に表示するため category-only にしない
  subjectContent.classList.toggle("category-only", noCategory);
  const quizPanel = subjectContent.querySelector(".quiz-panel") as HTMLElement | null;
  const notebookSpine = subjectContent.querySelector(".notebook-spine") as HTMLElement | null;
  quizPanel?.classList.toggle("hidden", noCategory);
  notebookSpine?.classList.toggle("md:hidden", noCategory);
  // 管理コンテンツパネルを非表示にする（管理タブ以外）
  document.getElementById("adminContent")?.classList.add("hidden");
  // サポートコンテンツパネルを非表示にする（サポートタブ以外）
  document.getElementById("supportContent")?.classList.remove("flex");
  document.getElementById("supportContent")?.classList.add("hidden");

  // 総合タブでは単元未選択時のみパネルタブを非表示（単元選択時は教科画面と同じ表示）
  // また、カテゴリ/サブカテゴリ選択時は確認・問題一覧・履歴タブを非表示にする。
  // ストアに 1 度で反映するため 4 タブの最終状態をまとめて計算する。
  const updates: Partial<Record<string, boolean>> = {};
  for (const id of ALL_PANEL_TAB_IDS) {
    let hidden = isAll && !hasOverallUnit;
    if (NON_GUIDE_PANEL_TAB_IDS.includes(id)) {
      if (!isAll && isGuideOnlySelection) hidden = true;
      else if (!isAll) hidden = false;
    }
    updates[id] = hidden;
  }
  updateHiddenPanelTabs(updates);

  if (isAll) {
    if (hasOverallUnit) {
      // 総合タブから単元選択時: 教科の画面と同じレイアウトで表示
      setOverallSummaryPanelHidden(true);
      setProgressDetailPanelHidden(true);
      document.getElementById("overallSummaryPanel")?.classList.add("hidden");
      document.getElementById("progressDetailPanel")?.classList.add("hidden");
      params.onShowPanelTab(params.activePanelTab);
    } else {
      // 通常のコンテンツパネルを非表示にして総合サマリパネルを表示
      ["quizModePanel", "guideContent", "historyContent", "questionListContent"].forEach((id) => {
        document.getElementById(id)?.classList.add("hidden");
      });
      setOverallSummaryPanelHidden(false);
      setProgressDetailPanelHidden(true);
      document.getElementById("overallSummaryPanel")?.classList.remove("hidden");
      document.getElementById("progressDetailPanel")?.classList.add("hidden");
    }
  } else {
    // 総合サマリパネル・進度詳細パネルを非表示にして通常のパネルを表示
    setOverallSummaryPanelHidden(true);
    setProgressDetailPanelHidden(true);
    document.getElementById("overallSummaryPanel")?.classList.add("hidden");
    document.getElementById("progressDetailPanel")?.classList.add("hidden");
    // 「総合」以外では現在アクティブなパネルを表示する（総合から戻った場合も含む）
    params.onShowPanelTab(params.activePanelTab);
  }

  // 「おすすめ単元」タイトルは総合タブ時のみ表示
  document.getElementById("allSubjectPanelTitle")?.classList.toggle("hidden", !isAll);
  // 「単元一覧」タイトルは教科別タブ時のみ表示
  document.getElementById("categoryListTitle")?.classList.toggle("hidden", isAll);
  // サポートメニュータイトルは常に非表示（サポートタブ以外）
  document.getElementById("supportMenuTitle")?.classList.add("hidden");
  // 学習状態フィルターボタンは総合タブ・管理タブでは非表示
  const statusFilterEl = document.querySelector(".category-status-filter") as HTMLElement | null;
  if (statusFilterEl) statusFilterEl.classList.toggle("hidden", isAll || params.subject === "admin");
  // overallDateNav: コンテンツが設定されないため常に非表示

  // 選択中の単元情報パネルを更新する
  params.onUpdateSelectedUnitInfo();
}

function ensureQuizPanelVisible(subjectContent: HTMLElement): void {
  const quizPanel = subjectContent.querySelector(".quiz-panel") as HTMLElement | null;
  const notebookSpine = subjectContent.querySelector(".notebook-spine") as HTMLElement | null;
  quizPanel?.classList.remove("hidden");
  notebookSpine?.classList.remove("md:hidden");
}

function setCategoryPanelBackground(mode: "default" | "transparent"): void {
  const categoryPanel = document.querySelector(".category-panel");
  if (!(categoryPanel instanceof HTMLElement)) return;
  if (mode === "transparent") {
    categoryPanel.classList.remove("notebook-lines", "bg-white", "shadow-[inset_-3px_0_6px_rgba(0,0,0,0.08)]");
    categoryPanel.classList.add("bg-transparent", "shadow-none");
    return;
  }
  categoryPanel.classList.remove("bg-transparent", "shadow-none");
  categoryPanel.classList.add("notebook-lines", "bg-white", "shadow-[inset_-3px_0_6px_rgba(0,0,0,0.08)]");
}
