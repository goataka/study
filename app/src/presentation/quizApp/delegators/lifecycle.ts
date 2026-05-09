/**
 * QuizApp デリゲータ群: クイズライフサイクル・選択ハンドラー・解説／単元情報・共有 URL。
 */

import type { QuizApp } from "../../quizApp";
import type { Question } from "../../../domain/question";
import type { QuizSession } from "../../../domain/quizSession";
import type { QuizMode, AnswerResult } from "../../../application/quizUseCase";
import { updateSelectedUnitInfo as updateSelectedUnitInfoFn } from "../selectedUnitInfoUpdater";
import { updateGuidePanelContentByIds as updateGuidePanelContentByIdsFn } from "../guidePanelUpdater";
import { loadGuideContent as loadGuideContentFn } from "../guideLoader";
import {
  createCategoryItem as createCategoryItemFn,
  buildParentCategoryGroup as buildParentCategoryGroupFn,
} from "../categoryItemBuilder";
import {
  deselectAndRefresh as deselectAndRefreshFn,
  selectUnitContext as selectUnitContextFn,
  closeOverallUnitView as closeOverallUnitViewFn,
  navigateBackToList as navigateBackToListFn,
} from "../selectionHandlers";
import {
  toggleParentCategory as toggleParentCategoryFn,
  expandParentCategory as expandParentCategoryFn,
  toggleTopCategory as toggleTopCategoryFn,
  expandTopCategory as expandTopCategoryFn,
} from "../categoryCollapseToggles";
import { showOverallPanel as showOverallPanelFn } from "../overallSummaryPanel";
import { copyShareSummary as copyShareSummaryAction } from "../shareSummaryActions";
import {
  updateShareUrlOpenBtn as updateShareUrlOpenBtnUi,
  openShareUrlEdit as openShareUrlEditUi,
  closeShareUrlEdit as closeShareUrlEditUi,
  readShareUrlInput,
} from "../shareUrlEditor";
import {
  resolveEffectiveMode,
  tryStartQuizSession,
  confirmAndStartWithAllQuestions,
  submitQuizSession,
  renderResultScreen as renderResultScreenFn,
  checkAllMasteredAndCongratulate as checkAllMasteredAndCongratulateFn,
  isCurrentCategoryLearned as isCurrentCategoryLearnedFn,
  toggleLearnedStatus as toggleLearnedStatusFn,
} from "../quizLifecycle";
import { renderQuestion as renderQuestionFn } from "../questionRenderer";
import { showAnswerFeedback as showAnswerFeedbackFn } from "../answerFeedback";
import { updateNavigationButtons as updateNavigationButtonsFn } from "../navigationButtons";
import { updateNotesAreaForQuestion as updateNotesAreaForQuestionFn } from "../notesAreaUpdater";
import {
  getSelectionLevel,
  getEffectiveFilter,
  getSelectionStateAccess,
  getSelectionLifecycleEffects,
  getCategoryItemContext,
  getParentGroupContext,
  renderCategoryList,
  updateStartScreen,
} from "./rendering";

// ─── 選択ハンドラー ────────────────────────────────────────────────────────

export function deselectAndRefresh(app: QuizApp): void {
  deselectAndRefreshFn(getSelectionStateAccess(app), getSelectionLifecycleEffects(app));
}

export function selectUnitContext(app: QuizApp, subject: string, categoryId: string, categoryName: string): void {
  selectUnitContextFn(getSelectionStateAccess(app), getSelectionLifecycleEffects(app), {
    subject,
    categoryId,
    categoryName,
  });
}

export function closeOverallUnitView(app: QuizApp): void {
  closeOverallUnitViewFn(getSelectionStateAccess(app), getSelectionLifecycleEffects(app));
}

export function navigateBackToList(app: QuizApp): void {
  navigateBackToListFn(getSelectionStateAccess(app), getSelectionLifecycleEffects(app));
}

// ─── 単元情報・解説パネル ──────────────────────────────────────────────────

