/**
 * QuizApp — プレゼンテーション層の UI コントローラー。
 * ビジネスロジックはすべて QuizUseCase に委譲し、本体は薄いファサードに留める。
 * 各メソッドの実装は `quizApp/delegators.ts` などのサブモジュールに切り出している。
 */

import { QuizUseCase } from "../application/quizUseCase";
import type { QuizMode, QuizFilter, AnswerResult, QuizRecord, QuizSession, Question } from "../application/quizUseCase";
import type { IProgressRepository, IQuestionRepository } from "../application/ports";
import { NotesCanvas } from "./components/quizScreen/notesCanvas";
import { KanjiCanvasController } from "./components/quizScreen/kanjiCanvasController";
import { NotesController } from "./components/quizScreen/notesController";
import { AvatarController } from "./components/tabsUserRow/avatarController";

import { SUBJECTS, currentDateString } from "./uiHelpers";
import { openConfirmDialog } from "./components/confirmDialogStore";
import { type FontSizeLevel } from "./components/fontSizeStore";
import { clearQuizSessionStore } from "./components/quizSessionStore";
import { getScreenSnapshot, setCurrentScreen, type ScreenName } from "./components/screenStore";
import { updateHeaderTodayDate } from "./quizApp/headerDate";
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
  loadGlobalRecommendedCount as loadGlobalRecommendedCountSetting,
  saveGlobalRecommendedCount as saveGlobalRecommendedCountSetting,
} from "./quizApp/appSettingsService";
import {
  openUserNameEdit as openUserNameEditUi,
  closeUserNameEdit as closeUserNameEditUi,
  readUserNameInput,
  updateUserNameDisplay as updateUserNameDisplayUi,
} from "./quizApp/userNameEditor";
import { getURLParams, parseURLState, syncURLFragment, type ProgressStatusFilter } from "./quizApp/urlStateService";
import { applyCategoryStatusFilter as applyCategoryStatusFilterFn } from "./quizApp/categoryCollapseState";
import { findFirstUnlearnedCategory } from "./quizApp/firstUnlearnedFinder";
import { setupAllListeners } from "./quizApp/setupAllListeners";
import * as D from "./quizApp/delegators";
import type { QuestionListFilter } from "./quizApp/questionListView";
import { setStartQuizAction, setSelectUnitAction } from "./components/learningStatusActionsStore";

const PANEL_TABS: readonly D.PanelTab[] = ["quiz", "guide", "history", "questions"] as const;
const SUPPORT_FIRST_VISIT_KEY = "study-guide-first-visit-done";

export interface QuizAppDefaultDependencies {
  progressRepo: IProgressRepository;
  questionRepo: IQuestionRepository;
}

let defaultDependenciesFactory: (() => QuizAppDefaultDependencies) | null = null;

export function configureQuizAppDefaultDependencies(factory: () => QuizAppDefaultDependencies): void {
  defaultDependenciesFactory = factory;
}

function resolveQuizAppDependencies(
  progressRepo?: IProgressRepository,
  questionRepo?: IQuestionRepository,
): QuizAppDefaultDependencies {
  const defaults = !progressRepo || !questionRepo ? defaultDependenciesFactory?.() : undefined;

  if (!progressRepo && !defaults?.progressRepo) {
    throw new Error("QuizApp の progressRepo が未設定です。composition root で注入してください。");
  }
  if (!questionRepo && !defaults?.questionRepo) {
    throw new Error("QuizApp の questionRepo が未設定です。composition root で注入してください。");
  }

  return {
    progressRepo: progressRepo ?? defaults!.progressRepo,
    questionRepo: questionRepo ?? defaults!.questionRepo,
  };
}

/**
 * QuizApp プレゼンテーション層のメインコントローラ。
 *
 * @internal メンバの大半は同フォルダ内の `quizApp/*` サブモジュールから参照されるため、
 *           TypeScript の private 修飾を外して公開している。外部クライアントから直接
 *           参照することは想定していない。
 */
