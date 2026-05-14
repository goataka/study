/**
 * QuizApp デリゲータ群: クイズライフサイクル・選択ハンドラー・解説／単元情報・共有 URL。
 */

import type { QuizApp } from "../../quizApp";
import type { Question } from "../../../domain/question";
import type { QuizSession } from "../../../domain/quizSession";
import type { QuizMode, AnswerResult } from "../../../application/quizUseCase";
import type { KanjiCanvasController } from "../../components/quizScreen/kanjiCanvasController";
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
import { renderMultipleChoice, renderTextInput } from "../choicesRenderer";
import { getQuizSettingsSnapshot } from "../../components/startScreen/quizSettingsStore";
import { clearQuizSessionStore, syncQuizSessionStore } from "../../components/quizSessionStore";
import { setText } from "../../uiHelpers";
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
    onAfterToggle: () => {
      renderCategoryList(app);
      updateStartScreen(app);
    },
  }).catch(console.error);
}

export async function startQuiz(app: QuizApp, mode: QuizMode): Promise<void> {
  const quizSettings = getQuizSettingsSnapshot();
  app.quizOrder = quizSettings.quizOrder;
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
  const isPracticeMode = effectiveMode === "practice" || app.quizOrder === "straight";
  app.notesController.clearAllStates();
  app.showScreen("quiz");
  // 画面遷移直後の React 再レンダリングで class が上書きされるため、
  // ペイント直前のタイミングで practice-mode を適用して既存スタイル互換を維持する。
  // canvas も React 再レンダリング後に初期化することで、offsetWidth が正しく取得できる。
  const applyAfterRender = (): void => {
    document.getElementById("quizScreen")?.classList.toggle("practice-mode", isPracticeMode);
    app.notesController.initialize();
    app.notesController.getCanvas()?.clear();
  };
  // jsdom など requestAnimationFrame がない環境では setTimeout をフォールバックに使う。
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(applyAfterRender);
  } else {
    setTimeout(applyAfterRender, 0);
  }
  renderQuestion(app);
}

export function renderQuestion(app: QuizApp): void {
  const session = app.currentSession;
  if (!session) return;
  const question = session.currentQuestion;
  const callbacks = {
    onAnswered: () => {
      syncQuizSessionStore(session, { kanjiAvailable: app.kanjiCanvasController.isAvailable() });
      applyLegacyQuizDom(session, app.kanjiCanvasController);
    },
    onTextAnswered: () => {
      syncQuizSessionStore(session, { kanjiAvailable: app.kanjiCanvasController.isAvailable() });
      applyLegacyQuizDom(session, app.kanjiCanvasController);
    },
  };
  if (question.questionType === "text-input") {
    renderTextInput(question, session, callbacks);
  } else {
    renderMultipleChoice(question, session, callbacks);
  }
  syncQuizSessionStore(session, { kanjiAvailable: app.kanjiCanvasController.isAvailable() });
  applyLegacyQuizDom(session, app.kanjiCanvasController);
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
  clearQuizSessionStore();
  void checkAllMasteredAndCongratulate(app);
}

function applyLegacyQuizDom(session: QuizSession, kanjiCanvasController: KanjiCanvasController): void {
  const question = session.currentQuestion;
  const total = session.totalCount;
  const idx = session.currentIndex;
  setText("questionNumber", `問題 ${idx + 1} / ${total}`);
  setText("topicName", `No. ${idx + 1}`);
  const progressFill = document.getElementById("progressFill") as HTMLElement | null;
  if (progressFill) progressFill.style.width = `${((idx + 1) / total) * 100}%`;
  setText("questionText", question.question);
  applyLegacyFeedback(session, question);
  applyLegacyNavigation(session);
  applyLegacyNotes(session, question, kanjiCanvasController);
}

function applyLegacyFeedback(session: QuizSession, question: Question): void {
  const feedbackDiv = document.getElementById("answerFeedback");
  if (!feedbackDiv) return;
  const userAnswer = session.getAnswer(session.currentIndex);
  if (userAnswer === undefined) {
    feedbackDiv.classList.add("hidden");
    return;
  }
  const isCorrect = question.correct === userAnswer;
  const resultDiv = document.getElementById("feedbackResult");
  const explanationDiv = document.getElementById("feedbackExplanation");
  const userAnswerText =
    question.questionType === "text-input" ? session.getTextAnswer(session.currentIndex) : undefined;
  if (resultDiv) {
    if (isCorrect) {
      resultDiv.textContent = "✅ 正解です！";
    } else if (question.questionType === "text-input") {
      const correctAnswer = question.choices[question.correct] ?? "";
      resultDiv.textContent = userAnswerText
        ? `❌ 不正解です。あなたの解答「${userAnswerText}」→ 正解は「${correctAnswer}」`
        : `❌ 不正解です。正解は「${correctAnswer}」`;
    } else {
      const correctAnswer = question.choices[question.correct] ?? "";
      resultDiv.textContent = `❌ 不正解です。正解は「${correctAnswer}」です。`;
    }
  }
  if (explanationDiv) explanationDiv.textContent = question.explanation;
  feedbackDiv.classList.remove("hidden");
  feedbackDiv.classList.toggle("correct", isCorrect);
  feedbackDiv.classList.toggle("incorrect", !isCorrect);
}

function applyLegacyNavigation(session: QuizSession): void {
  const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement | null;
  const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement | null;
  const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement | null;
  if (!prevBtn || !nextBtn || !submitBtn) return;
  const isLast = session.currentIndex === session.totalCount - 1;
  prevBtn.disabled = session.currentIndex === 0;
  if (isLast) {
    nextBtn.classList.add("hidden");
    submitBtn.classList.remove("hidden");
    submitBtn.disabled = !session.canSubmit();
  } else {
    nextBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
    nextBtn.disabled = session.getAnswer(session.currentIndex) === undefined;
  }
}

function applyLegacyNotes(
  session: QuizSession,
  question: Question,
  kanjiCanvasController: KanjiCanvasController,
): void {
  const notesTitle = document.getElementById("notesTitle");
  const kanjiInputArea = document.getElementById("kanjiInputArea");
  const notesCanvas = document.getElementById("notesCanvas");
  const notesControls = document.querySelector<HTMLElement>(".notes-controls");
  const isAnswered = session.getAnswer(session.currentIndex) !== undefined;
  const showKanji = question.questionType === "text-input" && !isAnswered && kanjiCanvasController.isAvailable();
  if (notesTitle) notesTitle.textContent = showKanji ? "✏️ 1文字ずつ書いて漢字を入力できます" : "タッチペンで書けます";
  if (kanjiInputArea) kanjiInputArea.classList.toggle("hidden", !showKanji);
  if (notesCanvas) notesCanvas.classList.toggle("hidden", showKanji);
  if (notesControls) notesControls.classList.toggle("hidden", showKanji);
  if (!showKanji) return;
  const kanjiInputBody = document.getElementById("kanjiInputBody");
  const kanjiToggleBtn = document.getElementById("kanjiToggleBtn");
  if (kanjiInputBody) kanjiInputBody.classList.remove("hidden");
  if (kanjiToggleBtn) kanjiCanvasController.applyToggleBtnState(kanjiToggleBtn, true);
  kanjiCanvasController.initialize();
  kanjiCanvasController.erase();
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
