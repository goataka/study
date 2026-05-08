/**
 * QuizApp — プレゼンテーション層の UI コントローラー。
 * ビジネスロジックはすべて QuizUseCase に委譲する。
 */

import { QuizUseCase, ERROR_ALL_MASTERED } from "../application/quizUseCase";
import type { QuizMode, QuizFilter, AnswerResult, QuizRecord } from "../application/quizUseCase";
import { QuizSession } from "../domain/quizSession";
import type { Question } from "../domain/question";
import type { IProgressRepository } from "../application/ports";
import { RemoteQuestionRepository } from "../infrastructure/remoteQuestionRepository";
import { LocalStorageProgressRepository } from "../infrastructure/localStorageProgressRepository";
import { IndexedDBProgressRepository } from "../infrastructure/indexedDBProgressRepository";
import { NotesCanvas } from "./notesCanvas";
import { KanjiCanvasController } from "./kanjiCanvasController";
import { NotesController } from "./notesController";
import { renderAdminContent } from "./adminPanel";
import { AvatarController } from "./avatarController";
import { renderProgressDetailMatrix } from "./progressMatrixView";
import { renderProgressDetailByGrade, renderProgressDetailByCategory } from "./progressBlockView";
import { buildShareSummaryText } from "./shareSummary";
import {
  groupRecommendedByCategory,
  buildSubjectOverviewHeaderRow,
  buildSubjectOverviewEmptyItem,
  buildCategoryGroupHeader,
  buildRecommendedUnitCard,
} from "./allSubjectListView";
import { SUBJECTS, currentDateString, sanitizeShareUrl } from "./uiHelpers";
import { showConfirmDialog } from "./quizApp/confirmDialog";
import { updateHeaderTodayDate } from "./quizApp/headerDate";
import { buildResultItem } from "./quizApp/resultItemView";
import { applyFontSizeToDom, type FontSizeLevel } from "./quizApp/fontSizeManager";
import {
  openUserNameEdit as openUserNameEditUi,
  closeUserNameEdit as closeUserNameEditUi,
  readUserNameInput,
  updateUserNameDisplay as updateUserNameDisplayUi,
} from "./quizApp/userNameEditor";
import {
  updateShareUrlOpenBtn as updateShareUrlOpenBtnUi,
  openShareUrlEdit as openShareUrlEditUi,
  closeShareUrlEdit as closeShareUrlEditUi,
  readShareUrlInput,
} from "./quizApp/shareUrlEditor";
import { copyShareSummary as copyShareSummaryAction } from "./quizApp/shareSummaryActions";
import { loadGuideContent as loadGuideContentFn } from "./quizApp/guideLoader";
import { renderHistoryList as renderHistoryListView } from "./quizApp/historyListView";
import { renderQuestionList as renderQuestionListView, type QuestionListFilter } from "./quizApp/questionListView";
import { getURLParams, parseURLState, syncURLFragment } from "./quizApp/urlStateService";
import { showAnswerFeedback, hideAnswerFeedback } from "./quizApp/answerFeedback";
import { updateNavigationButtons } from "./quizApp/navigationButtons";
import { updateSpeakButton } from "./quizApp/speakButton";
import { renderMultipleChoice, renderTextInput } from "./quizApp/choicesRenderer";
import { renderResultScreenContent } from "./quizApp/resultScreenView";
import { updateNotesAreaForQuestion } from "./quizApp/notesAreaUpdater";
import {
  renderOverallSubjectStatus,
  updateActivityDateDisplay,
  showOverallPanel,
  renderTodayActivity,
} from "./quizApp/overallSummaryPanel";
import { updateSubjectStats } from "./quizApp/categoryStatsView";
import {
  applyParentCategoryCollapsedState,
  applyTopCategoryCollapsedState,
  applyCategoryStatusFilter,
} from "./quizApp/categoryCollapseState";
import { buildProgressSubjectList, syncProgressDetailControls } from "./quizApp/progressView";
import { renderSelectedUnitInfo as renderSelectedUnitInfoFn } from "./quizApp/selectedUnitInfoRenderer";
import { updateGuidePanelContentByIds as updateGuidePanelContentByIdsFn } from "./quizApp/guidePanelUpdater";
import {
  buildSubjectTabs as buildSubjectTabsFn,
  selectTabByFilter as selectTabByFilterFn,
  buildPanelTabs as buildPanelTabsFn,
  setupOverallPanelTabs as setupOverallPanelTabsFn,
  setupProgressDetailTabs as setupProgressDetailTabsFn,
  type PanelTab,
} from "./quizApp/tabsBuilder";
import { renderCategoryViewControls as renderCategoryViewControlsFn } from "./quizApp/categoryViewControls";
import {
  setupHeaderListeners as setupHeaderListenersFn,
  setupAvatarListeners as setupAvatarListenersFn,
  setupQuizSettingsListeners as setupQuizSettingsListenersFn,
  setupCategoryStatusFilterListeners as setupCategoryStatusFilterListenersFn,
  setupFontSizeListeners as setupFontSizeListenersFn,
  setupShareSummaryListeners as setupShareSummaryListenersFn,
  setupHistoryNavigationListeners as setupHistoryNavigationListenersFn,
  setupQuizFlowListeners as setupQuizFlowListenersFn,
  setupQuestionListFilterListeners as setupQuestionListFilterListenersFn,
  setupProgressFilterListeners as setupProgressFilterListenersFn,
  setupNotesListeners as setupNotesListenersFn,
  setupNotesPenSelectListeners as setupNotesPenSelectListenersFn,
  setupKanjiCanvasListeners as setupKanjiCanvasListenersFn,
} from "./quizApp/eventListeners";
import { updateQuizPanelVisibility as updateQuizPanelVisibilityFn } from "./quizApp/quizPanelVisibility";
import {
  updateCategoryListActive as updateCategoryListActiveFn,
  showPanelTab as showPanelTabFn,
} from "./quizApp/categoryListActive";
import { selectNextPanelTab } from "./quizApp/autoSelectPanelTab";
import { renderQuestion as renderQuestionFn } from "./quizApp/questionRenderer";
import { showScreen as showScreenFn, type ScreenName } from "./quizApp/screenNavigator";
import { findFirstUnlearnedCategory } from "./quizApp/firstUnlearnedFinder";
import { updateSelectedUnitInfo as updateSelectedUnitInfoFn } from "./quizApp/selectedUnitInfoUpdater";
import {
  createCategoryItem as createCategoryItemFn,
  buildParentCategoryGroup as buildParentCategoryGroupFn,
  type CreateCategoryItemParams,
  type CategorySelectionCallbacks,
  type BuildParentCategoryGroupParams,
} from "./quizApp/categoryItemBuilder";
import {
  renderCategoryListByCategory as renderCategoryListByCategoryFn,
  renderCategoryListByGrade as renderCategoryListByGradeFn,
} from "./quizApp/categoryListRenderer";

const PANEL_TABS: readonly PanelTab[] = ["quiz", "guide", "history", "questions"] as const;

