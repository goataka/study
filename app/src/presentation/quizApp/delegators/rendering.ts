/**
 * QuizApp デリゲータ群: コンテキスト・タブ・カテゴリ／進度の描画。
 *
 * QuizApp 本体の薄いラッパーメソッドの中身を、状態と他メソッドの呼び出しに
 * アクセス可能なモジュール関数として切り出したもの。
 */

import type { QuizApp } from "../../quizApp";
import type { QuizFilter, QuizRecord } from "../../../application/quizUseCase";
import {
  renderCategoryListByCategory as renderCategoryListByCategoryFn,
  renderCategoryListByGrade as renderCategoryListByGradeFn,
} from "../categoryListRenderer";
import { renderAllSubjectList as renderAllSubjectListFn } from "../allSubjectListRenderer";
import { renderCategoryListRouter as renderCategoryListRouterFn } from "../categoryListRouter";
import { renderCategoryViewControls as renderCategoryViewControlsFn } from "../categoryViewControls";
import {
  renderProgressView as renderProgressViewFn,
  renderProgressDetailPanel as renderProgressDetailPanelFn,
  renderProgressDetailContent as renderProgressDetailContentFn,
} from "../progressTabRenderer";
import { renderOverallSummaryPanel as renderOverallSummaryPanelFn } from "../overallSummaryRenderer";
import { renderHistoryList as renderHistoryListView } from "../historyListView";
import { renderQuestionList as renderQuestionListView, type QuestionListFilter } from "../questionListView";
import {
  updateCategoryListActive as updateCategoryListActiveFn,
  showPanelTab as showPanelTabFn,
} from "../categoryListActive";
import { selectNextPanelTab } from "../autoSelectPanelTab";
import { updateQuizPanelVisibility as updateQuizPanelVisibilityFn } from "../quizPanelVisibility";
import { updateStartScreen as updateStartScreenFn, navigateToAdmin as navigateToAdminFn } from "../startScreenUpdater";
import {
  type CreateCategoryItemParams,
  type CategorySelectionCallbacks,
  type BuildParentCategoryGroupParams,
} from "../categoryItemBuilder";
import {
  handleTopHeaderClick as handleTopHeaderClickFn,
  handleParentHeaderClick as handleParentHeaderClickFn,
  handleGradeHeaderClick as handleGradeHeaderClickFn,
  type SelectionStateAccess,
  type SelectionLifecycleEffects,
} from "../selectionHandlers";
import {
  toggleParentCategory as toggleParentCategoryFn,
  expandParentCategory as expandParentCategoryFn,
  toggleTopCategory as toggleTopCategoryFn,
  expandTopCategory as expandTopCategoryFn,
} from "../categoryCollapseToggles";
import {
  buildSubjectTabs as buildSubjectTabsFn,
  selectTabByFilter as selectTabByFilterFn,
  buildPanelTabs as buildPanelTabsFn,
  setupOverallPanelTabs as setupOverallPanelTabsFn,
  setupProgressDetailTabs as setupProgressDetailTabsFn,
  type PanelTab,
} from "../tabsBuilder";
import { showOverallPanel as showOverallPanelFn } from "../overallSummaryPanel";
import { updateSubjectStats as updateSubjectStatsFn } from "../categoryStatsView";
import { applyCategoryStatusFilter as applyCategoryStatusFilterFn } from "../categoryCollapseState";
import { isCurrentCategoryLearned as isCurrentCategoryLearnedFn } from "../quizLifecycle";
import { selectUnitContext, deselectAndRefresh, updateGuidePanelContent, updateSelectedUnitInfo } from "./lifecycle";

export type { PanelTab };

// ─── 選択状態の参照系 ──────────────────────────────────────────────────────

export function getSelectionLevel(app: QuizApp): "none" | "topCategory" | "parentCategory" | "unit" {
  if (app.selectedTopCategoryId !== null) return "topCategory";
  if (app.filter.category === "all" && app.filter.parentCategory !== undefined) return "parentCategory";
  if (app.filter.category !== "all") return "unit";
  return "none";
}