export function updateSelectedUnitInfo(app: QuizApp): void {
  updateSelectedUnitInfoFn({
    useCase: app.useCase,
    filter: app.filter,
    selectionLevel: getSelectionLevel(app),
    selectedUnitContext: app.selectedUnitContext,
    categoryViewMode: app.categoryViewMode,
    selectedGradeGroup: app.selectedGradeGroup,
    selectedTopCategoryId: app.selectedTopCategoryId,
    onCloseOverallUnitView: () => closeOverallUnitView(app),
    onDeselect: () => deselectAndRefresh(app),
  });
}

export function updateGuidePanelContent(app: QuizApp): void {
  updateGuidePanelContentByIds(app, "guidePanelFrame", "guideNoContent");
}

export function updateGuidePanelContentByIds(app: QuizApp, frameId: string, noContentId: string): void {
  void updateGuidePanelContentByIdsFn(
    app.useCase,
    {
      selectedUnitContext: app.selectedUnitContext,
      filter: app.filter,
      selectedTopCategoryId: app.selectedTopCategoryId,
      selectedGradeGroup: app.selectedGradeGroup,
      selectionLevel: getSelectionLevel(app),
    },
    {
      nextToken: () => ++app.guideLoadCounter,
      currentToken: () => app.guideLoadCounter,
    },
    frameId,
    noContentId,
  );
}

export async function loadGuideContent(
  app: QuizApp,
  container: HTMLElement,
  guideUrl: string,
  noContent?: HTMLElement,
): Promise<void> {
  await loadGuideContentFn(
    container,
    guideUrl,
    {
      nextToken: () => ++app.guideLoadCounter,
      currentToken: () => app.guideLoadCounter,
    },
    noContent,
  );
}

// ─── クイズ進行 ────────────────────────────────────────────────────────────

export function isCurrentCategoryLearned(app: QuizApp): boolean {
  return isCurrentCategoryLearnedFn(app.useCase, getEffectiveFilter(app));
}

export function toggleLearnedStatus(app: QuizApp): void {
  void toggleLearnedStatusFn({
    useCase: app.useCase,
    effectiveFilter: getEffectiveFilter(app),
    showConfirmDialog: (msg) => app.showConfirmDialog(msg),
    onAfterToggle: () => updateStartScreen(app),
  }).catch(console.error);
}

export async function startQuiz(app: QuizApp, mode: QuizMode): Promise<void> {
  const effectiveMode = resolveEffectiveMode(mode, app.quizOrder);
  const deps = {
    useCase: app.useCase,
    effectiveFilter: getEffectiveFilter(app),
    questionCount: app.questionCount,
    includeMastered: app.includeMastered,
    quizOrder: app.quizOrder,
    showConfirmDialog: (message: string, alertOnly?: boolean) => app.showConfirmDialog(message, alertOnly),
    notifyError: (msg: string) => alert(msg),
  };
  const outcome = tryStartQuizSession(effectiveMode, deps);
  let session;
  if (outcome.kind === "success") {
    session = outcome.session;
  } else if (outcome.kind === "all-mastered") {
    const fallback = await confirmAndStartWithAllQuestions(deps);
    if (!fallback) return;
    session = fallback;
  } else {
    alert(outcome.message);
    return;
  }
  app.currentSession = session;
  app.currentMode = effectiveMode;
  app.notesController.clearAllStates();
  app.showScreen("quiz");
  document.getElementById("quizScreen")?.classList.toggle("practice-mode", effectiveMode === "practice");
  app.notesController.initialize();
  app.notesController.getCanvas()?.clear();
  renderQuestion(app);
}

export function renderQuestion(app: QuizApp): void {
  const session = app.currentSession;
  if (!session) return;
  renderQuestionFn(session, app.kanjiCanvasController, {
    onAnswered: (q, idx, text) => {
      showAnswerFeedbackFn(q, idx, text);
      updateNavigationButtonsFn(session);
    },
    onTextAnswered: (q) => {
      updateNotesAreaForQuestionFn(q, true, app.kanjiCanvasController);
    },
  });
}

