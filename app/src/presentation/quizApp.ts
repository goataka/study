/**
 * QuizApp — プレゼンテーション層の UI コントローラー。
 * ビジネスロジックはすべて QuizUseCase に委譲する。
 */

import { QuizUseCase } from "../application/quizUseCase";
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
import { AvatarController } from "./avatarController";

import { SUBJECTS, currentDateString } from "./uiHelpers";
import { showConfirmDialog } from "./quizApp/confirmDialog";
import { updateHeaderTodayDate } from "./quizApp/headerDate";
import { type FontSizeLevel } from "./quizApp/fontSizeManager";
import {
  loadUserName as loadUserNameSetting,
  loadFontSize as loadFontSizeSetting,
  applyFontSize as applyFontSizeSetting,
  loadShareUrl as loadShareUrlSetting,
  saveShareUrl as saveShareUrlSetting,
  loadQuizSettings as loadQuizSettingsSetting,
  saveQuizSettings as saveQuizSettingsSetting,
  loadQuestionCountFromDom as loadQuestionCountFromDomSetting,
  loadRecommendedCounts as loadRecommendedCountsSetting,
  saveRecommendedCounts as saveRecommendedCountsSetting,
} from "./quizApp/appSettingsService";
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
import { getURLParams, parseURLState, syncURLFragment, type ProgressStatusFilter } from "./quizApp/urlStateService";
import { showAnswerFeedback } from "./quizApp/answerFeedback";
import { updateNavigationButtons } from "./quizApp/navigationButtons";
import {
  resolveEffectiveMode,
  tryStartQuizSession,
  confirmAndStartWithAllQuestions,
  submitQuizSession,
  renderResultScreen as renderResultScreenFn,
  checkAllMasteredAndCongratulate as checkAllMasteredAndCongratulateFn,
  isCurrentCategoryLearned as isCurrentCategoryLearnedFn,
} from "./quizApp/quizLifecycle";
import { updateNotesAreaForQuestion } from "./quizApp/notesAreaUpdater";
import { showOverallPanel } from "./quizApp/overallSummaryPanel";
import { renderOverallSummaryPanel as renderOverallSummaryPanelFn } from "./quizApp/overallSummaryRenderer";
import {
  renderProgressView as renderProgressViewFn,
  renderProgressDetailPanel as renderProgressDetailPanelFn,
  renderProgressDetailContent as renderProgressDetailContentFn,
} from "./quizApp/progressTabRenderer";
import { updateSubjectStats } from "./quizApp/categoryStatsView";
import { applyCategoryStatusFilter } from "./quizApp/categoryCollapseState";
import {
  toggleParentCategory as toggleParentCategoryFn,
  expandParentCategory as expandParentCategoryFn,
  toggleTopCategory as toggleTopCategoryFn,
  expandTopCategory as expandTopCategoryFn,
} from "./quizApp/categoryCollapseToggles";
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
import { renderAllSubjectList as renderAllSubjectListFn } from "./quizApp/allSubjectListRenderer";
import {
  updateStartScreen as updateStartScreenFn,
  navigateToAdmin as navigateToAdminFn,
} from "./quizApp/startScreenUpdater";
import { renderCategoryListRouter as renderCategoryListRouterFn } from "./quizApp/categoryListRouter";
import {
  handleTopHeaderClick as handleTopHeaderClickFn,
  handleParentHeaderClick as handleParentHeaderClickFn,
  handleGradeHeaderClick as handleGradeHeaderClickFn,
  deselectAndRefresh as deselectAndRefreshFn,
  selectUnitContext as selectUnitContextFn,
  closeOverallUnitView as closeOverallUnitViewFn,
  navigateBackToList as navigateBackToListFn,
  type SelectionStateAccess,
  type SelectionLifecycleEffects,
} from "./quizApp/selectionHandlers";

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
  /** 進度タブの学習状況フィルター */
  private progressStatusFilter: ProgressStatusFilter = "all";
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
          // 候補ボタンをタップしたあとにモバイルキーボードが再表示されないよう入力欄のフォーカスを外す。
          textInput.blur();
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
    this.subjectRecommendedCounts = loadRecommendedCountsSetting(this.progressRepo);
  }

  /** おすすめ単元の表示数をリポジトリに保存する */
  private saveRecommendedCounts(): void {
    saveRecommendedCountsSetting(this.progressRepo, this.subjectRecommendedCounts);
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
    if (parsed.progressStatusFilter !== undefined) this.progressStatusFilter = parsed.progressStatusFilter;
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
        progressStatusFilter: this.progressStatusFilter,
        categoryViewMode: this.categoryViewMode,
        questionListFilter: this.questionListFilter,
        selectedUnitContext: this.selectedUnitContext,
      },
      screenName,
    );
  }

  private loadUserName(): void {
    this.userName = loadUserNameSetting(this.progressRepo, this.userName);
  }

  private loadFontSize(): void {
    this.fontSizeLevel = loadFontSizeSetting(this.progressRepo, this.fontSizeLevel);
  }

  private loadShareUrl(): void {
    this.shareUrl = loadShareUrlSetting(this.progressRepo);
  }

  /**
   * 保存されたクイズ設定を読み込み、フィールドと DOM に反映する。
   */
  private loadQuizSettings(): void {
    const settings = loadQuizSettingsSetting(this.progressRepo);
    this.questionCount = settings.questionCount;
    this.quizOrder = settings.quizOrder;
    this.includeMastered = settings.includeMastered;
  }

  /**
   * 現在のクイズ設定を保存する。
   */
  private saveQuizSettings(): void {
    saveQuizSettingsSetting(this.progressRepo, {
      questionCount: this.questionCount,
      quizOrder: this.quizOrder,
      includeMastered: this.includeMastered,
    });
  }

  private saveShareUrl(url: string): void {
    this.shareUrl = saveShareUrlSetting(this.progressRepo, url);
  }

  private applyFontSize(level: FontSizeLevel, persist = true): void {
    this.fontSizeLevel = level;
    applyFontSizeSetting(this.progressRepo, level, persist);
  }

  private loadQuestionCountFromDOM(): void {
    this.questionCount = loadQuestionCountFromDomSetting(this.questionCount);
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

  /** selectionHandlers モジュールに渡す状態アクセサーを生成する。 */
  private getSelectionStateAccess(): SelectionStateAccess {
    return {
      filter: this.filter,
      getSelectedTopCategoryId: () => this.selectedTopCategoryId,
      setSelectedTopCategoryId: (v) => {
        this.selectedTopCategoryId = v;
      },
      getSelectedGradeGroup: () => this.selectedGradeGroup,
      setSelectedGradeGroup: (v) => {
        this.selectedGradeGroup = v;
      },
      setSelectedUnitContext: (v) => {
        this.selectedUnitContext = v;
      },
      setIsPanelTabUserSelected: (v) => {
        this.isPanelTabUserSelected = v;
      },
    };
  }

  /** selectionHandlers モジュールに渡すライフサイクルコールバック群を生成する。 */
  private getSelectionLifecycleEffects(): SelectionLifecycleEffects {
    return {
      updateCategoryListActive: () => this.updateCategoryListActive(),
      getHistory: () => this.useCase.getHistory(),
      autoSelectPanelTab: (records) => this.autoSelectPanelTab(records),
      updateStartScreen: (records) => this.updateStartScreen(records),
      syncURLFragment: () => this.syncURLFragment(),
    };
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
    renderCategoryListRouterFn({
      useCase: this.useCase,
      progressRepo: this.progressRepo,
      subject: this.filter.subject,
      categoryViewMode: this.categoryViewMode,
      shareUrl: this.shareUrl,
      renderAllSubjectList: () => this.renderAllSubjectList(),
      renderCategoryViewControls: () => this.renderCategoryViewControls(),
      renderProgressView: () => this.renderProgressView(),
      renderCategoryListByGrade: () => this.renderCategoryListByGrade(),
      renderCategoryListByCategory: () => this.renderCategoryListByCategory(),
      updateCategoryListActive: () => this.updateCategoryListActive(),
      applyCategoryStatusFilter: () => this.applyCategoryStatusFilter(),
      updateSubjectStats: () => this.updateSubjectStats(),
      showConfirmDialog: (msg, alertOnly) => this.showConfirmDialog(msg, alertOnly),
    });
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
    handleTopHeaderClickFn(this.getSelectionStateAccess(), this.getSelectionLifecycleEffects(), topCatId);
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
    handleGradeHeaderClickFn(this.getSelectionStateAccess(), this.getSelectionLifecycleEffects(), grade);
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
    handleParentHeaderClickFn(
      this.getSelectionStateAccess(),
      this.getSelectionLifecycleEffects(),
      () => this.getSelectionLevel(),
      parentCatId,
    );
  }

  /**
   * 「総合」タブ用の教科一覧を描画する。
   * 各教科カードに推奨の単元・学年・進捗率を表示し、クリックで解説パネルを表示する。
   * 同一カテゴリの単元はまとめて表示し、トップカテゴリ・親カテゴリも合わせて表示する。
   */
  private renderAllSubjectList(): void {
    renderAllSubjectListFn({
      useCase: this.useCase,
      subjectRecommendedCounts: this.subjectRecommendedCounts,
      onRecommendedCountChange: (subjectId, count) => {
        this.subjectRecommendedCounts.set(subjectId, count);
        this.saveRecommendedCounts();
        this.renderCategoryList();
      },
      onSelectUnit: (subjectId, categoryId, categoryName) => {
        this.selectUnitContext(subjectId, categoryId, categoryName);
      },
    });
  }

  // ─── 総合タブ専用サマリパネル ───────────────────────────────────────────────

  /**
   * 進度タブ用のビューを描画する。
   * 左パネルに教科リストを表示し、右パネルに選択教科の進度詳細を表示する。
   */
  private renderProgressView(): void {
    renderProgressViewFn({
      useCase: this.useCase,
      progressSubjectId: this.progressSubjectId,
      progressDetailViewMode: this.progressDetailViewMode,
      progressStatusFilter: this.progressStatusFilter,
      progressMatrixTransposed: this.progressMatrixTransposed,
      onSelectSubject: (subjectId) => {
        this.progressSubjectId = subjectId;
        this.selectedUnitContext = null;
        this.renderCategoryList();
        this.updateStartScreen();
        this.syncURLFragment();
      },
      onSelectUnit: (subject, catId, catName) => this.selectUnitContext(subject, catId, catName),
      onToggleMatrixTranspose: () => {
        this.progressMatrixTransposed = !this.progressMatrixTransposed;
        this.renderProgressDetailContent();
        this.syncURLFragment();
      },
      onAfterRender: () => this.updateSubjectStats(),
    });
  }

  /**
   * 進度タブ詳細パネル（右パネル）を描画する。
   * 学年別またはカテゴリ別でグループ化した単元名ブロック列を表示する。
   */
  private renderProgressDetailPanel(): void {
    renderProgressDetailPanelFn({
      useCase: this.useCase,
      progressSubjectId: this.progressSubjectId,
      progressDetailViewMode: this.progressDetailViewMode,
      progressStatusFilter: this.progressStatusFilter,
      progressMatrixTransposed: this.progressMatrixTransposed,
      onSelectUnit: (subject, catId, catName) => this.selectUnitContext(subject, catId, catName),
      onToggleMatrixTranspose: () => {
        this.progressMatrixTransposed = !this.progressMatrixTransposed;
        this.renderProgressDetailContent();
        this.syncURLFragment();
      },
    });
  }

  /**
   * 進度タブ詳細パネルのコンテンツ部分を描画する。
   * progressDetailViewMode に応じて学年別・カテゴリ別・マトリクスを描画する。
   */
  private renderProgressDetailContent(): void {
    renderProgressDetailContentFn({
      useCase: this.useCase,
      progressSubjectId: this.progressSubjectId,
      progressDetailViewMode: this.progressDetailViewMode,
      progressStatusFilter: this.progressStatusFilter,
      progressMatrixTransposed: this.progressMatrixTransposed,
      onSelectUnit: (subject, catId, catName) => this.selectUnitContext(subject, catId, catName),
      onToggleMatrixTranspose: () => {
        this.progressMatrixTransposed = !this.progressMatrixTransposed;
        this.renderProgressDetailContent();
        this.syncURLFragment();
      },
    });
  }

  /**
   * 総合タブ専用のサマリパネルを描画する。
   */
  private renderOverallSummaryPanel(allRecords?: QuizRecord[]): void {
    renderOverallSummaryPanelFn({
      useCase: this.useCase,
      subjectRecommendedCounts: this.subjectRecommendedCounts,
      selectedActivityDate: this.selectedActivityDate,
      activeOverallPanel: this.activeOverallPanel,
      allRecords,
    });
  }

  /**
   * 総合タブのサマリパネルタブ（学習済み / シェア）を切り替える。
   */
  private showOverallPanel(tab: "learned" | "share"): void {
    showOverallPanel(tab);
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
      isGradeGroupSelected: this.selectedGradeGroup !== null,
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
    deselectAndRefreshFn(this.getSelectionStateAccess(), this.getSelectionLifecycleEffects());
  }

  /**
   * 現在タブを維持したまま単元を選択し、詳細表示を更新する。
   */
  private selectUnitContext(subject: string, categoryId: string, categoryName: string): void {
    selectUnitContextFn(this.getSelectionStateAccess(), this.getSelectionLifecycleEffects(), {
      subject,
      categoryId,
      categoryName,
    });
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
    closeOverallUnitViewFn(this.getSelectionStateAccess(), this.getSelectionLifecycleEffects());
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
        selectedGradeGroup: this.selectedGradeGroup,
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
    setupProgressFilterListenersFn((filter) => {
      this.progressStatusFilter = filter;
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
    navigateBackToListFn(this.getSelectionStateAccess(), this.getSelectionLifecycleEffects());
  }

  /**
   * 管理パネルに移動する。モバイルのメニューボタンから呼び出される。
   */
  private navigateToAdmin(): void {
    const ok = navigateToAdminFn(this.filter);
    if (!ok) return;
    this.selectedTopCategoryId = null;
    this.selectedUnitContext = null;
    this.renderCategoryList();
    this.updateStartScreen();
  }

  private updateStartScreen(allRecords?: QuizRecord[]): void {
    updateStartScreenFn({
      useCase: this.useCase,
      filter: this.filter,
      effectiveFilter: this.getEffectiveFilter(),
      activePanelTab: this.activePanelTab,
      hasSelectedUnit: this.selectedUnitContext !== null,
      allRecords,
      isCurrentCategoryLearned: () => this.isCurrentCategoryLearned(),
      updateSubjectStats: () => this.updateSubjectStats(),
      updateQuizPanelVisibility: () => this.updateQuizPanelVisibility(),
      renderHistoryList: (filter, records) => this.renderHistoryList(filter, records),
      renderQuestionList: () => this.renderQuestionList(),
      updateGuidePanelContent: () => this.updateGuidePanelContent(),
      renderOverallSummaryPanel: (records) => this.renderOverallSummaryPanel(records),
    });
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
    toggleParentCategoryFn(this.collapsedParentCategories, parentCatId);
  }

  /**
   * 指定した親カテゴリを強制的に展開する（折りたたまれていれば展開する）。
   */
  private expandParentCategory(parentCatId: string): void {
    expandParentCategoryFn(this.collapsedParentCategories, parentCatId);
  }

  /**
   * 指定したトップカテゴリの折りたたみ状態をトグルする。
   */
  private toggleTopCategory(topCatId: string): void {
    toggleTopCategoryFn(this.collapsedTopCategories, topCatId);
  }

  /**
   * 指定したトップカテゴリを強制的に展開する（折りたたまれていれば展開する）。
   */
  private expandTopCategory(topCatId: string): void {
    expandTopCategoryFn(this.collapsedTopCategories, topCatId);
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  /**
   * 現在選択中のカテゴリが学習済み（🏆）かどうかを返す。
   */
  private isCurrentCategoryLearned(): boolean {
    return isCurrentCategoryLearnedFn(this.useCase, this.getEffectiveFilter());
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
  } /**
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

  private async startQuiz(mode: QuizMode): Promise<void> {
    const effectiveMode = resolveEffectiveMode(mode, this.quizOrder);
    const deps = {
      useCase: this.useCase,
      effectiveFilter: this.getEffectiveFilter(),
      questionCount: this.questionCount,
      includeMastered: this.includeMastered,
      quizOrder: this.quizOrder,
      showConfirmDialog: (message: string, alertOnly?: boolean) => this.showConfirmDialog(message, alertOnly),
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
    this.currentSession = session;
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

  private updateNavigationButtons(session: QuizSession): void {
    updateNavigationButtons(session);
  }

  // ─── 採点 ──────────────────────────────────────────────────────────────────

  private submitQuiz(): void {
    const session = this.currentSession;
    if (!session) return;
    const results = submitQuizSession({
      useCase: this.useCase,
      session,
      effectiveFilter: this.getEffectiveFilter(),
      currentMode: this.currentMode,
      onAfterSubmit: () => {
        // 結果画面へ遷移する前に、スタート画面側の一覧・進捗表示を最新化しておく
        this.renderCategoryList();
        this.updateStartScreen(this.useCase.getHistory());
      },
    });
    this.showResultScreen(results);
  }

  // ─── 結果画面 ──────────────────────────────────────────────────────────────

  private showResultScreen(results: AnswerResult[]): void {
    renderResultScreenFn(results);
    this.showScreen("result");
    // 単元がすべて学習済みになったらポップアップメッセージ
    void this.checkAllMasteredAndCongratulate();
  }

  /**
   * 現在のフィルター対象の問題がすべて学習済みかチェックし、達成時におめでとうメッセージを表示する。
   */
  private async checkAllMasteredAndCongratulate(): Promise<void> {
    await checkAllMasteredAndCongratulateFn({
      useCase: this.useCase,
      effectiveFilter: this.getEffectiveFilter(),
      showConfirmDialog: (msg, alertOnly) => this.showConfirmDialog(msg, alertOnly),
    });
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
    // 教科が明示指定されている場合は、その教科内で最初の単元へ自動移動しない。
    const result = findFirstUnlearnedCategory(
      params.has("subject") || params.has("category") || params.has("unitCategory"),
    );
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