export function getEffectiveFilter(app: QuizApp): QuizFilter {
  if (app.selectedUnitContext !== null) {
    return {
      subject: app.selectedUnitContext.subject,
      category: app.selectedUnitContext.categoryId,
      parentCategory: undefined,
    };
  }
  return app.filter;
}

export function getSelectionStateAccess(app: QuizApp): SelectionStateAccess {
  return {
    filter: app.filter,
    getSelectedTopCategoryId: () => app.selectedTopCategoryId,
    setSelectedTopCategoryId: (v) => {
      app.selectedTopCategoryId = v;
    },
    getSelectedGradeGroup: () => app.selectedGradeGroup,
    setSelectedGradeGroup: (v) => {
      app.selectedGradeGroup = v;
    },
    setSelectedUnitContext: (v) => {
      app.selectedUnitContext = v;
    },
    setIsPanelTabUserSelected: (v) => {
      app.isPanelTabUserSelected = v;
    },
  };
}

export function getSelectionLifecycleEffects(app: QuizApp): SelectionLifecycleEffects {
  return {
    updateCategoryListActive: () => updateCategoryListActive(app),
    getHistory: () => app.useCase.getHistory(),
    autoSelectPanelTab: (records) => autoSelectPanelTab(app, records),
    updateStartScreen: (records) => updateStartScreen(app, records),
    syncURLFragment: () => app.syncURLFragment(),
  };
}

export function getCategoryItemContext(app: QuizApp): CreateCategoryItemParams {
  return {
    useCase: app.useCase,
    filter: app.filter,
    categoryViewMode: app.categoryViewMode,
    setFilter: (subject, categoryId, parentCatId) => {
      app.filter.subject = subject;
      app.filter.category = categoryId;
      app.filter.parentCategory = parentCatId;
    },
    resetSelectionOnUnit: () => {
      app.selectedTopCategoryId = null;
      app.selectedGradeGroup = null;
    },
    setPanelTabUserSelected: (value) => {
      app.isPanelTabUserSelected = value;
    },
    callbacks: getCategorySelectionCallbacks(app),
  };
}

export function getCategorySelectionCallbacks(app: QuizApp): CategorySelectionCallbacks {
  return {
    onDeselect: () => deselectAndRefresh(app),
    onSelectTabByFilter: () => selectTabByFilter(app),
    onRenderCategoryList: () => renderCategoryList(app),
    onUpdateCategoryListActive: () => updateCategoryListActive(app),
    onAutoSelectPanelTab: () => autoSelectPanelTab(app, app.useCase.getHistory()),
    onUpdateStartScreen: () => updateStartScreen(app, app.useCase.getHistory()),
    onSyncURLFragment: () => app.syncURLFragment(),
  };
}

export function getParentGroupContext(app: QuizApp): BuildParentCategoryGroupParams {
  return {
    filter: app.filter,
    collapsedParentCategories: app.collapsedParentCategories,
    getSelectionLevel: () => getSelectionLevel(app),
    itemCtx: getCategoryItemContext(app),
    onParentHeaderClick: (pid) => handleParentHeaderClick(app, pid),
    onToggleParentCategory: (pid) => toggleParentCategoryFn(app.collapsedParentCategories, pid),
  };
}

// ─── タブ初期化 ────────────────────────────────────────────────────────────

export function buildSubjectTabs(app: QuizApp): void {
  buildSubjectTabsFn({
    onSelectSubject: (subjectId) => {
      app.filter.subject = subjectId;
      app.filter.category = "all";
      app.filter.parentCategory = undefined;
      app.selectedTopCategoryId = null;
      app.selectedGradeGroup = null;
      app.selectedUnitContext = null;
      renderCategoryList(app);
      updateStartScreen(app);
      app.syncURLFragment();
    },
  });
  selectTabByFilter(app);
  renderCategoryList(app);
}