export function navigate(app: QuizApp, direction: 1 | -1): void {
  const session = app.currentSession;
  if (!session) return;
  app.notesController.saveState(session.currentIndex);
  session.navigate(direction);
  renderQuestion(app);
  app.notesController.restoreState(session.currentIndex);
}

export function submitQuiz(app: QuizApp): void {
  const session = app.currentSession;
  if (!session) return;
  const results = submitQuizSession({
    useCase: app.useCase,
    session,
    effectiveFilter: getEffectiveFilter(app),
    currentMode: app.currentMode,
    onAfterSubmit: () => {
      renderCategoryList(app);
      updateStartScreen(app, app.useCase.getHistory());
    },
  });
  showResultScreen(app, results);
}

export function showResultScreen(app: QuizApp, results: AnswerResult[]): void {
  renderResultScreenFn(results);
  app.showScreen("result");
  void checkAllMasteredAndCongratulate(app);
}

export async function checkAllMasteredAndCongratulate(app: QuizApp): Promise<void> {
  await checkAllMasteredAndCongratulateFn({
    useCase: app.useCase,
    effectiveFilter: getEffectiveFilter(app),
    showConfirmDialog: (msg, alertOnly) => app.showConfirmDialog(msg, alertOnly),
  });
}

// ─── 共有 URL / サマリ ─────────────────────────────────────────────────────

export function copyShareSummary(): void {
  copyShareSummaryAction();
}

export function updateShareUrlOpenBtn(app: QuizApp): void {
  updateShareUrlOpenBtnUi(app.shareUrl);
}

export function openShareUrlEdit(app: QuizApp): void {
  openShareUrlEditUi(app.shareUrl);
}

export function closeShareUrlEdit(): void {
  closeShareUrlEditUi();
}

export function saveAndCloseShareUrl(app: QuizApp): void {
  const value = readShareUrlInput();
  if (value !== null) {
    app.saveShareUrl(value);
    updateShareUrlOpenBtn(app);
  }
  closeShareUrlEdit();
}

export function showOverallPanel(tab: "learned" | "share"): void {
  showOverallPanelFn(tab);
}

// ─── カテゴリ折りたたみ ────────────────────────────────────────────────────

export function toggleParentCategory(app: QuizApp, parentCatId: string): void {
  toggleParentCategoryFn(app.collapsedParentCategories, parentCatId);
}

export function expandParentCategory(app: QuizApp, parentCatId: string): void {
  expandParentCategoryFn(app.collapsedParentCategories, parentCatId);
}

export function toggleTopCategory(app: QuizApp, topCatId: string): void {
  toggleTopCategoryFn(app.collapsedTopCategories, topCatId);
}

export function expandTopCategory(app: QuizApp, topCatId: string): void {
  expandTopCategoryFn(app.collapsedTopCategories, topCatId);
}

export function createCategoryItem(
  app: QuizApp,
  subject: string,
  categoryId: string,
  categoryName: string,
  parentCatId?: string,
  topCatId?: string,
): HTMLElement {
  return createCategoryItemFn(getCategoryItemContext(app), subject, categoryId, categoryName, parentCatId, topCatId);
}

export function buildParentCategoryGroup(
  app: QuizApp,
  subject: string,
  parentCatId: string,
  parentCatName: string,
  cats: Record<string, string>,
  topCatId?: string,
): HTMLElement {
  return buildParentCategoryGroupFn(getParentGroupContext(app), subject, parentCatId, parentCatName, cats, topCatId);
}

// ─── 問題表示補助 ──────────────────────────────────────────────────────────

export function showAnswerFeedback(question: Question, userAnswerIndex: number, userAnswerText?: string): void {
  showAnswerFeedbackFn(question, userAnswerIndex, userAnswerText);
}

export function updateNavigationButtons(session: QuizSession): void {
  updateNavigationButtonsFn(session);
}

export function updateNotesAreaForQuestion(
  question: Question | null,
  isAnswered: boolean,
  kanjiCanvasController: import("../../kanjiCanvasController").KanjiCanvasController,
): void {
  updateNotesAreaForQuestionFn(question, isAnswered, kanjiCanvasController);
}
