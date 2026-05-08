/**
 * URL クエリパラメータ・フラグメントの読み書きヘルパー。
 *
 * `quizApp.ts` が画面状態を URL に反映するための純粋関数群。
 * 読み込みは `parseURLState` でパース結果のオブジェクトを返し、
 * 書き込みは `syncURLFragment` で現在状態を URL に反映する。
 */

import type { QuizFilter, QuizUseCase } from "../../application/quizUseCase";
import { SUBJECTS } from "../uiHelpers";

export type PanelTab = "quiz" | "guide" | "history" | "questions";
export type OverallPanel = "learned" | "share";
export type ProgressDetailViewMode = "grade" | "category" | "matrix";
export type ProgressStatusFilter = "all" | "unlearned" | "studying" | "learned";
export type CategoryViewMode = "category" | "grade";
export type QuestionListFilter = "all" | "learned" | "unlearned";

export interface SelectedUnitContext {
  subject: string;
  categoryId: string;
  categoryName: string;
}

/**
 * クエリパラメータとフラグメントを統合した URLSearchParams を返す。
 * クエリパラメータが優先され、フラグメント側は補完として使用する。
 */
export function getURLParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

/** URL からパースされた画面状態。値があれば該当フィールドのみセットされる。 */
export interface ParsedURLState {
  subject?: string;
  category?: string;
  panel?: PanelTab;
  overallPanel?: OverallPanel;
  progressSubject?: string;
  progressView?: ProgressDetailViewMode;
  progressStatusFilter?: ProgressStatusFilter;
  categoryView?: CategoryViewMode;
  questionFilter?: QuestionListFilter;
  selectedUnitContext?: SelectedUnitContext;
}

const PANEL_TABS: readonly PanelTab[] = ["quiz", "guide", "history", "questions"];
const PROGRESS_STATUS_FILTERS: readonly ProgressStatusFilter[] = ["all", "unlearned", "studying", "learned"];

/**
 * 現在の URL から `ParsedURLState` を作成する。
 * 不明な値や範囲外の値は無視する。
 */
export function parseURLState(useCase: QuizUseCase): ParsedURLState {
  const params = getURLParams();
  const state: ParsedURLState = {};

  const subject = params.get("subject");
  const category = params.get("category");
  // 不正な subject は無視する。SUBJECTS に存在する ID のみ受け付ける。
  const isKnownSubject = !!subject && SUBJECTS.some((s) => s.id === subject);
  if (isKnownSubject) {
    state.subject = subject!;
    if (category && category !== "all") {
      // category も実在チェック。useCase.getCategoriesForSubject に存在する ID のみ採用する。
      const categories = useCase.getCategoriesForSubject(subject!);
      if (Object.prototype.hasOwnProperty.call(categories, category)) {
        state.category = category;
      } else {
        state.category = "all";
      }
    } else {
      state.category = "all";
    }
  }

  const panel = params.get("panel");
  if (panel && PANEL_TABS.includes(panel as PanelTab)) {
    state.panel = panel as PanelTab;
  }

  const overallPanel = params.get("overallPanel");
  if (overallPanel === "learned" || overallPanel === "share") {
    state.overallPanel = overallPanel;
  }

  const progressSubject = params.get("progressSubject");
  if (
    progressSubject &&
    SUBJECTS.some((s) => s.id === progressSubject && s.id !== "all" && s.id !== "admin" && s.id !== "progress")
  ) {
    state.progressSubject = progressSubject;
  }

  const progressView = params.get("progressView");
  if (progressView === "grade" || progressView === "category" || progressView === "matrix") {
    state.progressView = progressView;
  }

  const progressStatus = params.get("progressStatus");
  if (progressStatus && PROGRESS_STATUS_FILTERS.includes(progressStatus as ProgressStatusFilter)) {
    state.progressStatusFilter = progressStatus as ProgressStatusFilter;
  }

  const categoryView = params.get("categoryView");
  if (categoryView === "grade" || categoryView === "category") {
    state.categoryView = categoryView;
  }

  const questionFilter = params.get("questionFilter");
  if (questionFilter === "all" || questionFilter === "learned" || questionFilter === "unlearned") {
    state.questionFilter = questionFilter;
  }

  const unitSubject = params.get("unitSubject");
  const unitCategory = params.get("unitCategory");
  if (unitSubject && unitCategory) {
    const categories = useCase.getCategoriesForSubject(unitSubject);
    const categoryName = categories[unitCategory];
    if (categoryName) {
      state.selectedUnitContext = {
        subject: unitSubject,
        categoryId: unitCategory,
        categoryName,
      };
    }
  }

  return state;
}