export function buildPanelTabs(app: QuizApp): void {
  buildPanelTabsFn({
    onSelectPanelTab: (panel) => {
      app.activePanelTab = panel;
      app.isPanelTabUserSelected = true;
      showPanelTabFn(panel);
      if (panel === "guide") {
        updateGuidePanelContent(app);
      } else if (panel === "history") {
        renderHistoryList(app, getEffectiveFilter(app));
      } else if (panel === "questions") {
        renderQuestionList(app);
      }
      app.syncURLFragment();
    },
  });
}

export function setupOverallPanelTabs(app: QuizApp): void {
  setupOverallPanelTabsFn((panel) => {
    app.activeOverallPanel = panel;
    showOverallPanelFn(panel);
    app.syncURLFragment();
  });
}

export function setupProgressDetailTabs(app: QuizApp): void {
  setupProgressDetailTabsFn((mode) => {
    app.progressDetailViewMode = mode;
    renderProgressDetailContent(app);
    app.syncURLFragment();
  });
}

export function selectTabByFilter(app: QuizApp): void {
  selectTabByFilterFn(app.filter.subject);
}

// ─── カテゴリリスト描画 ────────────────────────────────────────────────────

export function renderCategoryList(app: QuizApp): void {
  renderCategoryListRouterFn({
    useCase: app.useCase,
    progressRepo: app.progressRepo,
    subject: app.filter.subject,
    categoryViewMode: app.categoryViewMode,
    shareUrl: app.shareUrl,
    renderAllSubjectList: () => renderAllSubjectList(app),
    renderCategoryViewControls: () => renderCategoryViewControls(app),
    renderProgressView: () => renderProgressView(app),
    renderCategoryListByGrade: () => renderCategoryListByGrade(app),
    renderCategoryListByCategory: () => renderCategoryListByCategory(app),
    updateCategoryListActive: () => updateCategoryListActive(app),
    applyCategoryStatusFilter: () => applyCategoryStatusFilterFn(app.categoryStatusFilter),
    updateSubjectStats: () => updateSubjectStatsFn(app.useCase),
    showConfirmDialog: (msg, alertOnly) => app.showConfirmDialog(msg, alertOnly),
  });
}

export function renderCategoryListByCategory(app: QuizApp): void {
  renderCategoryListByCategoryFn({
    useCase: app.useCase,
    subject: app.filter.subject,
    gradeFilterMatches: (s, c) => gradeFilterMatches(app, s, c),
    collapsedTopCategories: app.collapsedTopCategories,
    getSelectedTopCategoryId: () => app.selectedTopCategoryId,
    itemCtx: getCategoryItemContext(app),
    parentGroupCtx: getParentGroupContext(app),
    onTopHeaderClick: (topCatId) =>
      handleTopHeaderClickFn(getSelectionStateAccess(app), getSelectionLifecycleEffects(app), topCatId),
    onToggleTopCategory: (topCatId) => toggleTopCategoryFn(app.collapsedTopCategories, topCatId),
  });
}

export function renderCategoryListByGrade(app: QuizApp): void {
  renderCategoryListByGradeFn({
    useCase: app.useCase,
    subject: app.filter.subject,
    selectedGradeFilter: app.selectedGradeFilter,
    collapsedGradeGroups: app.collapsedGradeGroups,
    itemCtx: getCategoryItemContext(app),
    onGradeHeaderClick: (grade) =>
      handleGradeHeaderClickFn(getSelectionStateAccess(app), getSelectionLifecycleEffects(app), grade),
  });
}

export function renderCategoryViewControls(app: QuizApp): void {
  renderCategoryViewControlsFn({
    useCase: app.useCase,
    progressRepo: app.progressRepo,
    subject: app.filter.subject,
    categoryViewMode: app.categoryViewMode,
    selectedGradeFilter: app.selectedGradeFilter,
    onViewModeChange: (mode) => {
      app.categoryViewMode = mode;
      renderCategoryList(app);
      app.syncURLFragment();
    },
    onGradeFilterChange: (prefix) => {
      app.selectedGradeFilter = prefix;
      renderCategoryList(app);
    },
    onGradeFilterReset: () => {
      app.selectedGradeFilter = null;
    },
  });
}