export class QuizApp {
  private static readonly PANEL_TABS = PANEL_TABS;
  useCase!: QuizUseCase;
  progressRepo: IProgressRepository;
  private readonly questionRepo: IQuestionRepository;
  currentSession: QuizSession | null = null;
  currentMode: QuizMode = "random";
  filter: QuizFilter = { subject: "all", category: "all", parentCategory: undefined };
  userName: string = "ゲスト";
  /** ヘッダーのアバター画像表示・編集ダイアログを担当するコントローラー（コンストラクタで初期化）。 */
  avatarController!: AvatarController;
  questionCount: number = 10;
  /** 手書きメモエリアのコントローラー（コンストラクタで初期化）。 */
  notesController: NotesController = new NotesController();
  /** 既存コードからの後方互換アクセサー（notesController.getCanvas() の薄いラッパー）。 */
  get notesCanvas(): NotesCanvas | null {
    return this.notesController.getCanvas();
  }
  /** 漢字認識キャンバスのコントローラー（コンストラクタで初期化）。 */
  kanjiCanvasController!: KanjiCanvasController;
  activePanelTab: D.PanelTab = "quiz";
  /** ユーザーがパネルタブを明示的に選択した場合は true。自動選択の場合は false。 */
  isPanelTabUserSelected: boolean = false;
  /** カテゴリ一覧の学習状態フィルター */
  categoryStatusFilter: "all" | "unlearned" | "studying" | "learned" = "all";
  /** 折りたたまれている親カテゴリID のセット */
  collapsedParentCategories: Set<string> = new Set();
  /** 折りたたまれているトップカテゴリID のセット */
  collapsedTopCategories: Set<string> = new Set();
  /** 学年フィルター（"小学", "中学", "高校" のいずれか、または null ですべて表示） */
  selectedGradeFilter: string | null = null;
  /** 単元一覧の表示モード（"category"=カテゴリ別, "grade"=学年別） */
  categoryViewMode: "category" | "grade" = "grade";
  /** 折りたたまれている学年グループID のセット（学年別ビュー用） */
  collapsedGradeGroups: Set<string> = new Set();
  /** 学年別ビューで選択中の学年グループID（未選択時は null） */
  selectedGradeGroup: string | null = null;
  /** 現在選択中のトップカテゴリID（トップカテゴリ選択時のみ設定、単元選択時は null） */
  selectedTopCategoryId: string | null = null;
  /** フォントサイズレベル（small=デフォルト, medium, large） */
  fontSizeLevel: FontSizeLevel = "small";
  /** 総合タブの活動サマリ共有 URL */
  shareUrl: string = "";
  /** 活動サマリで表示する日付（YYYY-MM-DD 形式）: 常に今日の日付 */
  selectedActivityDate: string = currentDateString();
  /** 総合タブ・進度タブから単元を選択した場合の選択情報（null の場合は未選択） */
  selectedUnitContext: { subject: string; categoryId: string; categoryName: string } | null = null;
  /**
   * 総合タブで各教科ごとに表示するおすすめ単元数。
   * 現在は全教科共通の `globalRecommendedCount` に置き換わったため未使用（旧フローの互換のため残置）。
   */
  subjectRecommendedCounts: Map<string, number> = new Map();
  /** 全教科共通のおすすめ単元目標数 */
  globalRecommendedCount: number = 5;
  /** 総合タブの現在アクティブなサマリパネル */
  activeOverallPanel: "learned" | "share" = "learned";
  /** 進度タブで選択中の教科ID */
  progressSubjectId: string =
    SUBJECTS.find((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress")?.id ?? "english";
  /** 進度タブ詳細パネルの表示モード（"grade"=学年別, "category"=カテゴリ別, "matrix"=マトリクス） */
  progressDetailViewMode: "grade" | "category" | "matrix" = "matrix";
  /** マトリクス表示の縦横向き（false=学年が行、true=学年が列） */
  progressMatrixTransposed: boolean = false;
  /** 進度タブの学習状況フィルター */
  progressStatusFilter: ProgressStatusFilter = "all";
  /** 解説コンテンツのロードリクエストカウンタ（レースコンディション防止用） */
  guideLoadCounter: number = 0;
  questionListFilter: QuestionListFilter = "all";
  quizOrder: "random" | "straight" = "random";
  includeMastered: boolean = false;

  /**
   * @param progressRepo 進捗リポジトリ。省略時は composition root で設定された既定値を使う。
   * @param questionRepo 問題リポジトリ。省略時は composition root で設定された既定値を使う。
   */
  constructor(progressRepo?: IProgressRepository, questionRepo?: IQuestionRepository) {
    const resolved = resolveQuizAppDependencies(progressRepo, questionRepo);
    this.progressRepo = resolved.progressRepo;
    this.questionRepo = resolved.questionRepo;
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

    this.useCase = new QuizUseCase(this.questionRepo, this.progressRepo);

    try {
      await this.useCase.initialize();
    } catch (error) {
      console.error("問題の読み込みに失敗しました:", error);
      alert("問題の読み込みに失敗しました。ページを再読み込みしてください。");
    }
    this.userName = loadUserNameSetting(this.progressRepo, this.userName);
    this.avatarController.loadFromStorage();
    this.fontSizeLevel = loadFontSizeSetting(this.progressRepo, this.fontSizeLevel);
    this.shareUrl = loadShareUrlSetting(this.progressRepo);
    const settings = loadQuizSettingsSetting(this.progressRepo);
    this.questionCount = settings.questionCount;
    this.quizOrder = settings.quizOrder;
    this.includeMastered = settings.includeMastered;
    this.categoryViewMode = this.progressRepo.loadCategoryViewMode();
    this.loadFilterFromURL();
    this.applyFirstVisitGuidePreference();
    this.questionCount = loadQuestionCountFromDomSetting(this.questionCount);
    this.subjectRecommendedCounts = loadRecommendedCountsSetting(this.progressRepo);
    this.globalRecommendedCount = loadGlobalRecommendedCountSetting(this.progressRepo);
    // 「開始する」ボタンのアクションを登録する
    setStartQuizAction(() => {
      // おすすめ一覧の先頭単元を選択し、未学習は解説・学習済みは確認タブを開く。
      const goalCount = this.globalRecommendedCount;
      const units = this.useCase.getRecommendedUnitsGlobal(goalCount, Math.max(2, Math.ceil(goalCount / 2)));
      if (units.length > 0 && this.selectedUnitContext === null) {
        const first = units[0]!;
        D.selectUnitContext(this, first.subject, first.categoryId, first.categoryName);
        return;
      }
      const records = this.useCase.getHistory();
      D.autoSelectPanelTab(this, records);
      D.updateStartScreen(this, records);
    });
    // 「今日やった単元」から単元詳細を開くアクションを登録する
    setSelectUnitAction((subject, categoryId, categoryName) => {
      D.selectUnitContext(this, subject, categoryId, categoryName);
    });
    this.setupEventListeners();
    D.buildSubjectTabs(this);
    D.buildPanelTabs(this);
    D.setupOverallPanelTabs(this);
    D.setupProgressDetailTabs(this);
    this.selectFirstUnlearnedCategory();
    const initRecords = this.useCase.getHistory();
    D.autoSelectPanelTab(this, initRecords);
    D.updateStartScreen(this, initRecords);
    // 学習状態フィルターの初期状態を画面に適用する
    applyCategoryStatusFilterFn(this.categoryStatusFilter);
    updateUserNameDisplayUi("headerUserName", this.userName);
    this.avatarController.updateDisplay();
    // 共有URL表示ボタンの初期値を設定する
    D.updateShareUrlOpenBtn(this);
    // ヘッダーに今日の日付を表示する
    updateHeaderTodayDate();
  }

  /** おすすめ単元の表示数をリポジトリに保存する */
  saveRecommendedCounts(): void {
    saveRecommendedCountsSetting(this.progressRepo, this.subjectRecommendedCounts);
  }

  /** 全教科共通のおすすめ単元目標数をリポジトリに保存する */
  saveGlobalRecommendedCount(): void {
    saveGlobalRecommendedCountSetting(this.progressRepo, this.globalRecommendedCount);
  }

  /**
   * URL パラメータまたは URL フラグメントからフィルターを読み込む
   * 例: ?subject=english&category=tenses-regular-present
   *     #subject=english&category=tenses-regular-present
   *
   * 注意: `screen` は `quiz`/`result` 状態を保持するためフラグメントに書き出されるが、
   * これらの画面は実行中のクイズセッションを必要とするためリロード時に復元しない。
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
   * URL 指定がない初回アクセス時のみ「ガイド」タブを初期表示にする。
   * 2回目以降は既定の「おすすめ」タブを維持する。
   */
  private applyFirstVisitGuidePreference(): void {
    const params = getURLParams();
    if (params.has("subject")) return;
    if (this.filter.subject !== "all") return;

    const hasVisited = window.localStorage.getItem(SUPPORT_FIRST_VISIT_KEY) === "1";
    if (hasVisited) return;

    this.filter.subject = "support";
    this.filter.category = "all";
    this.filter.parentCategory = undefined;
    this.selectedTopCategoryId = null;
    this.selectedUnitContext = null;
    window.localStorage.setItem(SUPPORT_FIRST_VISIT_KEY, "1");
  }

  /**
   * 現在の画面・教科・単元・パネルタブの状態を URL フラグメントへ反映する。
   */
  syncURLFragment(screenName?: ScreenName): void {
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

  /** 現在のクイズ設定を保存する。 */
  saveQuizSettings(): void {
    saveQuizSettingsSetting(this.progressRepo, {
      questionCount: this.questionCount,
      quizOrder: this.quizOrder,
      includeMastered: this.includeMastered,
    });
  }

  /** 共有 URL を保存して内部状態を更新する。 */
  saveShareUrl(url: string): void {
    this.shareUrl = saveShareUrlSetting(this.progressRepo, url);
  }

  /** フォントサイズを適用し、必要に応じて永続化する。 */
  applyFontSize(level: FontSizeLevel, persist = true): void {
    this.fontSizeLevel = level;
    applyFontSizeSetting(this.progressRepo, level, persist);
  }

  /** ユーザー名編集ダイアログを開く。 */
  openUserNameEdit(): void {
    openUserNameEditUi(this.userName);
  }

  /** ユーザー名編集ダイアログを閉じる。 */
  closeUserNameEdit(): void {
    closeUserNameEditUi();
  }

  /** ヘッダーから入力されたユーザー名を保存する。 */
  saveHeaderUserName(): void {
    const name = readUserNameInput();
    if (name === null) return;
    this.userName = name;
    this.progressRepo.saveUserName(this.userName);
    updateUserNameDisplayUi("headerUserName", this.userName);
    this.closeUserNameEdit();
  }

  /** カテゴリ一覧の学習状態フィルターを設定して反映する */
  setCategoryStatusFilter(filter: "all" | "unlearned" | "studying" | "learned"): void {
    this.categoryStatusFilter = filter;
    applyCategoryStatusFilterFn(this.categoryStatusFilter);
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    setupAllListeners({
      avatarController: this.avatarController,
      onStartRandom: () => {
        D.startQuiz(this, "random").catch(console.error);
      },
      onMarkLearnedToggle: () => D.toggleLearnedStatus(this),
      onPrev: () => D.navigate(this, -1),
      onNext: () => D.navigate(this, 1),
      onSubmit: () => D.submitQuiz(this),
      onRetryAll: () => {
        D.startQuiz(this, "random").catch(console.error);
      },
      onBackToStart: () => this.showScreen("start"),
      onEndLearning: () => {
        // 単元詳細を閉じてスタート画面に戻る
        this.selectedUnitContext = null;
        this.showScreen("start");
      },
      onCancelQuiz: () => {
        void this.navigateToStart();
      },
      onReload: () => location.reload(),
      onQuestionListFilterChange: (value) => {
        this.questionListFilter = value;
        D.renderQuestionList(this);
        this.syncURLFragment();
      },
      onProgressStatusFilterChange: (filter) => {
        this.progressStatusFilter = filter;
        D.renderProgressDetailPanel(this);
        this.syncURLFragment();
      },
      onTitleClick: () => void this.navigateToStart(),
      onOpenUserNameEdit: () => this.openUserNameEdit(),
      onSaveUserName: () => this.saveHeaderUserName(),
      onCancelUserName: () => this.closeUserNameEdit(),
      onAdminMenuClick: () => D.navigateToAdmin(this),
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
      onClearNotes: () => this.notesController.clear(this.currentSession?.currentIndex),
      onToggleEraser: () => this.notesController.toggleEraserMode(),
      onKanjiErase: () => this.kanjiCanvasController.erase(),
      onCategoryStatusFilterChange: (filter) => this.setCategoryStatusFilter(filter),
      onPenSizeChange: (size) => this.notesCanvas?.setPenSize(size),
      onPenColorChange: (color) => this.notesCanvas?.setPenColor(color),
      onFontSizeChange: (size) => this.applyFontSize(size),
      onCopySummary: () => D.copyShareSummary(),
      onOpenShareUrl: () => {
        if (this.shareUrl) {
          window.open(this.shareUrl, "_blank", "noopener,noreferrer");
        }
      },
      onShareUrlDisplayClick: () => D.openShareUrlEdit(this),
      onSaveAndCloseShareUrl: () => D.saveAndCloseShareUrl(this),
      onCloseShareUrlEdit: () => D.closeShareUrlEdit(),
      onPopState: () => this.confirmNavigateToStart(),
      onMobileBack: () => D.navigateBackToList(this),
    });

    // コンテンツパネルの <a href="#subject=...&category=..."> リンクを
    // SPA 内ナビゲーションとして処理するために hashchange を購読する。
    // syncURLFragment は replaceState を使うので hashchange は発火しない（無限ループなし）。
    window.addEventListener("hashchange", () => {
      this.handleHashNavigation();
    });
  }

  /** URL フラグメントの変更（コンテンツリンクのクリックなど）を受けて SPA 内ナビゲーションを行う。 */
  private handleHashNavigation(): void {
    // getURLParams() はクエリパラメータを優先するため、hashchange 経路では
    // window.location.hash を直接パースして常にハッシュ値を参照する。
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const subject = hashParams.get("subject");
    const category = hashParams.get("category");
    const panel = hashParams.get("panel");

    if (!subject) return;

    // parseURLState と同等のバリデーション: 未知の subject / category は無視する。
    const isKnownSubject = subject === "support" || SUBJECTS.some((s) => s.id === subject);
    if (!isKnownSubject) return;

    this.filter.subject = subject;
    if (category && category !== "all") {
      const categories = this.useCase.getCategoriesForSubject(subject);
      this.filter.category = Object.prototype.hasOwnProperty.call(categories, category) ? category : "all";
    } else {
      this.filter.category = "all";
    }
    this.filter.parentCategory = undefined;
    this.selectedTopCategoryId = null;
    this.selectedUnitContext = null;

    const VALID_PANELS: D.PanelTab[] = ["quiz", "guide", "history", "questions"];
    if (panel && VALID_PANELS.includes(panel as D.PanelTab)) {
      this.activePanelTab = panel as D.PanelTab;
      this.isPanelTabUserSelected = true;
    }

    // タブのアクティブ状態とカテゴリ一覧を再描画してから画面遷移する。
    D.selectTabByFilter(this);
    D.renderCategoryList(this);
    this.showScreen("start");
  }

  // ─── 画面切替・ナビゲーション ──────────────────────────────────────────────

  /** カスタム確認ダイアログを表示し、ユーザーの選択を Promise で返す。 */
  showConfirmDialog(message: string, alertOnly = false): Promise<boolean> {
    return openConfirmDialog(message, alertOnly);
  }

  /** クイズが進行中かどうかを返す（クイズ画面かつ未採点）。 */
  private isQuizInProgress(): boolean {
    return !!this.currentSession && getScreenSnapshot() === "quiz";
  }

  /** スタート画面へ遷移できるか判定する。クイズ進行中は確認ダイアログを表示する。 */
  private async confirmNavigateToStart(): Promise<boolean> {
    if (!this.isQuizInProgress()) return true;
    return this.showConfirmDialog("問題が途中です。単元選択に戻りますか？（進行状況は保存されません）");
  }

  /** スタート画面へ遷移する。クイズ進行中は確認ダイアログを表示する。 */
  private async navigateToStart(): Promise<void> {
    const canNavigate = await this.confirmNavigateToStart();
    if (!canNavigate) return;
    this.showScreen("start");
  }

  /** 指定画面へ切り替え、必要であればスタート画面の状態を更新する。 */
  showScreen(screenName: ScreenName): void {
    setCurrentScreen(screenName);

    if (screenName === "start") {
      clearQuizSessionStore();
      this.selectFirstUnlearnedCategory();
      const screenRecords = this.useCase.getHistory();
      D.autoSelectPanelTab(this, screenRecords);
      D.updateStartScreen(this, screenRecords);
    }

    // 画面切り替えを URL フラグメントへ反映する
    this.syncURLFragment(screenName);
  }

  /**
   * 学習済みではない最初のカテゴリを自動選択する。
   * URL パラメータでカテゴリが明示指定されている場合はスキップする。
   */
  private selectFirstUnlearnedCategory(): void {
    if (this.filter.subject === "support") return;
    const params = getURLParams();
    const result = findFirstUnlearnedCategory(
      params.has("subject") || params.has("category") || params.has("unitCategory"),
    );
    if (!result) return;
    this.filter.subject = result.subject;
    this.filter.category = result.category;
    this.filter.parentCategory = result.parentCategory;
    this.selectedTopCategoryId = null;
    D.updateCategoryListActive(this);
    // updateStartScreen() は呼び出し元が担う（二重実行を避けるため）
  }

  /**
   * QuizApp を破棄する際のクリーンアップ。
   * モジュールスコープのシングルトンストアへの参照をクリアし、
   * テストや HMR で複数インスタンスを生成する際のリーク・競合を防ぐ。
   */
  cleanup(): void {
    setStartQuizAction(null);
    setSelectUnitAction(null);
  }
}

// 型再エクスポート（後方互換）
export type { Question, QuizFilter, QuizMode, AnswerResult, QuizRecord };

// アプリケーション起動は React 側（src/main.tsx → src/presentation/App.tsx）で
// 行う。React の useEffect で適切な IProgressRepository 実装を依存注入し、
// `new QuizApp(...)` が 1 度だけ実行される。