export class QuizApp {
  private static readonly PANEL_TABS = PANEL_TABS;
  private useCase!: QuizUseCase;
  private progressRepo: IProgressRepository;
  private currentSession: QuizSession | null = null;
  private currentMode: QuizMode = "random";
  private filter: QuizFilter = { subject: "all", category: "all", parentCategory: undefined };
  private userName: string = "ゲスト";
  /** ヘッダーのアバター画像表示・編集ダイアログを担当するコントローラー（コンストラクタで初期化）。 */
  private avatarController!: AvatarController;
  private questionCount: number = 10;
  /** 手書きメモエリアのコントローラー（コンストラクタで初期化）。 */
  private notesController: NotesController = new NotesController();
  /** 既存コードからの後方互換アクセサー（notesController.getCanvas() の薄いラッパー）。 */
  private get notesCanvas(): NotesCanvas | null {
    return this.notesController.getCanvas();
  }
  /** 漢字認識キャンバスのコントローラー（コンストラクタで初期化）。 */
  private kanjiCanvasController!: KanjiCanvasController;
  private activePanelTab: PanelTab = "quiz";
  /** ユーザーがパネルタブを明示的に選択した場合は true。自動選択の場合は false。 */
  private isPanelTabUserSelected: boolean = false;
  /** カテゴリ一覧の学習状態フィルター */
  private categoryStatusFilter: "all" | "unlearned" | "studying" | "learned" = "all";
  /** 折りたたまれている親カテゴリID のセット */
  private collapsedParentCategories: Set<string> = new Set();
  /** 折りたたまれているトップカテゴリID のセット */
  private collapsedTopCategories: Set<string> = new Set();
  /** 学年フィルター（"小学", "中学", "高校" のいずれか、または null ですべて表示） */
  private selectedGradeFilter: string | null = null;
  /** 単元一覧の表示モード（"category"=カテゴリ別, "grade"=学年別） */
  private categoryViewMode: "category" | "grade" = "grade";
  /** 折りたたまれている学年グループID のセット（学年別ビュー用） */
  private collapsedGradeGroups: Set<string> = new Set();
  /** 学年別ビューで選択中の学年グループID（未選択時は null） */
  private selectedGradeGroup: string | null = null;
  /** 現在選択中のトップカテゴリID（トップカテゴリ選択時のみ設定、単元選択時は null） */
  private selectedTopCategoryId: string | null = null;
  /** フォントサイズレベル（small=デフォルト, medium, large） */
  private fontSizeLevel: FontSizeLevel = "small";
  /** 総合タブの活動サマリ共有 URL */
  private shareUrl: string = "";
  /** 活動サマリで表示する日付（YYYY-MM-DD 形式）: 常に今日の日付 */
  private selectedActivityDate: string = currentDateString();
  /** 総合タブ・進度タブから単元を選択した場合の選択情報（null の場合は未選択） */
  private selectedUnitContext: { subject: string; categoryId: string; categoryName: string } | null = null;
  /** 総合タブで各教科ごとに表示するおすすめ単元数 */
  private subjectRecommendedCounts: Map<string, number> = new Map();
  /** 総合タブの現在アクティブなサマリパネル */
  private activeOverallPanel: "learned" | "share" = "learned";
  /** 進度タブで選択中の教科ID */
  private progressSubjectId: string =
    SUBJECTS.find((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress")?.id ?? "english";
  /** 進度タブ詳細パネルの表示モード（"grade"=学年別, "category"=カテゴリ別, "matrix"=マトリクス） */
  private progressDetailViewMode: "grade" | "category" | "matrix" = "matrix";
  /** マトリクス表示の縦横向き（false=学年が行、true=学年が列） */
  private progressMatrixTransposed: boolean = false;
  /** 進度タブで学習済み単元を非表示にするか */
  private hideLearnedProgressUnits: boolean = false;
  /** 解説コンテンツのロードリクエストカウンタ（レースコンディション防止用） */
  private guideLoadCounter: number = 0;
  private questionListFilter: QuestionListFilter = "all";
  private quizOrder: "random" | "straight" = "random";
  private includeMastered: boolean = false;

  /**
   * @param progressRepo 進捗リポジトリ（省略時は LocalStorageProgressRepository を使用）。
   *   本番環境では IndexedDBProgressRepository を渡すこと。
   *   テスト環境では LocalStorageProgressRepository（デフォルト）をそのまま使用できる。
   */
  constructor(progressRepo?: IProgressRepository) {
    this.progressRepo = progressRepo ?? new LocalStorageProgressRepository();
    this.avatarController = new AvatarController(this.progressRepo);
    this.kanjiCanvasController = new KanjiCanvasController({
      getCorrectAnswer: () => {
        const q = this.currentSession?.currentQuestion;
        return q?.choices[q.correct];
      },
      onSelectCandidate: (char) => {
        const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
        if (textInput) {
          textInput.value += char;
          textInput.focus();
        }
      },
    });
    void this.init();
  }

  // ─── 初期化 ────────────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    // initialize() を持つリポジトリ（IndexedDBProgressRepository など）を初期化する
    const repo = this.progressRepo as { initialize?: () => Promise<void> };
    if (typeof repo.initialize === "function") {
      await repo.initialize();
    }

    this.useCase = new QuizUseCase(new RemoteQuestionRepository("questions"), this.progressRepo);

    try {
      await this.useCase.initialize();
    } catch (error) {
      console.error("問題の読み込みに失敗しました:", error);
      alert("問題の読み込みに失敗しました。ページを再読み込みしてください。");
    }
    this.loadUserName();
    this.avatarController.loadFromStorage();
    this.loadFontSize();
    this.loadShareUrl();
    this.loadQuizSettings();
    this.categoryViewMode = this.progressRepo.loadCategoryViewMode();
    this.loadFilterFromURL();
    this.loadQuestionCountFromDOM();
    this.loadRecommendedCounts();
    this.setupEventListeners();
    this.buildSubjectTabs();
    this.buildPanelTabs();
    this.setupOverallPanelTabs();
    this.setupProgressDetailTabs();
    this.updateSubjectStats();
    this.selectFirstUnlearnedCategory();
    const initRecords = this.useCase.getHistory();
    this.autoSelectPanelTab(initRecords);
    this.updateStartScreen(initRecords);
    // 学習状態フィルターの初期状態を画面に適用する
    this.applyCategoryStatusFilter();
    this.updateUserNameDisplay("headerUserName");
    this.avatarController.updateDisplay();
    // 共有URL表示ボタンの初期値を設定する
    this.updateShareUrlOpenBtn();
    // ヘッダーに今日の日付を表示する
    this.updateHeaderTodayDate();
  }

  /** おすすめ単元の表示数をリポジトリから読み込む */
  private loadRecommendedCounts(): void {
    const counts = this.progressRepo.loadRecommendedCounts();
    for (const [subjectId, count] of Object.entries(counts)) {
      this.subjectRecommendedCounts.set(subjectId, count);
    }
  }

  /** おすすめ単元の表示数をリポジトリに保存する */
  private saveRecommendedCounts(): void {
    const obj: Record<string, number> = {};
    this.subjectRecommendedCounts.forEach((count, subjectId) => {
      obj[subjectId] = count;
    });
    this.progressRepo.saveRecommendedCounts(obj);
  }

  /**
   * URLのクエリパラメータとフラグメントを統合して URLSearchParams を返す。
   * クエリパラメータが優先され、フラグメント側は補完として使用する。
   */
  private getURLParams(): URLSearchParams {
    return getURLParams();
  }

  /**
   * URL パラメータまたは URL フラグメントからフィルターを読み込む
   * 例: ?subject=english&category=tenses-regular-present
   *     #subject=english&category=tenses-regular-present
   *
   * 注意: `screen` は `quiz`/`result` 状態を保持するためフラグメントに書き出されるが、
   * これらの画面は実行中のクイズセッションを必要とするためリロード時に復元しない
   * （`screen=start` は初期表示と一致するため特別な処理は不要）。
   */
  private loadFilterFromURL(): void {
    const parsed = parseURLState(this.useCase);
    if (parsed.subject !== undefined) this.filter.subject = parsed.subject;
    if (parsed.category !== undefined) this.filter.category = parsed.category;
    if (parsed.panel !== undefined) {
      this.activePanelTab = parsed.panel;
      this.isPanelTabUserSelected = true;
    }
    if (parsed.overallPanel !== undefined) this.activeOverallPanel = parsed.overallPanel;
    if (parsed.progressSubject !== undefined) this.progressSubjectId = parsed.progressSubject;
    if (parsed.progressView !== undefined) this.progressDetailViewMode = parsed.progressView;
    if (parsed.hideLearnedProgressUnits) this.hideLearnedProgressUnits = true;
    if (parsed.categoryView !== undefined) this.categoryViewMode = parsed.categoryView;
    if (parsed.questionFilter !== undefined) this.questionListFilter = parsed.questionFilter;
    if (parsed.selectedUnitContext !== undefined) this.selectedUnitContext = parsed.selectedUnitContext;
  }

  /**
   * 現在の画面・教科・単元・パネルタブの状態を URL フラグメントへ反映する。
   * クエリパラメータ (?subject=...) が既に指定されている場合はそちらを尊重し、フラグメント側のみ更新する。
   * 表示に影響しないため `replaceState` を用い、履歴スタックには追加しない。
   * `screen=start` は初期状態と一致するためフラグメントに含めない。
   */
  private syncURLFragment(screenName?: ScreenName): void {
    syncURLFragment(
      {
        filter: this.filter,
        activePanelTab: this.activePanelTab,
        activeOverallPanel: this.activeOverallPanel,
        progressSubjectId: this.progressSubjectId,
        progressDetailViewMode: this.progressDetailViewMode,
        hideLearnedProgressUnits: this.hideLearnedProgressUnits,
        categoryViewMode: this.categoryViewMode,
        questionListFilter: this.questionListFilter,
        selectedUnitContext: this.selectedUnitContext,
      },
      screenName,
    );
  }

  private loadUserName(): void {
    const savedName = this.progressRepo.loadUserName();
    if (savedName) {
      this.userName = savedName;
    }
  }

  private loadFontSize(): void {
    const saved = this.progressRepo.loadFontSizeLevel();
    if (saved !== null) {
      this.fontSizeLevel = saved;
    }
    this.applyFontSize(this.fontSizeLevel, false);
  }

  private loadShareUrl(): void {
    const stored = this.progressRepo.loadShareUrl();
    // ロード時にも http/https 検証を行い、不正なスキームを除外する
    this.shareUrl = sanitizeShareUrl(stored);
  }

  /**
   * 保存されたクイズ設定を読み込み、フィールドと DOM に反映する。
   */
  private loadQuizSettings(): void {
    const settings = this.progressRepo.loadQuizSettings();
    this.questionCount = settings.questionCount;
    this.quizOrder = settings.quizOrder;
    this.includeMastered = settings.includeMastered;

    // DOM への反映
    const countInput = document.querySelector<HTMLInputElement>(
      `input[name="questionCount"][value="${settings.questionCount}"]`,
    );
    if (countInput) countInput.checked = true;
    const orderInput = document.querySelector<HTMLInputElement>(
      `input[name="quizOrder"][value="${settings.quizOrder}"]`,
    );
    if (orderInput) orderInput.checked = true;
    const learnedInput = document.querySelector<HTMLInputElement>(
      `input[name="quizLearned"][value="${settings.includeMastered ? "include" : "exclude"}"]`,
    );
    if (learnedInput) learnedInput.checked = true;
  }

  /**
   * 現在のクイズ設定を保存する。
   */
  private saveQuizSettings(): void {
    this.progressRepo.saveQuizSettings({
      questionCount: this.questionCount,
      quizOrder: this.quizOrder,
      includeMastered: this.includeMastered,
    });
  }

  private saveShareUrl(url: string): void {
    // http/https のみ許可し、それ以外のスキームは空扱いにする
    const sanitized = sanitizeShareUrl(url);
    this.shareUrl = sanitized;
    this.progressRepo.saveShareUrl(sanitized);
  }

  private applyFontSize(level: FontSizeLevel, persist = true): void {
    this.fontSizeLevel = level;
    applyFontSizeToDom(level, persist, (l) => this.progressRepo.saveFontSizeLevel(l));
  }

  private loadQuestionCountFromDOM(): void {
    const checked = document.querySelector<HTMLInputElement>('input[name="questionCount"]:checked');
    if (checked) {
      this.questionCount = parseInt(checked.value);
    }
  }

  /**
   * 現在の選択レベルを返す。
   * - "topCategory": トップカテゴリが選択中
   * - "parentCategory": 親カテゴリが選択中（単元は未選択）
   * - "unit": 特定の単元が選択中
   * - "none": 何も選択されていない
   *
   * 状態の不変条件:
   * - `selectedTopCategoryId` が null でない場合、`filter.category` は "all"、`filter.parentCategory` は undefined
   * - `filter.parentCategory` が設定されている場合、`selectedTopCategoryId` は null、`filter.category` は "all"
   * - `filter.category` が "all" でない場合、`selectedTopCategoryId` は null
   * これらは各選択ハンドラー（handleActivate, handleHeaderClick, handleTopHeaderClick）で保証される。
   */
  private getSelectionLevel(): "none" | "topCategory" | "parentCategory" | "unit" {
    if (this.selectedTopCategoryId !== null) return "topCategory";
    if (this.filter.category === "all" && this.filter.parentCategory !== undefined) return "parentCategory";
    if (this.filter.category !== "all") return "unit";
    return "none";
  }

  private openUserNameEdit(): void {
    openUserNameEditUi(this.userName);
  }

  private closeUserNameEdit(): void {
    closeUserNameEditUi();
  }

  private saveHeaderUserName(): void {
    const name = readUserNameInput();
    if (name === null) return;
    this.userName = name;
    this.progressRepo.saveUserName(this.userName);
    this.updateUserNameDisplay("headerUserName");
    this.closeUserNameEdit();
  }

  private buildSubjectTabs(): void {
    buildSubjectTabsFn({
      onSelectSubject: (subjectId) => {
        this.filter.subject = subjectId;
        this.filter.category = "all";
        this.filter.parentCategory = undefined;
        this.selectedTopCategoryId = null;
        this.selectedGradeGroup = null;
        this.selectedUnitContext = null;

        this.renderCategoryList();
        this.updateStartScreen();
        this.syncURLFragment();
      },
    });

    // フィルターに基づいてアクティブタブを設定
    this.selectTabByFilter();
    // カテゴリリストを描画
    this.renderCategoryList();
  }

  /**
   * インナーパネルタブ（クイズモード選択 / 解説 / 履歴 / 問題一覧）を初期化する。
   * data-panel 属性を持つタブのみを対象とし、総合タブ専用の data-overall-panel タブは除外する。
   */
  private buildPanelTabs(): void {
    buildPanelTabsFn({
      onSelectPanelTab: (panel) => {
        this.activePanelTab = panel;
        this.isPanelTabUserSelected = true; // ユーザーが明示的にタブを選択した
        this.showPanelTab(panel);
        if (panel === "guide") {
          this.updateGuidePanelContent();
        } else if (panel === "history") {
          this.renderHistoryList(this.getEffectiveFilter());
        } else if (panel === "questions") {
          this.renderQuestionList();
        }
        this.syncURLFragment();
      },
    });
  }

  /**
   * 総合タブ専用のサマリパネルタブ（学習済み / シェア）を初期化する。
   */
  private setupOverallPanelTabs(): void {
    setupOverallPanelTabsFn((panel) => {
      this.activeOverallPanel = panel;
      this.showOverallPanel(panel);
      this.syncURLFragment();
    });
  }

  /**
   * 進度タブ専用の詳細パネルタブ（学年別 / カテゴリ別）を初期化する。
   */
  private setupProgressDetailTabs(): void {
    setupProgressDetailTabsFn((mode) => {
      this.progressDetailViewMode = mode;
      // 詳細コンテンツを再描画
      this.renderProgressDetailContent();
      this.syncURLFragment();
    });
  }

  /**
   * 現在のフィルター設定に基づいてアクティブタブを設定する
   */
  private selectTabByFilter(): void {
    selectTabByFilterFn(this.filter.subject);
  }

  /**
   * 現在の教科フィルターに応じてカテゴリリストを描画する
   */
  private renderCategoryList(): void {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    categoryList.innerHTML = "";

    const subject = this.filter.subject;

    if (subject === "all") {
      this.renderAllSubjectList();
      this.renderCategoryViewControls();
      return;
    }

    if (subject === "admin") {
      // 管理タブでは学年フィルター・表示切替コントロールを非表示にする
      const controlsEl = document.getElementById("categoryControls");
      if (controlsEl) controlsEl.innerHTML = "";
      // タイトルを「⚙️ メニュー」に変更
      const titleEl = document.getElementById("categoryListTitle");
      if (titleEl) titleEl.textContent = "⚙️ メニュー";
      renderAdminContent(categoryList, {
        useCase: this.useCase,
        progressRepo: this.progressRepo,
        shareUrl: this.shareUrl,
        showConfirmDialog: (msg, alertOnly) => this.showConfirmDialog(msg, alertOnly),
      });
      return;
    }

    if (subject === "progress") {
      // 進度タブ: コントロールをクリアし、タイトルを設定して進度ビューを描画する
      const controlsEl = document.getElementById("categoryControls");
      if (controlsEl) controlsEl.innerHTML = "";
      const titleEl = document.getElementById("categoryListTitle");
      if (titleEl) titleEl.textContent = "📚 教科";
      this.renderProgressView();
      return;
    }

    // コントロールを先に描画し、教科切替時の学年フィルターの妥当性チェックを行う
    this.renderCategoryViewControls();

    // タイトルを「📚 単元一覧」に戻す（管理タブから切り替えた場合）
    const titleEl = document.getElementById("categoryListTitle");
    if (titleEl) titleEl.textContent = "📚 単元一覧";

    if (this.categoryViewMode === "grade") {
      this.renderCategoryListByGrade();
    } else {
      this.renderCategoryListByCategory();
    }

    // アクティブ状態を更新
    this.updateCategoryListActive();
    // 学習状態フィルターを適用する
    this.applyCategoryStatusFilter();
    // 進捗バー・学習状態を更新する（ビューモード・フィルター切替後も正確に反映する）
    this.updateSubjectStats();
  }

  /**
   * カテゴリ別ビューでカテゴリリストを描画する（既存の階層構造）。
   * gradeFilter が設定されている場合は学年でフィルタリングする。
   */
  private renderCategoryListByCategory(): void {
    renderCategoryListByCategoryFn({
      useCase: this.useCase,
      subject: this.filter.subject,
      gradeFilterMatches: (s, c) => this.gradeFilterMatches(s, c),
      collapsedTopCategories: this.collapsedTopCategories,
      getSelectedTopCategoryId: () => this.selectedTopCategoryId,
      itemCtx: this.getCategoryItemContext(),
      parentGroupCtx: this.getParentGroupContext(),
      onTopHeaderClick: (topCatId) => this.handleTopHeaderClick(topCatId),
      onToggleTopCategory: (topCatId) => this.toggleTopCategory(topCatId),
    });
  }

  /** トップカテゴリヘッダークリック時の選択／非選択トグル処理。 */
  private handleTopHeaderClick(topCatId: string): void {
    if (this.selectedTopCategoryId === topCatId) {
      // 既に選択中 → 非選択に戻す
      this.selectedTopCategoryId = null;
    } else {
      // 選択（単元選択・親カテゴリ選択を解除してトップカテゴリを選択）
      this.selectedTopCategoryId = topCatId;
      this.filter.category = "all";
      this.filter.parentCategory = undefined;
      this.selectedGradeGroup = null;
      this.selectedUnitContext = null;
      this.isPanelTabUserSelected = false;
    }
    this.updateCategoryListActive();
    const records = this.useCase.getHistory();
    this.autoSelectPanelTab(records);
    this.updateStartScreen(records);
  }

  /**
   * 学年別ビューでカテゴリリストを描画する。
   * 学年グループ（小学1年, 中学1年 等）でまとめて表示する。
   */
  private renderCategoryListByGrade(): void {
    renderCategoryListByGradeFn({
      useCase: this.useCase,
      subject: this.filter.subject,
      selectedGradeFilter: this.selectedGradeFilter,
      collapsedGradeGroups: this.collapsedGradeGroups,
      itemCtx: this.getCategoryItemContext(),
      onGradeHeaderClick: (grade) => this.handleGradeHeaderClick(grade),
    });
  }

  /** 学年グループヘッダークリック時の選択／非選択トグル処理。 */
  private handleGradeHeaderClick(grade: string): void {
    if (this.selectedGradeGroup === grade) {
      this.selectedGradeGroup = null;
    } else {
      this.selectedGradeGroup = grade;
      this.selectedTopCategoryId = null;
      this.filter.parentCategory = undefined;
      this.filter.category = "all";
      this.selectedUnitContext = null;
      this.isPanelTabUserSelected = false;
    }
    this.updateCategoryListActive();
    const records = this.useCase.getHistory();
    this.autoSelectPanelTab(records);
    this.updateStartScreen(records);
  }

  /**
   * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）を描画する。
   */
  private renderCategoryViewControls(): void {
    renderCategoryViewControlsFn({
      useCase: this.useCase,
      progressRepo: this.progressRepo,
      subject: this.filter.subject,
      categoryViewMode: this.categoryViewMode,
      selectedGradeFilter: this.selectedGradeFilter,
      onViewModeChange: (mode) => {
        this.categoryViewMode = mode;
        this.renderCategoryList();
        this.syncURLFragment();
      },
      onGradeFilterChange: (prefix) => {
        this.selectedGradeFilter = prefix;
        this.renderCategoryList();
      },
      onGradeFilterReset: () => {
        this.selectedGradeFilter = null;
      },
    });
  }

  /**
   * 現在の学年フィルターに対してカテゴリが表示対象かを返す。
   * フィルターが null の場合は常に true を返す。
   * カテゴリに referenceGrade が設定されていない場合、フィルターが設定されていれば false。
   */
  private gradeFilterMatches(subject: string, categoryId: string): boolean {
    if (!this.selectedGradeFilter) return true;
    const grade = this.useCase.getCategoryReferenceGrade(subject, categoryId);
    if (!grade) return false;
    return grade.startsWith(this.selectedGradeFilter);
  }

  /**
   * 親カテゴリグループ要素を生成して返す。
   * トップカテゴリグループの子として使われる場合は topCatId を渡す。
   */
  private buildParentCategoryGroup(
    subject: string,
    parentCatId: string,
    parentCatName: string,
    cats: Record<string, string>,
    topCatId?: string,
  ): HTMLElement {
    return buildParentCategoryGroupFn(
      this.getParentGroupContext(),
      subject,
      parentCatId,
      parentCatName,
      cats,
      topCatId,
    );
  }

  /** buildParentCategoryGroup に渡す共通コンテキストを生成する。 */
  private getParentGroupContext(): BuildParentCategoryGroupParams {
    return {
      filter: this.filter,
      collapsedParentCategories: this.collapsedParentCategories,
      getSelectionLevel: () => this.getSelectionLevel(),
      itemCtx: this.getCategoryItemContext(),
      onParentHeaderClick: (pid) => this.handleParentHeaderClick(pid),
      onToggleParentCategory: (pid) => this.toggleParentCategory(pid),
    };
  }

  /** 親カテゴリヘッダークリック時の選択／非選択トグル処理。 */
  private handleParentHeaderClick(parentCatId: string): void {
    if (this.getSelectionLevel() === "parentCategory" && this.filter.parentCategory === parentCatId) {
      // 既に選択中 → 非選択に戻す
      this.filter.parentCategory = undefined;
    } else {
      // 選択（単元選択・トップカテゴリ選択を解除して親カテゴリを選択）
      this.selectedTopCategoryId = null;
      this.filter.category = "all";
      this.filter.parentCategory = parentCatId;
      this.selectedGradeGroup = null;
      this.selectedUnitContext = null;
      this.isPanelTabUserSelected = false;
    }
    this.updateCategoryListActive();
    const records = this.useCase.getHistory();
    this.autoSelectPanelTab(records);
    this.updateStartScreen(records);
  }

  /**
   * 「総合」タブ用の教科一覧を描画する。
   * 各教科カードに推奨の単元・学年・進捗率を表示し、クリックで解説パネルを表示する。
   * 同一カテゴリの単元はまとめて表示し、トップカテゴリ・親カテゴリも合わせて表示する。
   */
  private renderAllSubjectList(): void {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;
    categoryList.innerHTML = "";

    const nonAllSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
    const studiedKeys = this.useCase.getStudiedCategoryKeys();

    for (const subject of nonAllSubjects) {
      const count = this.subjectRecommendedCounts.get(subject.id) ?? 1;
      const recommendedList = this.useCase.getRecommendedCategoriesForSubject(subject.id, count);

      const wrapper = document.createElement("div");
      wrapper.className = "subject-overview-wrapper";

      // 教科名行: アイコン・名称と教科ごとの表示数コントロール
      wrapper.appendChild(
        buildSubjectOverviewHeaderRow(subject, count, (n) => {
          this.subjectRecommendedCounts.set(subject.id, n);
          this.saveRecommendedCounts();
          this.renderCategoryList();
        }),
      );

      if (recommendedList.length === 0) {
        wrapper.appendChild(buildSubjectOverviewEmptyItem(subject.id));
        categoryList.appendChild(wrapper);
        continue;
      }

      // 同一親カテゴリでグループ化（未学習を含むグループ／単元が先頭）
      const groups = groupRecommendedByCategory(subject.id, recommendedList, this.useCase);

      // グループごとにヘッダーとカードを描画する
      for (const group of groups) {
        const catGroup = document.createElement("div");
        catGroup.className = "subject-overview-cat-group";

        const header = buildCategoryGroupHeader(group);
        if (header) catGroup.appendChild(header);

        for (const recommended of group.items) {
          const { mastered, total } = this.useCase.getMasteredCountForCategory(subject.id, recommended.id);
          const inProgressCount = this.useCase.getInProgressCount({ subject: subject.id, category: recommended.id });
          const catKey = `${subject.id}::${recommended.id}`;
          const isAllMastered = total > 0 && mastered === total;
          const isStudying = !isAllMastered && (inProgressCount > 0 || studiedKeys.has(catKey));

          catGroup.appendChild(
            buildRecommendedUnitCard(subject.id, recommended, { mastered, total, inProgressCount, isStudying }, () =>
              this.selectUnitContext(subject.id, recommended.id, recommended.name),
            ),
          );
        }

        wrapper.appendChild(catGroup);
      }

      categoryList.appendChild(wrapper);
    }
  }

  // ─── 総合タブ専用サマリパネル ───────────────────────────────────────────────

  /**
   * 進度タブ用のビューを描画する。
   * 左パネルに教科リストを表示し、右パネルに選択教科の進度詳細を表示する。
   */
  private renderProgressView(): void {
    const categoryList = document.getElementById("categoryList");
    const controlsEl = document.getElementById("categoryControls");
    if (!categoryList) return;
    categoryList.innerHTML = "";
    if (controlsEl) controlsEl.innerHTML = "";

    // ── 左パネル: 教科リスト ──
    categoryList.appendChild(
      buildProgressSubjectList(this.useCase, {
        currentSubjectId: this.progressSubjectId,
        onSelectSubject: (subjectId) => {
          this.progressSubjectId = subjectId;
          this.selectedUnitContext = null;
          this.renderCategoryList();
          this.updateStartScreen();
          this.syncURLFragment();
        },
      }),
    );

    // ── 右パネル: 進度詳細 ──
    this.renderProgressDetailPanel();

    this.updateSubjectStats();
  }

  /**
   * 進度タブ詳細パネル（右パネル）を描画する。
   * 学年別またはカテゴリ別でグループ化した単元名ブロック列を表示する。
   */
  private renderProgressDetailPanel(): void {
    syncProgressDetailControls(this.progressDetailViewMode, this.hideLearnedProgressUnits);
    this.renderProgressDetailContent();
  }

  /**
   * 進度タブ詳細パネルのコンテンツ部分を描画する。
   * progressDetailViewMode に応じて学年別・カテゴリ別・マトリクスを描画する。
   */
  private renderProgressDetailContent(): void {
    const content = document.getElementById("progressDetailContent");
    if (!content) return;
    content.innerHTML = "";

    const blockCtx = {
      subject: this.progressSubjectId,
      useCase: this.useCase,
      hideLearned: this.hideLearnedProgressUnits,
      onSelectUnit: (subject: string, catId: string, catName: string) =>
        this.selectUnitContext(subject, catId, catName),
    };
    if (this.progressDetailViewMode === "grade") {
      renderProgressDetailByGrade(content, blockCtx);
    } else if (this.progressDetailViewMode === "matrix") {
      renderProgressDetailMatrix(content, {
        subject: this.progressSubjectId,
        useCase: this.useCase,
        transposed: this.progressMatrixTransposed,
        hideLearned: this.hideLearnedProgressUnits,
        onToggleTranspose: () => {
          this.progressMatrixTransposed = !this.progressMatrixTransposed;
          this.renderProgressDetailContent();
          this.syncURLFragment();
        },
        onSelectUnit: blockCtx.onSelectUnit,
      });
    } else {
      renderProgressDetailByCategory(content, blockCtx);
    }
  }

  /**
   * 総合タブ専用のサマリパネルを描画する。
   */
  private renderOverallSummaryPanel(allRecords?: QuizRecord[]): void {
    const panel = document.getElementById("overallSummaryPanel");
    if (!panel) return;

    const records = allRecords ?? this.useCase.getHistory();
    this.updateActivityDateDisplay();
    this.renderOverallSubjectStatus();
    this.renderTodayActivity(records);
    this.updateShareSummaryText(records);
    this.showOverallPanel(this.activeOverallPanel);
  }

  /**
   * 総合タブの「学習状況」用に、教科ごとの目標数に対する学習数とメッセージを表示する。
   */
  private renderOverallSubjectStatus(): void {
    renderOverallSubjectStatus(this.useCase, this.subjectRecommendedCounts);
  }

  /**
   * 活動ラベルを本日実施した単元数（⭐の数、完了単元は🏆）に更新する。
   */
  private updateActivityDateDisplay(): void {
    updateActivityDateDisplay(this.useCase, this.selectedActivityDate);
  }

  /**
   * 総合タブのサマリパネルタブ（学習済み / シェア）を切り替える。
   */
  private showOverallPanel(tab: "learned" | "share"): void {
    showOverallPanel(tab);
  }

  /**
   * 今日の活動セクションを描画する。
   * selectedActivityDate の日付と一致するクイズ記録を履歴と同じ形式で表示する。
   */
  private renderTodayActivity(records: QuizRecord[]): void {
    renderTodayActivity(records, this.useCase, this.selectedActivityDate);
  }

  /**
   * SNS 共有用の活動サマリテキストを構築して shareSummaryText 要素に反映する。
   */
  private updateShareSummaryText(records: QuizRecord[]): void {
    const el = document.getElementById("shareSummaryText");
    if (el) {
      el.textContent = buildShareSummaryText(records, this.selectedActivityDate, this.useCase);
    }
  }

  /**
   * 活動サマリテキストをクリップボードにコピーする。
   */
  private copyShareSummary(): void {
    copyShareSummaryAction();
  }

  private updateShareUrlOpenBtn(): void {
    updateShareUrlOpenBtnUi(this.shareUrl);
  }

  private openShareUrlEdit(): void {
    openShareUrlEditUi(this.shareUrl);
  }

  private closeShareUrlEdit(): void {
    closeShareUrlEditUi();
  }

  private saveAndCloseShareUrl(): void {
    const value = readShareUrlInput();
    if (value !== null) {
      this.saveShareUrl(value);
      this.updateShareUrlOpenBtn();
    }
    this.closeShareUrlEdit();
  }

  private createCategoryItem(
    subject: string,
    categoryId: string,
    categoryName: string,
    parentCatId?: string,
    topCatId?: string,
  ): HTMLElement {
    return createCategoryItemFn(
      this.getCategoryItemContext(),
      subject,
      categoryId,
      categoryName,
      parentCatId,
      topCatId,
    );
  }

  /** createCategoryItem / buildParentCategoryGroup に共通で渡すコンテキストを生成する。 */
  private getCategoryItemContext(): CreateCategoryItemParams {
    return {
      useCase: this.useCase,
      filter: this.filter,
      categoryViewMode: this.categoryViewMode,
      setFilter: (subject, categoryId, parentCatId) => {
        this.filter.subject = subject;
        this.filter.category = categoryId;
        this.filter.parentCategory = parentCatId;
      },
      resetSelectionOnUnit: () => {
        this.selectedTopCategoryId = null;
        this.selectedGradeGroup = null;
      },
      setPanelTabUserSelected: (value) => {
        this.isPanelTabUserSelected = value;
      },
      callbacks: this.getCategorySelectionCallbacks(),
    };
  }

  /** カテゴリ選択時の共通コールバック群を生成する。 */
  private getCategorySelectionCallbacks(): CategorySelectionCallbacks {
    return {
      onDeselect: () => this.deselectAndRefresh(),
      onSelectTabByFilter: () => this.selectTabByFilter(),
      onRenderCategoryList: () => this.renderCategoryList(),
      onUpdateCategoryListActive: () => this.updateCategoryListActive(),
      onAutoSelectPanelTab: () => {
        const records = this.useCase.getHistory();
        this.autoSelectPanelTab(records);
      },
      onUpdateStartScreen: () => {
        const records = this.useCase.getHistory();
        this.updateStartScreen(records);
      },
      onSyncURLFragment: () => this.syncURLFragment(),
    };
  }

  /**
   * 現在のフィルターに基づいてカテゴリアイテムのアクティブ状態を更新する。
   * アクティブなカテゴリが折りたたまれているグループに属する場合は自動展開する。
   */
  private updateCategoryListActive(): void {
    updateCategoryListActiveFn({
      filter: this.filter,
      selectionLevel: this.getSelectionLevel(),
      selectedTopCategoryId: this.selectedTopCategoryId,
      selectedGradeGroup: this.selectedGradeGroup,
      collapsedGradeGroups: this.collapsedGradeGroups,
      expandParentCategory: (parentCatId) => this.expandParentCategory(parentCatId),
      expandTopCategory: (topCatId) => this.expandTopCategory(topCatId),
    });
  }

  /**
   * インナーパネルタブのコンテンツ表示を切り替える
   */
  private showPanelTab(tab: PanelTab): void {
    showPanelTabFn(tab);
  }

  /**
   * 解答履歴の有無でパネルタブを自動選択する。
   * ユーザーが明示的にパネルタブを選択している場合は自動選択をスキップする。
   * 特定カテゴリが選択されている場合は解答履歴があれば「確認」タブ、なければ「解説」タブを表示する。
   * category が "all" の場合は「確認」タブに戻す（解説タブが残ると selectFirstUnlearnedCategory が
   * 再度カテゴリを選択してしまうため）。
   * @param allRecords - 呼び出し元で取得済みの履歴配列（二重ロードを避けるために渡す）
   */
  private autoSelectPanelTab(allRecords: QuizRecord[]): void {
    this.activePanelTab = selectNextPanelTab(allRecords, {
      isPanelTabUserSelected: this.isPanelTabUserSelected,
      activePanelTab: this.activePanelTab,
      selectedUnitContext: this.selectedUnitContext
        ? { subject: this.selectedUnitContext.subject, categoryId: this.selectedUnitContext.categoryId }
        : null,
      selectionLevel: this.getSelectionLevel(),
      filter: this.filter,
    });
    this.showPanelTab(this.activePanelTab);
  }

  // ─── 解説パネル ────────────────────────────────────────────────────────────

  /**
   * 選択を完全に解除して UI を更新する共通処理。
   * 閉じるボタンや単元アイテムのトグル（既選択クリック）から呼び出す。
   */
  private deselectAndRefresh(): void {
    this.filter.category = "all";
    this.filter.parentCategory = undefined;
    this.selectedTopCategoryId = null;
    this.selectedGradeGroup = null;
    this.isPanelTabUserSelected = false;
    this.updateCategoryListActive();
    const records = this.useCase.getHistory();
    this.autoSelectPanelTab(records);
    this.updateStartScreen(records);
    this.syncURLFragment();
  }

  /**
   * 現在タブを維持したまま単元を選択し、詳細表示を更新する。
   */
  private selectUnitContext(subject: string, categoryId: string, categoryName: string): void {
    this.selectedUnitContext = { subject, categoryId, categoryName };
    this.isPanelTabUserSelected = false;
    const records = this.useCase.getHistory();
    this.autoSelectPanelTab(records);
    this.updateStartScreen(records);
    this.syncURLFragment();
  }

  /**
   * 選択中の単元・カテゴリ情報パネルを更新する。
   * 単元・親カテゴリ・トップカテゴリが選択されている場合に情報を表示し、
   * 閉じるボタン（×）で選択を解除できるようにする。
   *
   * レイアウト（単元選択時）:
   *   行1: [タイトル（左）] [説明（右）]
   *   行2: [カテゴリ・学年（左）] [例文（右）]
   *   行3: [ステータスバー（全幅）]
   */
  private updateSelectedUnitInfo(): void {
    updateSelectedUnitInfoFn({
      useCase: this.useCase,
      filter: this.filter,
      selectionLevel: this.getSelectionLevel(),
      selectedUnitContext: this.selectedUnitContext,
      categoryViewMode: this.categoryViewMode,
      selectedGradeGroup: this.selectedGradeGroup,
      selectedTopCategoryId: this.selectedTopCategoryId,
      onCloseOverallUnitView: () => this.closeOverallUnitView(),
      onDeselect: () => this.deselectAndRefresh(),
    });
  }

  /**
   * 単元 1 件分の詳細パネル（タイトル・カテゴリ・例文・進捗バー＋閉じるボタン）を
   * #selectedUnitInfo コンテナに描画する。
   */
  private renderSelectedUnitInfo(
    container: HTMLElement,
    subject: string,
    categoryId: string,
    categoryName: string,
    closeAriaLabel: string,
    onClose: () => void,
  ): void {
    renderSelectedUnitInfoFn(this.useCase, container, subject, categoryId, categoryName, closeAriaLabel, onClose);
  }

  private updateGuidePanelContent(): void {
    this.updateGuidePanelContentByIds("guidePanelFrame", "guideNoContent");
  }

  /**
   * 選択した単元の解説表示を閉じ、単元未選択の一覧画面に戻る。
   */
  private closeOverallUnitView(): void {
    this.selectedUnitContext = null;
    const records = this.useCase.getHistory();
    this.updateStartScreen(records);
    this.syncURLFragment();
  }

  /**
   * 指定したコンテナ要素と空表示要素 ID を使って解説コンテンツを更新する共通処理。
   * 選択レベルに応じて解説URLを決定する：
   * - 単元選択: 単元の guideUrl
   * - 親カテゴリ選択: parentCategoryGuideUrl
   * - トップカテゴリ選択: topCategoryGuideUrl
   * - 未選択: 最初に利用可能な guideUrl
   */
  private updateGuidePanelContentByIds(frameId: string, noContentId: string): void {
    void updateGuidePanelContentByIdsFn(
      this.useCase,
      {
        selectedUnitContext: this.selectedUnitContext,
        filter: this.filter,
        selectedTopCategoryId: this.selectedTopCategoryId,
        selectionLevel: this.getSelectionLevel(),
      },
      {
        nextToken: () => ++this.guideLoadCounter,
        currentToken: () => this.guideLoadCounter,
      },
      frameId,
      noContentId,
    );
  }

  /**
   * 指定した div 要素に解説 HTML を fetch して直接挿入する。
   * Shadow DOM や iframe を使わず、親ページのフォントサイズが自然に継承される。
   *
   * セキュリティ: script 要素・on* 属性・外部リソースを除去したうえで挿入する。
   * レースコンディション対策: 最後に開始したリクエストのみ反映し、古いリクエストを破棄する。
   *
   * @param container - 解説コンテンツを挿入するコンテナ要素
   * @param guideUrl  - 解説ページの URL（相対パスまたは同一オリジンの Jekyll 生成 HTML）
   * @param noContent - 解説なしメッセージ要素（任意）
   */
  private async loadGuideContent(container: HTMLElement, guideUrl: string, noContent?: HTMLElement): Promise<void> {
    await loadGuideContentFn(
      container,
      guideUrl,
      {
        nextToken: () => ++this.guideLoadCounter,
        currentToken: () => this.guideLoadCounter,
      },
      noContent,
    );
  }

  // ─── 回答記録 ──────────────────────────────────────────────────────────────

  /**
   * 回答記録一覧を描画する
   * filter の subject・category に応じて記録を絞り込む
   * @param allRecords - 呼び出し元で取得済みの履歴配列（省略時は内部でロードする）
   */
  private renderHistoryList(filter: QuizFilter, allRecords?: QuizRecord[]): void {
    renderHistoryListView(filter, this.useCase, allRecords);
  }

  // ─── 問題一覧パネル ────────────────────────────────────────────────────────

  /**
   * 現在のフィルターに基づいて問題一覧パネルを描画する
   */
  private renderQuestionList(): void {
    renderQuestionListView(this.getEffectiveFilter(), this.questionListFilter, this.useCase);
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.setupQuizFlowListeners();
    this.setupQuestionListFilterListeners();
    this.setupProgressFilterListeners();
    this.setupHeaderListeners();
    this.setupAvatarListeners();
    this.setupQuizSettingsListeners();
    this.setupNotesListeners();
    this.setupKanjiCanvasListeners();
    this.setupCategoryStatusFilterListeners();
    this.setupNotesPenSelectListeners();
    this.setupFontSizeListeners();
    this.setupShareSummaryListeners();
    this.setupHistoryNavigationListeners();
  }

  /** クイズ進行ボタン（開始・前後・採点・キャンセルなど）のリスナー登録 */
  private setupQuizFlowListeners(): void {
    setupQuizFlowListenersFn({
      onStartRandom: () => {
        this.startQuiz("random").catch(console.error);
      },
      onMarkLearnedToggle: () => this.toggleLearnedStatus(),
      onPrev: () => this.navigate(-1),
      onNext: () => this.navigate(1),
      onSubmit: () => this.submitQuiz(),
      onRetryAll: () => {
        this.startQuiz("random").catch(console.error);
      },
      onBackToStart: () => this.showScreen("start"),
      onCancelQuiz: () => {
        void this.navigateToStart();
      },
      onReload: () => location.reload(),
    });
  }

  /** 問題一覧の学習状態フィルターボタンのリスナー登録 */
  private setupQuestionListFilterListeners(): void {
    setupQuestionListFilterListenersFn((value) => {
      this.questionListFilter = value;
      this.renderQuestionList();
      this.syncURLFragment();
    });
  }

  private setupProgressFilterListeners(): void {
    setupProgressFilterListenersFn((hide) => {
      this.hideLearnedProgressUnits = hide;
      this.renderProgressDetailPanel();
      this.syncURLFragment();
    });
  }

  /** ヘッダー部分（タイトル・ユーザー名編集）のリスナー登録 */
  private setupHeaderListeners(): void {
    setupHeaderListenersFn({
      onTitleClick: () => void this.navigateToStart(),
      onOpenUserNameEdit: () => this.openUserNameEdit(),
      onSaveUserName: () => this.saveHeaderUserName(),
      onCancelUserName: () => this.closeUserNameEdit(),
      onAdminMenuClick: () => this.navigateToAdmin(),
    });
  }

  /** アバター画像（ヘッダーのアイコン＋クロップダイアログ）のリスナー登録 */
  private setupAvatarListeners(): void {
    setupAvatarListenersFn(this.avatarController);
  }

  /** クイズ設定（問題数・並び順・学習済み含む）ラジオボタンのリスナー登録 */
  private setupQuizSettingsListeners(): void {
    setupQuizSettingsListenersFn({
      onQuestionCountChange: (count) => {
        this.questionCount = count;
        this.saveQuizSettings();
      },
      onQuizOrderChange: (order) => {
        this.quizOrder = order;
        this.saveQuizSettings();
      },
      onIncludeMasteredChange: (include) => {
        this.includeMastered = include;
        this.saveQuizSettings();
      },
    });
  }

  /** メモエリアのコントロール（クリア・消しゴム）のリスナー登録 */
  private setupNotesListeners(): void {
    setupNotesListenersFn({
      onClear: () => this.notesController.clear(this.currentSession?.currentIndex),
      onToggleEraser: () => this.notesController.toggleEraserMode(),
    });
  }

  /** 漢字認識キャンバス（KanjiCanvas）のリスナー登録 */
  private setupKanjiCanvasListeners(): void {
    setupKanjiCanvasListenersFn({
      onDeleteLast: () => this.kanjiCanvasController.deleteLast(),
      onErase: () => this.kanjiCanvasController.erase(),
      onApplyToggleBtnState: (btn, expanded) => this.kanjiCanvasController.applyToggleBtnState(btn, expanded),
    });
  }

  /** カテゴリ一覧の学習状態フィルターボタンのリスナー登録 */
  private setupCategoryStatusFilterListeners(): void {
    setupCategoryStatusFilterListenersFn((filter) => this.setCategoryStatusFilter(filter));
  }

  /** メモエリアのペンサイズ・ペン色セレクトのリスナー登録 */
  private setupNotesPenSelectListeners(): void {
    setupNotesPenSelectListenersFn({
      onPenSizeChange: (size) => this.notesCanvas?.setPenSize(size),
      onPenColorChange: (color) => this.notesCanvas?.setPenColor(color),
    });
  }

  /** フォントサイズ切替ボタンのリスナー登録 */
  private setupFontSizeListeners(): void {
    setupFontSizeListenersFn((size) => this.applyFontSize(size));
  }

  /** 総合タブ: 活動サマリのコピーと共有 URL 関連のリスナー登録 */
  private setupShareSummaryListeners(): void {
    setupShareSummaryListenersFn({
      onCopySummary: () => this.copyShareSummary(),
      onOpenShareUrl: () => {
        if (this.shareUrl) {
          window.open(this.shareUrl, "_blank", "noopener,noreferrer");
        }
      },
      onShareUrlDisplayClick: () => this.openShareUrlEdit(),
      onSaveAndCloseShareUrl: () => this.saveAndCloseShareUrl(),
      onCloseShareUrlEdit: () => this.closeShareUrlEdit(),
    });
  }

  /** ブラウザ履歴・モバイル戻るボタンのナビゲーション系リスナー登録 */
  private setupHistoryNavigationListeners(): void {
    setupHistoryNavigationListenersFn({
      onPopState: () => this.navigateToStart(),
      onMobileBack: () => this.navigateBackToList(),
    });
  }

  // ─── スタート画面 ──────────────────────────────────────────────────────────

  /**
   * 現在有効なクイズフィルターを返す。
   * 総合タブからおすすめ単元を選択している場合は、その単元の subject/categoryId を含むフィルターを返す。
   * それ以外の場合は通常の this.filter をそのまま返す。
   */
  private getEffectiveFilter(): QuizFilter {
    if (this.selectedUnitContext !== null) {
      return {
        subject: this.selectedUnitContext.subject,
        category: this.selectedUnitContext.categoryId,
        parentCategory: undefined,
      };
    }
    return this.filter;
  }

  /**
   * スマホ用：単元詳細パネルから単元一覧パネルに戻る。
   * 単元・カテゴリ選択を解除して単元一覧を表示する。
   */
  private navigateBackToList(): void {
    if (this.filter.subject === "all" || this.filter.subject === "progress") {
      // 総合タブ・進度タブの場合は単元選択を解除する
      this.selectedUnitContext = null;
    } else {
      // 通常タブの場合は単元・カテゴリ選択を解除する
      this.filter.category = "all";
      this.filter.parentCategory = undefined;
      this.selectedTopCategoryId = null;
    }
    this.isPanelTabUserSelected = false;
    const records = this.useCase.getHistory();
    this.updateStartScreen(records);
    this.syncURLFragment();
  }

  /**
   * 管理パネルに移動する。モバイルのメニューボタンから呼び出される。
   */
  private navigateToAdmin(): void {
    const tabsContainer = document.querySelector(".subject-tabs");
    if (!tabsContainer) return;

    this.filter.subject = "admin";
    this.filter.category = "all";
    this.filter.parentCategory = undefined;
    this.selectedTopCategoryId = null;
    this.selectedUnitContext = null;

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

    this.renderCategoryList();
    this.updateStartScreen();
  }

  private updateStartScreen(allRecords?: QuizRecord[]): void {
    this.updateSubjectStats();
    this.updateQuizPanelVisibility();
    const statsInfo = document.getElementById("statsInfo");
    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement | null;
    if (!statsInfo) return;

    const effectiveFilter = this.getEffectiveFilter();
    const filteredQuestions = this.useCase.getFilteredQuestions(effectiveFilter);
    const filteredCount = filteredQuestions.length;
    const masteredIdsSet = new Set(this.useCase.getMasteredIds());
    const masteredInFilter = filteredQuestions.filter((q) => masteredIdsSet.has(q.id)).length;
    // 学習中: 1回以上回答済みで未習得の問題（イシュー要件: 1回以上回答で学習済みになっていないもの）
    const inProgressInFilter = filteredQuestions.filter((q) => {
      return this.useCase.getQuestionStat(q.id).total > 0 && !masteredIdsSet.has(q.id);
    }).length;

    statsInfo.textContent = `全：${filteredCount}問 / 学習中：${inProgressInFilter}問 / 学習済：${masteredInFilter}問`;

    // 特定カテゴリが選択されている場合のみ「学習済みにする」ボタンを有効化
    if (markLearnedBtn) {
      markLearnedBtn.disabled = effectiveFilter.category === "all";
      markLearnedBtn.textContent = this.isCurrentCategoryLearned() ? "↩ 未学習に戻す" : "✅ 学習済みにする";
    }

    this.renderHistoryList(effectiveFilter, allRecords);
    if (this.activePanelTab === "questions") {
      this.renderQuestionList();
    }
    if (this.activePanelTab === "guide") {
      this.updateGuidePanelContent();
    }
    if (this.filter.subject === "all") {
      if (this.selectedUnitContext !== null) {
        // 総合タブで単元選択中: 解説コンテンツを更新する
        this.updateGuidePanelContent();
      } else {
        this.renderOverallSummaryPanel(allRecords);
      }
    }
  }

  private updateSubjectStats(): void {
    updateSubjectStats(this.useCase);
  }

  /**
   * カテゴリ一覧の学習状態フィルターを設定してリストに反映する
   */
  private setCategoryStatusFilter(filter: "all" | "unlearned" | "studying" | "learned"): void {
    this.categoryStatusFilter = filter;
    this.applyCategoryStatusFilter();
  }

  /**
   * 現在の categoryStatusFilter に応じて categoryList に CSS クラスを付与する
   */
  private applyCategoryStatusFilter(): void {
    applyCategoryStatusFilter(this.categoryStatusFilter);
  }

  /**
   * 指定した親カテゴリの折りたたみ状態をトグルする。
   * 折りたたまれていれば展開し、展開されていれば折りたたむ。
   */
  private toggleParentCategory(parentCatId: string): void {
    if (this.collapsedParentCategories.has(parentCatId)) {
      this.collapsedParentCategories.delete(parentCatId);
    } else {
      this.collapsedParentCategories.add(parentCatId);
    }
    this.applyParentCategoryCollapsedState(parentCatId);
  }

  /**
   * 指定した親カテゴリを強制的に展開する（折りたたまれていれば展開する）。
   */
  private expandParentCategory(parentCatId: string): void {
    if (!this.collapsedParentCategories.has(parentCatId)) return;
    this.collapsedParentCategories.delete(parentCatId);
    this.applyParentCategoryCollapsedState(parentCatId);
  }

  /**
   * 指定した親カテゴリの折りたたみ状態を DOM に反映する。
   */
  private applyParentCategoryCollapsedState(parentCatId: string): void {
    applyParentCategoryCollapsedState(parentCatId, this.collapsedParentCategories.has(parentCatId));
  }

  /**
   * 指定したトップカテゴリの折りたたみ状態をトグルする。
   */
  private toggleTopCategory(topCatId: string): void {
    if (this.collapsedTopCategories.has(topCatId)) {
      this.collapsedTopCategories.delete(topCatId);
    } else {
      this.collapsedTopCategories.add(topCatId);
    }
    this.applyTopCategoryCollapsedState(topCatId);
  }

  /**
   * 指定したトップカテゴリを強制的に展開する（折りたたまれていれば展開する）。
   */
  private expandTopCategory(topCatId: string): void {
    if (!this.collapsedTopCategories.has(topCatId)) return;
    this.collapsedTopCategories.delete(topCatId);
    this.applyTopCategoryCollapsedState(topCatId);
  }

  /**
   * 指定したトップカテゴリの折りたたみ状態を DOM に反映する。
   */
  private applyTopCategoryCollapsedState(topCatId: string): void {
    applyTopCategoryCollapsedState(topCatId, this.collapsedTopCategories.has(topCatId));
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  /**
   * 現在選択中のカテゴリが学習済み（🏆）かどうかを返す。
   */
  private isCurrentCategoryLearned(): boolean {
    const effectiveFilter = this.getEffectiveFilter();
    if (effectiveFilter.category === "all") return false;
    const { mastered, total } = this.useCase.getMasteredCountForCategory(
      effectiveFilter.subject,
      effectiveFilter.category,
    );
    // 全問題が masteredIds にある場合のみ「学習済み」とみなす（updateSubjectStats と統一）
    return total > 0 && mastered === total;
  }

  /**
   * 現在選択中のカテゴリの学習済み状態をトグルする。
   * 学習済みなら未学習に戻し、そうでなければ学習済みにする。
   */
  private toggleLearnedStatus(): void {
    const effectiveFilter = this.getEffectiveFilter();
    const isCurrentlyLearned = this.isCurrentCategoryLearned();
    const message = isCurrentlyLearned ? "この単元を未学習に戻しますか？" : "この単元を学習済みにしますか？";
    void this.showConfirmDialog(message)
      .then((confirmed) => {
        if (!confirmed) return;
        if (isCurrentlyLearned) {
          this.useCase.unmarkCategoryAsLearned(effectiveFilter);
        } else {
          this.useCase.markCategoryAsLearned(effectiveFilter);
        }
        this.updateStartScreen();
      })
      .catch(console.error);
  }

  /**
   * クイズパネルの表示/非表示を更新する。
   * 教科タブでカテゴリが未選択（category === "all"）の場合はクイズパネルを非表示にし、
   * カテゴリが選択されている場合は表示する。
   * 「総合」タブ（subject === "all"）では通常のパネルタブを非表示にし、総合サマリパネルを表示する。
   */
  private updateQuizPanelVisibility(): void {
    updateQuizPanelVisibilityFn({
      subject: this.filter.subject,
      hasSelectedUnit: this.selectedUnitContext !== null,
      selectionLevel: this.getSelectionLevel(),
      isGradeGroupSelected:
        this.categoryViewMode === "grade" && this.selectedGradeGroup !== null && this.filter.subject !== "all",
      activePanelTab: this.activePanelTab,
      onRenderProgressDetail: () => this.renderProgressDetailPanel(),
      onShowPanelTab: (tab) => this.showPanelTab(tab),
      onUpdateSelectedUnitInfo: () => this.updateSelectedUnitInfo(),
    });
  }

  /**
   * 現在選択中のカテゴリを学習済みとしてマークする。
   * 解答なしでも単元を学習済みにできる。
   */
  private markCategoryAsLearned(): void {
    this.useCase.markCategoryAsLearned(this.filter);
    this.updateStartScreen();
  }

  private async startQuiz(mode: QuizMode): Promise<void> {
    // "random" モードでストレート順が選択されている場合は内部的に "practice"（順番通り）モードを使用する。
    // ストレート＝問題を登録順に出題するため、QuizSession.pickInOrder を使う practice モードにマップする。
    const effectiveMode: QuizMode = mode === "random" && this.quizOrder === "straight" ? "practice" : mode;
    try {
      if (this.includeMastered) {
        this.currentSession = this.useCase.startSessionWithAllQuestions(
          effectiveMode,
          this.getEffectiveFilter(),
          this.questionCount,
        );
      } else {
        this.currentSession = this.useCase.startSession(effectiveMode, this.getEffectiveFilter(), this.questionCount);
      }
    } catch (error) {
      if (error instanceof Error && error.message === ERROR_ALL_MASTERED) {
        const confirmed = await this.showConfirmDialog(
          "すべての問題が学習済みです。全問題からランダムに出題しますか？",
        );
        if (confirmed) {
          try {
            // 全問出題時は常にランダム順で開始する
            this.currentSession = this.useCase.startSessionWithAllQuestions(
              "random",
              this.getEffectiveFilter(),
              this.questionCount,
            );
          } catch (innerError) {
            alert(innerError instanceof Error ? innerError.message : "エラーが発生しました");
            return;
          }
        } else {
          return;
        }
      } else {
        alert(error instanceof Error ? error.message : "エラーが発生しました");
        return;
      }
    }

    this.currentMode = effectiveMode;

    // メモ状態をリセット
    this.notesController.clearAllStates();

    this.showScreen("quiz");
    document.getElementById("quizScreen")?.classList.toggle("practice-mode", effectiveMode === "practice");
    this.notesController.initialize();
    this.notesCanvas?.clear();
    this.renderQuestion();
  }

  // ─── 問題表示 ──────────────────────────────────────────────────────────────

  private renderQuestion(): void {
    const session = this.currentSession;
    if (!session) return;
    renderQuestionFn(session, this.kanjiCanvasController, {
      onAnswered: (q, idx, text) => {
        this.showAnswerFeedback(q, idx, text);
        this.updateNavigationButtons(session);
      },
      onTextAnswered: (q) => {
        // 確認後は確定ボタンも非表示にする（キーボード入力で回答済みになったため）
        this.updateNotesAreaForQuestion(q, true);
      },
    });
  }

  private renderChoices(question: Question, session: QuizSession): void {
    const callbacks = {
      onAnswered: (q: Question, idx: number, text?: string) => {
        this.showAnswerFeedback(q, idx, text);
        this.updateNavigationButtons(session);
      },
      onTextAnswered: (q: Question) => {
        this.updateNotesAreaForQuestion(q, true);
      },
    };
    if (question.questionType === "text-input") {
      renderTextInput(question, session, callbacks);
    } else {
      renderMultipleChoice(question, session, callbacks);
    }
  }

  /**
   * 読み上げボタンの表示を更新する。英語の問題かつ Web Speech API が利用可能な場合のみ
   * ボタンを表示し、クリック時にアメリカ英語（en-US）で読み上げる。
   */
  private updateSpeakButton(question: Question): void {
    updateSpeakButton(question);
  }

  private renderMultipleChoice(question: Question, session: QuizSession): void {
    renderMultipleChoice(question, session, {
      onAnswered: (q, idx, text) => {
        this.showAnswerFeedback(q, idx, text);
        this.updateNavigationButtons(session);
      },
    });
  }

  private renderTextInput(question: Question, session: QuizSession): void {
    renderTextInput(question, session, {
      onAnswered: (q, idx, text) => {
        this.showAnswerFeedback(q, idx, text);
        this.updateNavigationButtons(session);
      },
      onTextAnswered: (q) => {
        this.updateNotesAreaForQuestion(q, true);
      },
    });
  }

  /**
   * メモエリアをtextinput問題のKanjiCanvas入力用に更新する。
   * - text-input問題かつ未回答かつKanjiCanvas利用可能の場合: KanjiCanvas入力エリアを表示、ノートキャンバスを非表示
   * - それ以外: KanjiCanvas入力エリアを非表示、ノートキャンバスを表示
   * 問題遷移のたびに呼ばれる。
   */
  private updateNotesAreaForQuestion(question: Question | null, isAnswered: boolean): void {
    updateNotesAreaForQuestion(question, isAnswered, this.kanjiCanvasController);
  }

  private navigate(direction: 1 | -1): void {
    const session = this.currentSession;
    if (!session) return;

    // 現在のメモ状態を保存
    this.notesController.saveState(session.currentIndex);

    session.navigate(direction);
    this.renderQuestion();

    // 新しい問題のメモ状態を復元
    this.notesController.restoreState(session.currentIndex);
  }

  private showAnswerFeedback(question: Question, userAnswerIndex: number, userAnswerText?: string): void {
    showAnswerFeedback(question, userAnswerIndex, userAnswerText);
  }

  private hideAnswerFeedback(): void {
    hideAnswerFeedback();
  }

  private updateNavigationButtons(session: QuizSession): void {
    updateNavigationButtons(session);
  }

  // ─── 採点 ──────────────────────────────────────────────────────────────────

  private submitQuiz(): void {
    const session = this.currentSession;
    if (!session) return;
    const results = this.useCase.submitSession(session);
    this.useCase.addHistoryRecord(results, this.getEffectiveFilter(), this.currentMode);
    // 結果画面へ遷移する前に、スタート画面側の一覧・進捗表示を最新化しておく
    this.renderCategoryList();
    this.updateStartScreen(this.useCase.getHistory());
    this.showResultScreen(results);
  }

  // ─── 結果画面 ──────────────────────────────────────────────────────────────

  private showResultScreen(results: AnswerResult[]): void {
    renderResultScreenContent(results);
    this.showScreen("result");
    // 単元がすべて学習済みになったらポップアップメッセージ
    void this.checkAllMasteredAndCongratulate();
  }

  /**
   * 現在のフィルター対象の問題がすべて学習済みかチェックし、達成時におめでとうメッセージを表示する。
   */
  private async checkAllMasteredAndCongratulate(): Promise<void> {
    const effectiveFilter = this.getEffectiveFilter();
    const filteredQuestions = this.useCase.getFilteredQuestions(effectiveFilter);
    if (filteredQuestions.length === 0) return;
    const masteredSet = new Set(this.useCase.getMasteredIds());
    const allMastered = filteredQuestions.every((q) => masteredSet.has(q.id));
    if (allMastered) {
      await this.showConfirmDialog("🎉 おめでとうございます！\nこの単元のすべての問題を学習済みにしました！", true);
    }
  }

  private buildResultItem(r: AnswerResult): HTMLElement {
    return buildResultItem(r);
  }

  // ─── 画面切替・ナビゲーション ──────────────────────────────────────────────

  /**
   * クイズが進行中かどうかを返す（クイズ画面かつ未採点）
   */
  private isQuizInProgress(): boolean {
    const quizScreen = document.getElementById("quizScreen");
    return !!this.currentSession && !quizScreen?.classList.contains("hidden");
  }

  /**
   * カスタム確認ダイアログを表示し、ユーザーの選択を Promise で返す。
   */
  private showConfirmDialog(message: string, alertOnly = false): Promise<boolean> {
    return showConfirmDialog(message, alertOnly);
  }

  /**
   * スタート画面へ遷移する。クイズ進行中は確認ダイアログを表示する。
   */
  private async navigateToStart(): Promise<void> {
    if (this.isQuizInProgress()) {
      const confirmed = await this.showConfirmDialog(
        "問題が途中です。単元選択に戻りますか？（進行状況は保存されません）",
      );
      if (!confirmed) return;
    }
    this.showScreen("start");
  }

  private showScreen(screenName: ScreenName): void {
    showScreenFn(screenName);

    if (screenName === "start") {
      this.updateSubjectStats();
      this.selectFirstUnlearnedCategory();
      const screenRecords = this.useCase.getHistory();
      this.autoSelectPanelTab(screenRecords);
      this.updateStartScreen(screenRecords);
    }

    // 画面切り替えを URL フラグメントへ反映する
    this.syncURLFragment(screenName);
  }

  /**
   * 学習済みではない最初のカテゴリを自動選択する。
   * スタート画面の表示時に呼び出されることで、次に学習すべき単元を案内する。
   * URLパラメータでカテゴリが明示指定されている場合はスキップする。
   */
  private selectFirstUnlearnedCategory(): void {
    const params = this.getURLParams();
    const result = findFirstUnlearnedCategory(params.has("category") || params.has("unitCategory"));
    if (!result) return;
    this.filter.subject = result.subject;
    this.filter.category = result.category;
    this.filter.parentCategory = result.parentCategory;
    this.selectedTopCategoryId = null;
    this.updateCategoryListActive();
    // updateStartScreen() は呼び出し元が担う（二重実行を避けるため）
  }

  // ─── ユーティリティ ────────────────────────────────────────────────────────

  private updateUserNameDisplay(elementId: string): void {
    updateUserNameDisplayUi(elementId, this.userName);
  }

  /**
   * ヘッダーに今日の日付を表示する。
   */
  private updateHeaderTodayDate(): void {
    updateHeaderTodayDate();
  }
}

// アプリケーション起動
document.addEventListener("DOMContentLoaded", () => {
  new QuizApp(new IndexedDBProgressRepository());
});