export function gradeFilterMatches(app: QuizApp, subject: string, categoryId: string): boolean {
  if (!app.selectedGradeFilter) return true;
  const grade = app.useCase.getCategoryReferenceGrade(subject, categoryId);
  if (!grade) return false;
  return grade.startsWith(app.selectedGradeFilter);
}

export function renderAllSubjectList(app: QuizApp): void {
  renderAllSubjectListFn({
    useCase: app.useCase,
    subjectRecommendedCounts: app.subjectRecommendedCounts,
    onRecommendedCountChange: (subjectId, count) => {
      app.subjectRecommendedCounts.set(subjectId, count);
      app.saveRecommendedCounts();
      renderCategoryList(app);
    },
    onSelectUnit: (subjectId, categoryId, categoryName) => {
      selectUnitContext(app, subjectId, categoryId, categoryName);
    },
  });
}

// ─── 進度・サマリパネル ────────────────────────────────────────────────────

export function renderProgressView(app: QuizApp): void {
  renderProgressViewFn({
    useCase: app.useCase,
    progressSubjectId: app.progressSubjectId,
    progressDetailViewMode: app.progressDetailViewMode,
    progressStatusFilter: app.progressStatusFilter,
    progressMatrixTransposed: app.progressMatrixTransposed,
    onSelectSubject: (subjectId) => {
      app.progressSubjectId = subjectId;
      app.selectedUnitContext = null;
      renderCategoryList(app);
      updateStartScreen(app);
      app.syncURLFragment();
    },
    onSelectUnit: (subject, catId, catName) => selectUnitContext(app, subject, catId, catName),
    onToggleMatrixTranspose: () => {
      app.progressMatrixTransposed = !app.progressMatrixTransposed;
      renderProgressDetailContent(app);
      app.syncURLFragment();
    },
    onAfterRender: () => updateSubjectStatsFn(app.useCase),
  });
}

export function renderProgressDetailPanel(app: QuizApp): void {
  renderProgressDetailPanelFn({
    useCase: app.useCase,
    progressSubjectId: app.progressSubjectId,
    progressDetailViewMode: app.progressDetailViewMode,
    progressStatusFilter: app.progressStatusFilter,
    progressMatrixTransposed: app.progressMatrixTransposed,
    onSelectUnit: (subject, catId, catName) => selectUnitContext(app, subject, catId, catName),
    onToggleMatrixTranspose: () => {
      app.progressMatrixTransposed = !app.progressMatrixTransposed;
      renderProgressDetailContent(app);
      app.syncURLFragment();
    },
  });
}

export function renderProgressDetailContent(app: QuizApp): void {
  renderProgressDetailContentFn({
    useCase: app.useCase,
    progressSubjectId: app.progressSubjectId,
    progressDetailViewMode: app.progressDetailViewMode,
    progressStatusFilter: app.progressStatusFilter,
    progressMatrixTransposed: app.progressMatrixTransposed,
    onSelectUnit: (subject, catId, catName) => selectUnitContext(app, subject, catId, catName),
    onToggleMatrixTranspose: () => {
      app.progressMatrixTransposed = !app.progressMatrixTransposed;
      renderProgressDetailContent(app);
      app.syncURLFragment();
    },
  });
}

export function renderOverallSummaryPanel(app: QuizApp, allRecords?: QuizRecord[]): void {
  renderOverallSummaryPanelFn({
    useCase: app.useCase,
    subjectRecommendedCounts: app.subjectRecommendedCounts,
    selectedActivityDate: app.selectedActivityDate,
    activeOverallPanel: app.activeOverallPanel,
    allRecords,
  });
}

// ─── パネル選択 / カテゴリアクティブ ─────────────────────────────────────