/** URL に書き出すための画面状態スナップショット。 */
export interface URLFragmentState {
  filter: QuizFilter;
  activePanelTab: PanelTab;
  activeOverallPanel: OverallPanel;
  progressSubjectId: string;
  progressDetailViewMode: ProgressDetailViewMode;
  progressStatusFilter: ProgressStatusFilter;
  categoryViewMode: CategoryViewMode;
  questionListFilter: QuestionListFilter;
  selectedUnitContext: SelectedUnitContext | null;
}

/**
 * 現在の画面状態を URL フラグメントに反映する。
 * 表示に影響しないため `replaceState` を用い、履歴スタックには追加しない。
 *
 * @param state      画面状態スナップショット
 * @param screenName 明示的な画面名。省略時は DOM から推測する
 */
export function syncURLFragment(state: URLFragmentState, screenName?: "start" | "quiz" | "result"): void {
  const hashParams = new URLSearchParams();
  const screen =
    screenName ??
    (document.getElementById("quizScreen")?.classList.contains("hidden") === false
      ? "quiz"
      : document.getElementById("resultScreen")?.classList.contains("hidden") === false
        ? "result"
        : "start");
  if (screen !== "start") {
    hashParams.set("screen", screen);
  }
  if (state.filter.subject) {
    hashParams.set("subject", state.filter.subject);
  }
  if (state.filter.category && state.filter.category !== "all") {
    hashParams.set("category", state.filter.category);
  }
  if (state.activePanelTab) {
    hashParams.set("panel", state.activePanelTab);
  }
  if (
    state.filter.subject !== "all" &&
    state.filter.subject !== "progress" &&
    state.filter.subject !== "admin" &&
    state.categoryViewMode
  ) {
    hashParams.set("categoryView", state.categoryViewMode);
  }
  if (state.filter.subject === "all") {
    hashParams.set("overallPanel", state.activeOverallPanel);
  }
  if (state.filter.subject === "progress") {
    hashParams.set("progressSubject", state.progressSubjectId);
    hashParams.set("progressView", state.progressDetailViewMode);
    if (state.progressStatusFilter !== "all") {
      hashParams.set("progressStatus", state.progressStatusFilter);
    }
  }
  if (state.activePanelTab === "questions" && state.questionListFilter !== "all") {
    hashParams.set("questionFilter", state.questionListFilter);
  }
  if (state.selectedUnitContext !== null) {
    hashParams.set("unitSubject", state.selectedUnitContext.subject);
    hashParams.set("unitCategory", state.selectedUnitContext.categoryId);
  }
  const params = hashParams.toString();
  const newHash = params ? `#${params}` : "";

  // クエリパラメータに unitSubject/unitCategory が残っている場合はクリアする
  // （単元詳細を閉じた後にリロードすると再表示される問題の修正）
  const searchParams = new URLSearchParams(window.location.search);
  let searchChanged = false;
  if (state.selectedUnitContext === null) {
    for (const key of ["unitSubject", "unitCategory"]) {
      if (searchParams.has(key)) {
        searchParams.delete(key);
        searchChanged = true;
      }
    }
  }
  const newSearch = searchChanged
    ? searchParams.toString()
      ? `?${searchParams.toString()}`
      : ""
    : window.location.search;

  if (window.location.hash === newHash && !searchChanged) return;
  const newUrl = `${window.location.pathname}${newSearch}${newHash}`;
  window.history.replaceState(window.history.state, document.title, newUrl);
}