export function autoSelectPanelTab(app: QuizApp, allRecords: QuizRecord[]): void {
  app.activePanelTab = selectNextPanelTab(allRecords, {
    isPanelTabUserSelected: app.isPanelTabUserSelected,
    activePanelTab: app.activePanelTab,
    selectedUnitContext: app.selectedUnitContext
      ? { subject: app.selectedUnitContext.subject, categoryId: app.selectedUnitContext.categoryId }
      : null,
    selectionLevel: getSelectionLevel(app),
    isGradeGroupSelected: app.selectedGradeGroup !== null,
    filter: app.filter,
  });
  showPanelTabFn(app.activePanelTab);
}

export function updateCategoryListActive(app: QuizApp): void {
  updateCategoryListActiveFn({
    filter: app.filter,
    selectionLevel: getSelectionLevel(app),
    selectedTopCategoryId: app.selectedTopCategoryId,
    selectedGradeGroup: app.selectedGradeGroup,
    collapsedGradeGroups: app.collapsedGradeGroups,
    expandParentCategory: (parentCatId) => expandParentCategoryFn(app.collapsedParentCategories, parentCatId),
    expandTopCategory: (topCatId) => expandTopCategoryFn(app.collapsedTopCategories, topCatId),
  });
}

// ─── 履歴・問題一覧 ────────────────────────────────────────────────────────

export function renderHistoryList(app: QuizApp, filter: QuizFilter, allRecords?: QuizRecord[]): void {
  renderHistoryListView(filter, app.useCase, allRecords);
}

export function renderQuestionList(app: QuizApp, filter?: QuestionListFilter): void {
  renderQuestionListView(getEffectiveFilter(app), filter ?? app.questionListFilter, app.useCase);
}

// ─── スタート画面・管理画面 ────────────────────────────────────────────────

export function navigateToAdmin(app: QuizApp): void {
  const ok = navigateToAdminFn(app.filter);
  if (!ok) return;
  app.selectedTopCategoryId = null;
  app.selectedUnitContext = null;
  renderCategoryList(app);
  updateStartScreen(app);
}

export function updateStartScreen(app: QuizApp, allRecords?: QuizRecord[]): void {
  updateStartScreenFn({
    useCase: app.useCase,
    filter: app.filter,
    effectiveFilter: getEffectiveFilter(app),
    activePanelTab: app.activePanelTab,
    hasSelectedUnit: app.selectedUnitContext !== null,
    allRecords,
    isCurrentCategoryLearned: () => isCurrentCategoryLearnedFn(app.useCase, getEffectiveFilter(app)),
    updateSubjectStats: () => updateSubjectStatsFn(app.useCase),
    updateQuizPanelVisibility: () => updateQuizPanelVisibility(app),
    renderHistoryList: (filter, records) => renderHistoryList(app, filter, records),
    renderQuestionList: () => renderQuestionList(app),
    updateGuidePanelContent: () => updateGuidePanelContent(app),
    renderOverallSummaryPanel: (records) => renderOverallSummaryPanel(app, records),
  });
}

export function updateQuizPanelVisibility(app: QuizApp): void {
  updateQuizPanelVisibilityFn({
    subject: app.filter.subject,
    hasSelectedUnit: app.selectedUnitContext !== null,
    selectionLevel: getSelectionLevel(app),
    isGradeGroupSelected:
      app.categoryViewMode === "grade" && app.selectedGradeGroup !== null && app.filter.subject !== "all",
    activePanelTab: app.activePanelTab,
    onRenderProgressDetail: () => renderProgressDetailPanel(app),
    onShowPanelTab: (tab) => showPanelTabFn(tab),
    onUpdateSelectedUnitInfo: () => updateSelectedUnitInfo(app),
  });
}

// ─── 親カテゴリヘッダーハンドラー ──────────────────────────────────────────

export function handleParentHeaderClick(app: QuizApp, parentCatId: string): void {
  handleParentHeaderClickFn(
    getSelectionStateAccess(app),
    getSelectionLifecycleEffects(app),
    () => getSelectionLevel(app),
    parentCatId,
  );
}
