/**
 * QuizApp — プレゼンテーション層の UI コントローラー。
 * ビジネスロジックはすべて QuizUseCase に委譲する。
 */

import { QuizUseCase, ERROR_ALL_MASTERED } from "../application/quizUseCase";
import type { QuizMode, QuizFilter, AnswerResult, QuizRecord } from "../application/quizUseCase";
import { QuizSession } from "../domain/quizSession";
import type { Question } from "../domain/question";
import { shuffleChoices } from "../domain/question";
import type { IProgressRepository } from "../application/ports";
import { RemoteQuestionRepository } from "../infrastructure/remoteQuestionRepository";
import { LocalStorageProgressRepository } from "../infrastructure/localStorageProgressRepository";
import { IndexedDBProgressRepository } from "../infrastructure/indexedDBProgressRepository";
import { NotesCanvas } from "./notesCanvas";
import type { DrawingState } from "./notesCanvas";

/** 教科一覧（タブ表示用） */
const SUBJECTS = [
  { id: "all", name: "おすすめ", icon: "✨" },
  { id: "progress", name: "進度", icon: "📈" },
  { id: "english", name: "英語", icon: "📚" },
  { id: "math", name: "数学", icon: "🔢" },
  { id: "japanese", name: "国語", icon: "📖" },
  { id: "admin", name: "管理", icon: "⚙️" },
] as const;

/** 参考学年文字列から CSS クラス名を返す（小学→grade-elementary, 中学→grade-middle, 高校→grade-high） */
function gradeColorClass(referenceGrade: string): string {
  if (referenceGrade.startsWith("小")) return "grade-elementary";
  if (referenceGrade.startsWith("中")) return "grade-middle";
  if (referenceGrade.startsWith("高")) return "grade-high";
  return "";
}

/**
 * 2色進捗バーの幅（%）を計算する。
 * Math.round の丸め誤差で masteredPct + inProgressPct が 100% を超えないようにクランプする。
 */
function calcDualProgressPct(
  mastered: number, wrong: number, total: number
): { masteredPct: number; inProgressPct: number } {
  if (total === 0) return { masteredPct: 0, inProgressPct: 0 };
  const masteredPct = Math.round((mastered / total) * 100);
  const inProgressPct = Math.min(Math.round((wrong / total) * 100), 100 - masteredPct);
  return { masteredPct, inProgressPct };
}

export class QuizApp {
  private useCase!: QuizUseCase;
  private progressRepo: IProgressRepository;
  private currentSession: QuizSession | null = null;
  private currentMode: QuizMode = "random";
  private filter: QuizFilter = { subject: "all", category: "all", parentCategory: undefined };
  private userName: string = "ゲスト";
  private questionCount: number = 10;
  private notesCanvas: NotesCanvas | null = null;
  private notesStates: Map<number, DrawingState> = new Map();
  private kanjiCanvasInitialized: boolean = false;
  /** ref-patterns.js の遅延ロードPromise（重複ロード防止用） */
  private refPatternsLoadPromise: Promise<void> | null = null;
  private activePanelTab: "quiz" | "guide" | "history" | "questions" = "quiz";
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
  private categoryViewMode: "category" | "grade" = "category";
  /** 折りたたまれている学年グループID のセット（学年別ビュー用） */
  private collapsedGradeGroups: Set<string> = new Set();
  /** 現在選択中のトップカテゴリID（トップカテゴリ選択時のみ設定、単元選択時は null） */
  private selectedTopCategoryId: string | null = null;
  /** フォントサイズレベル（small=デフォルト, medium, large） */
  private fontSizeLevel: "small" | "medium" | "large" = "small";
  /** 総合タブの活動サマリ共有 URL */
  private shareUrl: string = "";
  /** 活動サマリで表示する日付（YYYY-MM-DD 形式）: 常に今日の日付 */
  private selectedActivityDate: string = QuizApp.currentDateString();
  /** 総合タブから単元を選択した場合の選択情報（null の場合は未選択） */
  private overallUnitSelected: { subject: string; categoryId: string; categoryName: string } | null = null;
  /** 総合タブで各教科ごとに表示するおすすめ単元数 */
  private subjectRecommendedCounts: Map<string, number> = new Map();
  /** 総合タブの現在アクティブなサマリパネル */
  private activeOverallPanel: "learned" | "share" = "learned";
  /** 進度タブで選択中の教科ID */
  private progressSubjectId: string = SUBJECTS.find((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress")?.id ?? "english";
  /** 解説コンテンツのロードリクエストカウンタ（レースコンディション防止用） */
  private guideLoadCounter: number = 0;
  private questionListFilter: "all" | "learned" | "unlearned" = "all";
  private quizOrder: "random" | "straight" = "random";
  private includeMastered: boolean = false;

  /**
   * @param progressRepo 進捗リポジトリ（省略時は LocalStorageProgressRepository を使用）。
   *   本番環境では IndexedDBProgressRepository を渡すこと。
   *   テスト環境では LocalStorageProgressRepository（デフォルト）をそのまま使用できる。
   */
  constructor(progressRepo?: IProgressRepository) {
    this.progressRepo = progressRepo ?? new LocalStorageProgressRepository();
    void this.init();
  }

  // ─── 初期化 ────────────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    // initialize() を持つリポジトリ（IndexedDBProgressRepository など）を初期化する
    const repo = this.progressRepo as { initialize?: () => Promise<void> };
    if (typeof repo.initialize === "function") {
      await repo.initialize();
    }

    this.useCase = new QuizUseCase(
      new RemoteQuestionRepository("questions"),
      this.progressRepo
    );

    try {
      await this.useCase.initialize();
    } catch (error) {
      console.error("問題の読み込みに失敗しました:", error);
      alert("問題の読み込みに失敗しました。ページを再読み込みしてください。");
    }
    this.loadUserName();
    this.loadFontSize();
    this.loadShareUrl();
    this.loadQuizSettings();
    this.loadFilterFromURL();
    this.loadQuestionCountFromDOM();
    this.loadCategoryViewModeFromStorage();
    this.loadRecommendedCounts();
    this.setupEventListeners();
    this.buildSubjectTabs();
    this.buildPanelTabs();
    this.setupOverallPanelTabs();
    this.updateSubjectStats();
    this.selectFirstUnlearnedCategory();
    const initRecords = this.useCase.getHistory();
    this.autoSelectPanelTab(initRecords);
    this.updateStartScreen(initRecords);
    // 学習状態フィルターの初期状態を画面に適用する
    this.applyCategoryStatusFilter();
    this.updateUserNameDisplay("headerUserName");
    // 共有URL表示ボタンの初期値を設定する
    this.updateShareUrlOpenBtn();
    // ヘッダーに今日の日付を表示する
    this.updateHeaderTodayDate();
  }

  /**
   * 進捗リポジトリから学年別/カテゴリ別表示モードを読み込む。
   */
  private loadCategoryViewModeFromStorage(): void {
    this.categoryViewMode = this.progressRepo.loadCategoryViewMode();
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
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    // フラグメントの値はクエリパラメータに存在しない場合のみ補完する
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
    return params;
  }

  /**
   * URL パラメータまたは URL フラグメントからフィルターを読み込む
   * 例: ?subject=english&category=tenses-regular-present
   *     #subject=english&category=tenses-regular-present
   */
  private loadFilterFromURL(): void {
    const params = this.getURLParams();
    const subject = params.get("subject");
    const category = params.get("category");

    if (subject) {
      this.filter.subject = subject;
    }
    if (category && category !== "all") {
      this.filter.category = category;
    } else if (subject) {
      // subjectが指定されているがcategoryがない場合は"all"
      this.filter.category = "all";
    }
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
    this.shareUrl = this.sanitizeShareUrl(stored);
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
    const countInput = document.querySelector<HTMLInputElement>(`input[name="questionCount"][value="${settings.questionCount}"]`);
    if (countInput) countInput.checked = true;
    const orderInput = document.querySelector<HTMLInputElement>(`input[name="quizOrder"][value="${settings.quizOrder}"]`);
    if (orderInput) orderInput.checked = true;
    const learnedInput = document.querySelector<HTMLInputElement>(`input[name="quizLearned"][value="${settings.includeMastered ? "include" : "exclude"}"]`);
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
    const sanitized = this.sanitizeShareUrl(url);
    this.shareUrl = sanitized;
    this.progressRepo.saveShareUrl(sanitized);
  }

  /**
   * 共有 URL を検証し、http/https スキームの場合のみそのまま返す。
   * それ以外（javascript: 等）は空文字を返す。
   */
  private sanitizeShareUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? trimmed : "";
    } catch {
      return "";
    }
  }

  private applyFontSize(level: "small" | "medium" | "large", persist = true): void {
    this.fontSizeLevel = level;
    document.body.classList.remove("font-size-medium", "font-size-large");
    if (level === "medium") {
      document.body.classList.add("font-size-medium");
    } else if (level === "large") {
      document.body.classList.add("font-size-large");
    }
    // ボタンのアクティブ状態を更新
    document.querySelectorAll<HTMLButtonElement>(".font-size-btn").forEach((btn) => {
      const active = btn.dataset.size === level;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    // 初期復元時は保存をスキップし、ユーザー操作時のみ保存する
    if (persist) {
      this.progressRepo.saveFontSizeLevel(level);
    }
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
    const nameBtn = document.getElementById("headerUserName");
    const editArea = document.getElementById("headerUserEdit");
    const input = document.getElementById("headerUserNameInput") as HTMLInputElement | null;
    if (!nameBtn || !editArea || !input) return;

    input.value = this.userName === "ゲスト" ? "" : this.userName;
    nameBtn.classList.add("hidden");
    editArea.classList.remove("hidden");
    input.focus();
    input.select();
  }

  private closeUserNameEdit(): void {
    const nameBtn = document.getElementById("headerUserName");
    const editArea = document.getElementById("headerUserEdit");
    if (!nameBtn || !editArea) return;

    editArea.classList.add("hidden");
    nameBtn.classList.remove("hidden");
  }

  private saveHeaderUserName(): void {
    const input = document.getElementById("headerUserNameInput") as HTMLInputElement | null;
    if (!input) return;

    const name = input.value.trim();
    this.userName = name || "ゲスト";
    this.progressRepo.saveUserName(this.userName);
    this.updateUserNameDisplay("headerUserName");
    this.closeUserNameEdit();
  }

  private downloadUserData(): void {
    const data = this.useCase.exportAllData();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `study-data-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  private buildSubjectTabs(): void {
    const tabsContainer = document.querySelector(".subject-tabs");
    if (!tabsContainer) return;

    tabsContainer.innerHTML = "";

    SUBJECTS.forEach((subject) => {
      const tab = document.createElement("button");
      tab.className = "subject-tab";
      tab.dataset.subject = subject.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("type", "button");
      tab.setAttribute("aria-selected", "false");

      const labelSpan = document.createElement("span");
      labelSpan.className = "tab-label";
      labelSpan.textContent = `${subject.icon} ${subject.name}`;

      tab.appendChild(labelSpan);

      tab.addEventListener("click", () => {
        this.filter.subject = subject.id;
        this.filter.category = "all";
        this.filter.parentCategory = undefined;
        this.selectedTopCategoryId = null;
        this.overallUnitSelected = null;

        tabsContainer.querySelectorAll(".subject-tab").forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        this.renderCategoryList();
        this.updateStartScreen();
      });

      tabsContainer.appendChild(tab);
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
    document.querySelectorAll<HTMLElement>(".panel-tab[data-panel]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const panel = tab.dataset.panel as "quiz" | "guide" | "history" | "questions";
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
      });
    });
  }

  /**
   * 総合タブ専用のサマリパネルタブ（学習済み / シェア）を初期化する。
   */
  private setupOverallPanelTabs(): void {
    document.querySelectorAll<HTMLElement>(".panel-tab[data-overall-panel]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const panel = tab.dataset.overallPanel as "learned" | "share";
        this.activeOverallPanel = panel;
        this.showOverallPanel(panel);
      });
    });
  }

  /**
   * 現在のフィルター設定に基づいてアクティブタブを設定する
   */
  private selectTabByFilter(): void {
    const tabsContainer = document.querySelector(".subject-tabs");
    if (!tabsContainer) return;

    tabsContainer.querySelectorAll(".subject-tab").forEach((tab) => {
      const el = tab as HTMLElement;
      const isActive = el.dataset.subject === this.filter.subject;
      el.classList.toggle("active", isActive);
      el.setAttribute("aria-selected", String(isActive));
    });
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
      const subjectContent = document.getElementById("subjectContent");
      subjectContent?.classList.add("category-only");
      // 管理タブでは学年フィルター・表示切替コントロールを非表示にする
      const controlsEl = document.getElementById("categoryControls");
      if (controlsEl) controlsEl.innerHTML = "";
      // タイトルを「⚙️ 管理」に変更
      const titleEl = document.getElementById("categoryListTitle");
      if (titleEl) titleEl.textContent = "⚙️ 管理";
      this.renderAdminContent(categoryList);
      return;
    }

    if (subject === "progress") {
      // 進度タブ: コントロールをクリアし、タイトルを設定して進度ビューを描画する
      const controlsEl = document.getElementById("categoryControls");
      if (controlsEl) controlsEl.innerHTML = "";
      const titleEl = document.getElementById("categoryListTitle");
      if (titleEl) titleEl.textContent = "📈 進度";
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

  private renderAdminContent(categoryList: HTMLElement): void {
    const data = this.useCase.exportAllData();

    /** 配列を先頭 N 件に絞り、件数サマリを付けた表示用値を返す */
    const truncateArray = (arr: unknown[], maxItems = 50): unknown => {
      if (arr.length <= maxItems) return arr;
      return [...arr.slice(0, maxItems), `... (${arr.length - maxItems}件省略、合計${arr.length}件)`];
    };

    const container = document.createElement("div");
    container.className = "admin-panel";

    /** ファイルダウンロード用の英字キー */
    type SectionKey = "settings" | "history" | "mastered" | "streaks";
    const sections: Array<{ title: string; fileKey: SectionKey; editable: boolean; content: unknown; fullContent?: unknown }> = [
      {
        title: "設定",
        fileKey: "settings",
        editable: false,
        content: {
          userName: data.userName ?? "ゲスト",
          fontSizeLevel: data.fontSizeLevel ?? "small",
          categoryViewMode: data.categoryViewMode,
          quizSettings: this.progressRepo.loadQuizSettings(),
          shareUrl: this.shareUrl || "(未設定)",
        },
      },
      { title: "履歴", fileKey: "history", editable: true, content: truncateArray(data.history), fullContent: data.history },
      { title: "学習済み問題", fileKey: "mastered", editable: true, content: truncateArray(data.masteredIds), fullContent: data.masteredIds },
      { title: "連続正解", fileKey: "streaks", editable: true, content: data.correctStreaks },
    ];

    // ─── トップメニュー ───────────────────────────────────────────────
    const menuBar = document.createElement("div");
    menuBar.className = "admin-menu-bar";

    const contentArea = document.createElement("div");
    contentArea.className = "admin-menu-content";

    let activeMenu: "manage" | "view" | null = null;

    // ── 🛢️データ管理セクション ────────────────────────────────────
    const showManageContent = (): void => {
      contentArea.innerHTML = "";
      contentArea.classList.remove("admin-data-open");
      contentArea.classList.add("admin-manage-open");
      // データ参照サブメニューを削除
      menuBar.querySelectorAll(".admin-view-submenu").forEach((el) => el.remove());

      // ── モバイル用：閉じるボタン行（デスクトップではCSSで非表示） ──────
      const closeRow = document.createElement("div");
      closeRow.className = "admin-manage-close-row";
      const closeTitle = document.createElement("span");
      closeTitle.className = "admin-data-header-title";
      closeTitle.textContent = "🛢️ データ管理";
      closeRow.appendChild(closeTitle);
      const closeBtn = document.createElement("button");
      closeBtn.className = "admin-data-close-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "✕";
      closeBtn.setAttribute("aria-label", "閉じる");
      closeBtn.addEventListener("click", () => {
        contentArea.classList.remove("admin-manage-open");
        contentArea.innerHTML = "";
        activeMenu = null;
        manageBtn.classList.remove("active");
        viewBtn.classList.remove("active");
      });
      closeRow.appendChild(closeBtn);
      contentArea.appendChild(closeRow);

      // ── タブバー ─────────────────────────────────────────────
      const tabBar = document.createElement("div");
      tabBar.className = "admin-manage-tabs";

      const tabPanelArea = document.createElement("div");
      tabPanelArea.className = "admin-manage-tab-panel";

      type ManageTab = "import" | "export" | "reset";
      const tabDefs: Array<{ id: ManageTab; label: string }> = [
        { id: "import", label: "📥 インポート" },
        { id: "export", label: "📤 エクスポート" },
        { id: "reset", label: "🗑️ 初期化" },
      ];

      const showTabContent = (tabId: ManageTab): void => {
        tabBar.querySelectorAll(".admin-manage-tab").forEach((t) => t.classList.remove("active"));
        const activeTab = tabBar.querySelector<HTMLButtonElement>(`.admin-manage-tab[data-tab="${tabId}"]`);
        if (activeTab) activeTab.classList.add("active");

        tabPanelArea.innerHTML = "";

        if (tabId === "import") {
          // ── インポートコンテンツ ────────────────────────────────
          const section = document.createElement("div");
          section.className = "admin-reset-section";

          const importDesc = document.createElement("p");
          importDesc.className = "admin-reset-desc";
          importDesc.textContent = "ダウンロードしたJSONファイルを選択して、学習データを更新します。";
          section.appendChild(importDesc);

          const fileLabel = document.createElement("label");
          fileLabel.className = "admin-import-label";
          fileLabel.textContent = "📂 JSONファイルを選択";

          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = ".json,application/json";
          fileInput.className = "admin-import-input";
          fileInput.style.display = "none";

          const fileNameSpan = document.createElement("span");
          fileNameSpan.className = "admin-import-filename";
          fileNameSpan.textContent = "（未選択）";

          const previewEl = document.createElement("pre");
          previewEl.className = "admin-data";
          previewEl.style.marginTop = "8px";
          previewEl.style.display = "none";

          const applyBtn = document.createElement("button");
          applyBtn.className = "admin-import-apply-btn";
          applyBtn.type = "button";
          applyBtn.textContent = "✅ データを更新する";
          applyBtn.style.display = "none";

          let parsedData: unknown = null;
          let detectedFileKey: SectionKey | null = null;

          fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            fileNameSpan.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (): void => {
              try {
                parsedData = JSON.parse(reader.result as string);
                // ファイル名からセクションを推定（例: study-history-2024-01-01.json）
                // settings はインポート対象外
                detectedFileKey = null;
                const importableSections = sections.filter((sec) => sec.fileKey !== "settings");
                for (const sec of importableSections) {
                  if (file.name.includes(sec.fileKey)) {
                    detectedFileKey = sec.fileKey;
                    break;
                  }
                }
                const preview = JSON.stringify(parsedData, null, 2);
                previewEl.textContent = preview.length > 2000
                  ? preview.slice(0, 2000) + "\n...(省略)"
                  : preview;
                previewEl.style.display = "block";
                if (detectedFileKey) {
                  applyBtn.textContent = `✅ ${sections.find(s => s.fileKey === detectedFileKey)?.title ?? detectedFileKey} を更新する`;
                  applyBtn.style.display = "block";
                } else if (file.name.includes("settings")) {
                  previewEl.textContent = "設定ファイルのインポートは未対応です。\n\n" + previewEl.textContent;
                  applyBtn.style.display = "none";
                } else {
                  applyBtn.textContent = "✅ データを更新する（種類不明）";
                  applyBtn.style.display = "block";
                }
              } catch {
                previewEl.textContent = "JSONの解析に失敗しました。ファイルを確認してください。";
                previewEl.style.display = "block";
                applyBtn.style.display = "none";
                parsedData = null;
              }
            };
            reader.readAsText(file);
          });

          applyBtn.addEventListener("click", () => {
            if (!parsedData || !detectedFileKey) {
              alert("対応するデータ種類が判定できませんでした。ファイル名に history / mastered / streaks を含めてください。");
              return;
            }
            // 基本バリデーション
            if ((detectedFileKey === "history" || detectedFileKey === "mastered") && !Array.isArray(parsedData)) {
              const label = sections.find(s => s.fileKey === detectedFileKey)?.title ?? detectedFileKey;
              alert(`「${label}」データの形式が正しくありません（配列が必要です）。ファイルを確認してください。`);
              return;
            }
            if (detectedFileKey === "streaks" && (typeof parsedData !== "object" || Array.isArray(parsedData) || parsedData === null)) {
              const label = sections.find(s => s.fileKey === detectedFileKey)?.title ?? detectedFileKey;
              alert(`「${label}」データの形式が正しくありません（オブジェクトが必要です）。ファイルを確認してください。`);
              return;
            }
            void this.showConfirmDialog(
              `「${sections.find(s => s.fileKey === detectedFileKey)?.title ?? detectedFileKey}」データを選択したファイルの内容で上書きします。よろしいですか？`
            ).then((confirmed) => {
              if (!confirmed) return;
              try {
                if (detectedFileKey === "history") {
                  this.progressRepo.saveHistory(parsedData as ReturnType<typeof this.progressRepo.loadHistory>);
                } else if (detectedFileKey === "mastered") {
                  this.progressRepo.saveMasteredIds(parsedData as string[]);
                } else if (detectedFileKey === "streaks") {
                  this.progressRepo.saveCorrectStreaks(parsedData as Record<string, number>);
                }
                void this.useCase.initialize()
                  .then(() => {
                    window.location.reload();
                  })
                  .catch((err: unknown) => {
                    console.error("データ再読み込みに失敗しました", err);
                    alert("データの更新後の再読み込みに失敗しました。問題データを確認してください。");
                  });
              } catch (err) {
                console.error("データ更新に失敗しました", err);
                alert("データの更新に失敗しました。ファイルの形式を確認してください。");
              }
            }).catch((err: unknown) => {
              console.error("確認ダイアログでエラーが発生しました", err);
            });
          });

          fileLabel.appendChild(fileInput);
          section.appendChild(fileLabel);
          section.appendChild(fileNameSpan);
          section.appendChild(previewEl);
          section.appendChild(applyBtn);
          tabPanelArea.appendChild(section);

        } else if (tabId === "export") {
          // ── エクスポートコンテンツ ──────────────────────────────
          const section = document.createElement("div");
          section.className = "admin-reset-section";

          const exportDesc = document.createElement("p");
          exportDesc.className = "admin-reset-desc";
          exportDesc.textContent = "すべての学習データをJSONファイルとしてダウンロードします。定期的なバックアップにご利用ください。";
          section.appendChild(exportDesc);

          const exportBtn = document.createElement("button");
          exportBtn.className = "admin-import-apply-btn";
          exportBtn.type = "button";
          exportBtn.textContent = "⬇️ データをエクスポートする";
          exportBtn.style.marginTop = "8px";
          exportBtn.addEventListener("click", () => {
            this.downloadUserData();
          });
          section.appendChild(exportBtn);
          tabPanelArea.appendChild(section);

        } else if (tabId === "reset") {
          // ── 初期化コンテンツ ────────────────────────────────────
          const section = document.createElement("div");
          section.className = "admin-reset-section";

          const resetDesc = document.createElement("p");
          resetDesc.className = "admin-reset-desc";
          resetDesc.textContent = "すべての学習データ（履歴・学習済み・進捗）を削除します。";
          const resetBtn = document.createElement("button");
          resetBtn.className = "admin-reset-btn";
          resetBtn.type = "button";
          resetBtn.textContent = "🗑️ 全データを初期化する";
          resetBtn.addEventListener("click", () => {
            void this.showConfirmDialog(
              "すべての学習データを削除します。この操作は元に戻せません。続けますか？"
            ).then((confirmed) => {
              if (confirmed) {
                void this.useCase.clearAllData()
                  .then(() => {
                    window.location.reload();
                  })
                  .catch((err: unknown) => {
                    console.error("データ初期化に失敗しました", err);
                    alert("データの初期化に失敗しました。ページを再読み込みしてもう一度お試しください。");
                  });
              }
            }).catch((err: unknown) => {
              console.error("確認ダイアログでエラーが発生しました", err);
            });
          });
          section.appendChild(resetDesc);
          section.appendChild(resetBtn);
          tabPanelArea.appendChild(section);
        }
      };

      tabDefs.forEach(({ id, label }) => {
        const btn = document.createElement("button");
        btn.className = "admin-manage-tab";
        btn.type = "button";
        btn.textContent = label;
        btn.dataset.tab = id;
        btn.addEventListener("click", () => showTabContent(id));
        tabBar.appendChild(btn);
      });

      contentArea.appendChild(tabBar);
      contentArea.appendChild(tabPanelArea);

      // 最初のタブ（インポート）を表示
      showTabContent("import");
    };

    // ── 📊データ参照セクション ────────────────────────────────────
    const showViewContent = (): void => {
      contentArea.classList.remove("admin-manage-open");
      contentArea.innerHTML = "";

      // 既存サブメニューを削除
      menuBar.querySelectorAll(".admin-view-submenu").forEach((el) => el.remove());

      /** セクションの完全な JSON テキストを返す（fullContent があればそちらを使う） */
      const getFullJson = (index: number): string => {
        const sec = sections[index]!;
        return JSON.stringify(sec.fullContent ?? sec.content, null, 2);
      };

      // ── モバイル用：閉じるボタン行（デスクトップではCSSで非表示） ──────
      const closeRow = document.createElement("div");
      closeRow.className = "admin-manage-close-row";
      const closeTitle = document.createElement("span");
      closeTitle.className = "admin-data-header-title";
      closeTitle.textContent = "📊 データ参照";
      closeRow.appendChild(closeTitle);
      const closeBtn = document.createElement("button");
      closeBtn.className = "admin-data-close-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "✕";
      closeBtn.setAttribute("aria-label", "閉じる");
      closeBtn.addEventListener("click", () => {
        contentArea.classList.remove("admin-data-open");
        contentArea.innerHTML = "";
        activeMenu = null;
        manageBtn.classList.remove("active");
        viewBtn.classList.remove("active");
      });
      closeRow.appendChild(closeBtn);
      contentArea.appendChild(closeRow);

      // ── タブバー ─────────────────────────────────────────────
      const tabBar = document.createElement("div");
      tabBar.className = "admin-data-tabs";

      // タブコンテンツエリア
      const tabContent = document.createElement("div");
      tabContent.className = "admin-data-tab-content";

      const showDataTab = (index: number): void => {
        tabBar.querySelectorAll(".admin-data-tab").forEach((t) => t.classList.remove("active"));
        const activeTab = tabBar.querySelectorAll<HTMLButtonElement>(".admin-data-tab")[index];
        if (activeTab) activeTab.classList.add("active");

        tabContent.innerHTML = "";
        contentArea.classList.add("admin-data-open");

        const section = sections[index];
        if (!section) return;

        const { content } = section;
        const jsonText = JSON.stringify(content, null, 2);
        const fullJsonText = getFullJson(index);

        // コピーボタンバー
        const btnBar = document.createElement("div");
        btnBar.className = "admin-data-btn-bar";

        const copyBtn = document.createElement("button");
        copyBtn.className = "admin-data-action-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "📋 コピー";
        copyBtn.title = "クリップボードにコピー";
        copyBtn.addEventListener("click", () => {
          void navigator.clipboard.writeText(fullJsonText).then(() => {
            copyBtn.textContent = "✓ コピー済";
            setTimeout(() => { copyBtn.textContent = "📋 コピー"; }, 1500);
          });
        });
        btnBar.appendChild(copyBtn);
        tabContent.appendChild(btnBar);

        const dataEl = document.createElement("pre");
        dataEl.className = "admin-data";
        dataEl.textContent = jsonText;
        tabContent.appendChild(dataEl);
      };

      sections.forEach(({ title }, index) => {
        const btn = document.createElement("button");
        btn.className = "admin-data-tab";
        btn.type = "button";
        btn.textContent = title;
        btn.addEventListener("click", () => {
          showDataTab(index);
        });
        tabBar.appendChild(btn);
      });

      contentArea.appendChild(tabBar);
      contentArea.appendChild(tabContent);

      // 最初のタブを選択
      showDataTab(0);
    };

    // メニューボタン
    const manageBtn = document.createElement("button");
    manageBtn.className = "admin-menu-btn";
    manageBtn.type = "button";
    manageBtn.textContent = "🛢️ データ管理";
    manageBtn.addEventListener("click", () => {
      if (activeMenu === "manage") {
        // 再クリックでトグルオフ（コンテンツを閉じてメニューのみ表示に戻る）
        activeMenu = null;
        manageBtn.classList.remove("active");
        contentArea.innerHTML = "";
        contentArea.classList.remove("admin-manage-open", "admin-data-open");
        return;
      }
      activeMenu = "manage";
      manageBtn.classList.add("active");
      viewBtn.classList.remove("active");
      showManageContent();
    });
    menuBar.appendChild(manageBtn);

    const viewBtn = document.createElement("button");
    viewBtn.className = "admin-menu-btn";
    viewBtn.type = "button";
    viewBtn.textContent = "📊 データ参照";
    viewBtn.addEventListener("click", () => {
      if (activeMenu === "view") {
        // 再クリックでトグルオフ（コンテンツを閉じてメニューのみ表示に戻る）
        activeMenu = null;
        viewBtn.classList.remove("active");
        contentArea.innerHTML = "";
        contentArea.classList.remove("admin-manage-open", "admin-data-open");
        return;
      }
      activeMenu = "view";
      viewBtn.classList.add("active");
      manageBtn.classList.remove("active");
      showViewContent();
    });
    menuBar.appendChild(viewBtn);

    container.appendChild(menuBar);
    container.appendChild(contentArea);

    // 初期表示: メニューのみ（コンテンツ未選択）

    categoryList.appendChild(container);
  }

  /**
   * カテゴリ別ビューでカテゴリリストを描画する（既存の階層構造）。
   * gradeFilter が設定されている場合は学年でフィルタリングする。
   */
  private renderCategoryListByCategory(): void {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const subject = this.filter.subject;

    // 全親カテゴリとその配下のカテゴリを収集
    const allParentCategories = this.useCase.getParentCategoriesForSubject(subject);
    const categoriesByParent = new Map<string, Record<string, string>>();
    for (const [parentCatId] of Object.entries(allParentCategories)) {
      const cats = this.useCase.getCategoriesForParent(subject, parentCatId);
      // 学年フィルターを適用
      const filtered: Record<string, string> = {};
      for (const [catId, catName] of Object.entries(cats)) {
        if (this.gradeFilterMatches(subject, catId)) {
          filtered[catId] = catName;
        }
      }
      categoriesByParent.set(parentCatId, filtered);
    }

    // トップカテゴリがある場合は3階層で描画
    const topCategories = this.useCase.getTopCategoriesForSubject(subject);
    const parentCatIdsInTopGroups = new Set<string>();

    for (const [topCatId, topCatName] of Object.entries(topCategories)) {
      const parentCatsForTop = this.useCase.getParentCategoriesForTop(subject, topCatId);

      // このトップカテゴリに表示すべきカテゴリがあるか確認
      let hasVisibleItems = false;
      for (const [parentCatId] of Object.entries(parentCatsForTop)) {
        parentCatIdsInTopGroups.add(parentCatId);
        const cats = categoriesByParent.get(parentCatId) ?? {};
        if (Object.keys(cats).length > 0) {
          hasVisibleItems = true;
        }
      }
      if (!hasVisibleItems) continue;

      const topGroupDiv = document.createElement("div");
      topGroupDiv.className = "category-top-group";
      topGroupDiv.dataset.topCategory = topCatId;

      const topGroupHeader = document.createElement("div");
      topGroupHeader.className = "category-top-group-header";
      topGroupHeader.setAttribute("role", "button");
      topGroupHeader.setAttribute("tabindex", "0");
      topGroupHeader.setAttribute("aria-expanded", this.collapsedTopCategories.has(topCatId) ? "false" : "true");
      topGroupHeader.dataset.topCategory = topCatId;

      const topToggleArrow = document.createElement("span");
      topToggleArrow.className = "category-top-group-toggle";
      topToggleArrow.setAttribute("aria-hidden", "true");
      topGroupHeader.appendChild(topToggleArrow);

      const topHeaderText = document.createElement("span");
      topHeaderText.textContent = topCatName;
      topGroupHeader.appendChild(topHeaderText);

      topGroupDiv.appendChild(topGroupHeader);

      for (const [parentCatId, parentCatName] of Object.entries(parentCatsForTop)) {
        const cats = categoriesByParent.get(parentCatId) ?? {};
        if (Object.keys(cats).length === 0) continue;
        const groupDiv = this.buildParentCategoryGroup(
          subject, parentCatId, parentCatName,
          cats,
          topCatId
        );
        topGroupDiv.appendChild(groupDiv);
      }

      if (this.collapsedTopCategories.has(topCatId)) {
        topGroupDiv.classList.add("collapsed");
      }

      const handleTopHeaderClick = (e: Event): void => {
        e.stopPropagation();
        // トップカテゴリの選択/非選択トグル
        if (this.selectedTopCategoryId === topCatId) {
          // 既に選択中 → 非選択に戻す
          this.selectedTopCategoryId = null;
        } else {
          // 選択（単元選択・親カテゴリ選択を解除してトップカテゴリを選択）
          this.selectedTopCategoryId = topCatId;
          this.filter.category = "all";
          this.filter.parentCategory = undefined;
          this.isPanelTabUserSelected = false;
        }
        this.updateCategoryListActive();
        const records = this.useCase.getHistory();
        this.autoSelectPanelTab(records);
        this.updateStartScreen(records);
        // 折りたたみトグルも実行
        this.toggleTopCategory(topCatId);
      };
      topGroupHeader.addEventListener("click", handleTopHeaderClick);
      topGroupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTopHeaderClick(e);
        }
      });

      categoryList.appendChild(topGroupDiv);
    }

    // トップカテゴリに属さない親カテゴリグループ（2階層の孤立グループ）
    for (const [parentCatId, parentCatName] of Object.entries(allParentCategories)) {
      if (parentCatIdsInTopGroups.has(parentCatId)) continue;
      const cats = categoriesByParent.get(parentCatId) ?? {};
      if (Object.keys(cats).length === 0) continue;
      const groupDiv = this.buildParentCategoryGroup(
        subject, parentCatId, parentCatName,
        cats
      );
      categoryList.appendChild(groupDiv);
    }

    // 親カテゴリに属さないスタンドアロンカテゴリ
    const allCategories = this.useCase.getCategoriesForSubject(subject);
    for (const [catId, catName] of Object.entries(allCategories)) {
      const belongsToParent = Array.from(categoriesByParent.values()).some(
        (cats) => catId in cats
      );
      if (!belongsToParent && this.gradeFilterMatches(subject, catId)) {
        const catItem = this.createCategoryItem(subject, catId, catName);
        categoryList.appendChild(catItem);
      }
    }
  }

  /**
   * 学年別ビューでカテゴリリストを描画する。
   * 学年グループ（小学1年, 中学1年 等）でまとめて表示する。
   */
  private renderCategoryListByGrade(): void {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const subject = this.filter.subject;
    const grades = this.useCase.getUniqueGradesForSubject(subject);

    for (const grade of grades) {
      // 学年フィルターで絞る
      if (this.selectedGradeFilter && !grade.startsWith(this.selectedGradeFilter)) continue;

      const cats = this.useCase.getCategoriesForGrade(subject, grade);
      if (Object.keys(cats).length === 0) continue;

      const groupDiv = document.createElement("div");
      groupDiv.className = "category-grade-group";
      groupDiv.dataset.grade = grade;

      const groupHeader = document.createElement("div");
      groupHeader.className = "category-grade-group-header";
      groupHeader.setAttribute("role", "button");
      groupHeader.setAttribute("tabindex", "0");
      groupHeader.setAttribute("aria-expanded", this.collapsedGradeGroups.has(grade) ? "false" : "true");
      groupHeader.dataset.grade = grade;

      const toggleArrow = document.createElement("span");
      toggleArrow.className = "category-grade-group-toggle";
      toggleArrow.setAttribute("aria-hidden", "true");
      groupHeader.appendChild(toggleArrow);

      const headerText = document.createElement("span");
      headerText.textContent = grade;
      groupHeader.appendChild(headerText);

      groupDiv.appendChild(groupHeader);

      for (const [catId, catName] of Object.entries(cats)) {
        const catItem = this.createCategoryItem(subject, catId, catName);
        groupDiv.appendChild(catItem);
      }

      if (this.collapsedGradeGroups.has(grade)) {
        groupDiv.classList.add("collapsed");
      }

      const handleToggle = (e: Event): void => {
        e.stopPropagation();
        if (this.collapsedGradeGroups.has(grade)) {
          this.collapsedGradeGroups.delete(grade);
          groupDiv.classList.remove("collapsed");
          groupHeader.setAttribute("aria-expanded", "true");
        } else {
          this.collapsedGradeGroups.add(grade);
          groupDiv.classList.add("collapsed");
          groupHeader.setAttribute("aria-expanded", "false");
        }
      };
      groupHeader.addEventListener("click", handleToggle);
      groupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle(e);
        }
      });

      categoryList.appendChild(groupDiv);
    }

    // 学年未設定のカテゴリ（フィルターなしの場合のみ表示）
    if (!this.selectedGradeFilter) {
      const uncategorized = this.useCase.getCategoriesWithoutGrade(subject);
      if (Object.keys(uncategorized).length > 0) {
        const groupDiv = document.createElement("div");
        groupDiv.className = "category-grade-group";
        groupDiv.dataset.grade = "none";

        const groupHeader = document.createElement("div");
        groupHeader.className = "category-grade-group-header";
        groupHeader.setAttribute("role", "button");
        groupHeader.setAttribute("tabindex", "0");
        groupHeader.setAttribute("aria-expanded", this.collapsedGradeGroups.has("none") ? "false" : "true");
        groupHeader.dataset.grade = "none";

        const toggleArrow = document.createElement("span");
        toggleArrow.className = "category-grade-group-toggle";
        toggleArrow.setAttribute("aria-hidden", "true");
        groupHeader.appendChild(toggleArrow);

        const headerText = document.createElement("span");
        headerText.textContent = "学年未設定";
        groupHeader.appendChild(headerText);

        groupDiv.appendChild(groupHeader);

        for (const [catId, catName] of Object.entries(uncategorized)) {
          const catItem = this.createCategoryItem(subject, catId, catName);
          groupDiv.appendChild(catItem);
        }

        if (this.collapsedGradeGroups.has("none")) {
          groupDiv.classList.add("collapsed");
        }

        const handleToggleNone = (e: Event): void => {
          e.stopPropagation();
          const grade = groupDiv.dataset.grade ?? "none";
          if (this.collapsedGradeGroups.has(grade)) {
            this.collapsedGradeGroups.delete(grade);
            groupDiv.classList.remove("collapsed");
            groupHeader.setAttribute("aria-expanded", "true");
          } else {
            this.collapsedGradeGroups.add(grade);
            groupDiv.classList.add("collapsed");
            groupHeader.setAttribute("aria-expanded", "false");
          }
        };
        groupHeader.addEventListener("click", handleToggleNone);
        groupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleNone(e);
          }
        });

        categoryList.appendChild(groupDiv);
      }
    }
  }

  /**
   * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）を描画する。
   */
  private renderCategoryViewControls(): void {
    const controlsEl = document.getElementById("categoryControls");
    if (!controlsEl) return;
    controlsEl.innerHTML = "";

    const subject = this.filter.subject;
    if (subject === "all" || subject === "progress") {
      // 総合タブ・進度タブ: コントロールは renderAllSubjectList/renderProgressView 内で描画するため不要
      return;
    }

    // ── ビューモード切替ボタン ──
    const viewToggleBtn = document.createElement("button");
    viewToggleBtn.className = "category-view-toggle";
    viewToggleBtn.type = "button";
    viewToggleBtn.setAttribute("aria-pressed", String(this.categoryViewMode === "grade"));
    viewToggleBtn.textContent = this.categoryViewMode === "grade" ? "🎓 学年別" : "📁 カテゴリ別";
    viewToggleBtn.title = this.categoryViewMode === "grade"
      ? "カテゴリ別表示に切り替える"
      : "学年別表示に切り替える";
    viewToggleBtn.addEventListener("click", () => {
      this.categoryViewMode = this.categoryViewMode === "category" ? "grade" : "category";
      this.progressRepo.saveCategoryViewMode(this.categoryViewMode);
      this.renderCategoryList();
    });
    controlsEl.appendChild(viewToggleBtn);

    // ── 学年フィルターボタン ──
    const grades = this.useCase.getUniqueGradesForSubject(subject);
    if (grades.length === 0) {
      // 学年情報がない場合はフィルターをリセット
      this.selectedGradeFilter = null;
      return;
    }

    // 利用可能な学年プレフィックスを収集
    const prefixes: string[] = [];
    const seen = new Set<string>();
    for (const grade of grades) {
      const prefix = grade.startsWith("小") ? "小学" :
                     grade.startsWith("中") ? "中学" :
                     grade.startsWith("高") ? "高校" : "";
      if (prefix && !seen.has(prefix)) {
        seen.add(prefix);
        prefixes.push(prefix);
      }
    }

    // 現在のフィルターが新しい教科で有効でない場合はリセット
    if (this.selectedGradeFilter !== null && !prefixes.includes(this.selectedGradeFilter)) {
      this.selectedGradeFilter = null;
    }

    if (prefixes.length < 2) return; // 1種類以下なら表示しない

    // 学年フィルターを右寄せにするためラッパーを用意する
    const gradeFilterGroup = document.createElement("div");
    gradeFilterGroup.className = "grade-filter-group";

    const filterLabel = document.createElement("span");
    filterLabel.className = "grade-filter-label";
    filterLabel.textContent = "学年:";
    gradeFilterGroup.appendChild(filterLabel);

    // 「すべて」ボタン
    const allBtn = document.createElement("button");
    allBtn.className = "grade-filter-btn";
    allBtn.type = "button";
    allBtn.textContent = "すべて";
    allBtn.setAttribute("aria-pressed", String(this.selectedGradeFilter === null));
    allBtn.addEventListener("click", () => {
      this.selectedGradeFilter = null;
      this.renderCategoryList();
    });
    gradeFilterGroup.appendChild(allBtn);

    // 各学年プレフィックスボタン
    const labelMap: Record<string, string> = { "小学": "小学", "中学": "中学", "高校": "高校" };
    for (const prefix of prefixes) {
      const btn = document.createElement("button");
      btn.className = "grade-filter-btn";
      btn.type = "button";
      btn.textContent = labelMap[prefix] ?? prefix;
      btn.setAttribute("aria-pressed", String(this.selectedGradeFilter === prefix));
      btn.addEventListener("click", () => {
        this.selectedGradeFilter = prefix;
        this.renderCategoryList();
      });
      gradeFilterGroup.appendChild(btn);
    }

    controlsEl.appendChild(gradeFilterGroup);
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
    topCatId?: string
  ): HTMLElement {
    const groupDiv = document.createElement("div");
    groupDiv.className = "category-group";
    groupDiv.dataset.parentCategory = parentCatId;
    if (topCatId) groupDiv.dataset.topCategory = topCatId;

    const groupHeader = document.createElement("div");
    groupHeader.className = "category-group-header";
    groupHeader.setAttribute("role", "button");
    groupHeader.setAttribute("tabindex", "0");
    groupHeader.setAttribute("aria-expanded", this.collapsedParentCategories.has(parentCatId) ? "false" : "true");
    groupHeader.dataset.parentCategory = parentCatId;

    const toggleArrow = document.createElement("span");
    toggleArrow.className = "category-group-toggle";
    toggleArrow.setAttribute("aria-hidden", "true");
    groupHeader.appendChild(toggleArrow);

    const headerText = document.createElement("span");
    headerText.textContent = parentCatName;
    groupHeader.appendChild(headerText);

    const learnedBadge = document.createElement("span");
    learnedBadge.className = "category-group-learned-badge";
    learnedBadge.setAttribute("aria-hidden", "true");
    groupHeader.appendChild(learnedBadge);

    groupDiv.appendChild(groupHeader);

    for (const [catId, catName] of Object.entries(cats)) {
      const catItem = this.createCategoryItem(subject, catId, catName, parentCatId, topCatId);
      groupDiv.appendChild(catItem);
    }

    if (this.collapsedParentCategories.has(parentCatId)) {
      groupDiv.classList.add("collapsed");
    }

    const handleHeaderClick = (e: Event): void => {
      e.stopPropagation();
      // 親カテゴリの選択/非選択トグル
      if (this.getSelectionLevel() === "parentCategory" && this.filter.parentCategory === parentCatId) {
        // 既に選択中 → 非選択に戻す
        this.filter.parentCategory = undefined;
      } else {
        // 選択（単元選択・トップカテゴリ選択を解除して親カテゴリを選択）
        this.selectedTopCategoryId = null;
        this.filter.category = "all";
        this.filter.parentCategory = parentCatId;
        this.isPanelTabUserSelected = false;
      }
      this.updateCategoryListActive();
      const records = this.useCase.getHistory();
      this.autoSelectPanelTab(records);
      this.updateStartScreen(records);
      // 折りたたみトグルも実行
      this.toggleParentCategory(parentCatId);
    };
    groupHeader.addEventListener("click", handleHeaderClick);
    groupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleHeaderClick(e);
      }
    });

    return groupDiv;
  }

  /**
   * selectedActivityDate を Date オブジェクトとして返す。
   */
  private parseActivityDate(): Date {
    return new Date(this.selectedActivityDate + "T00:00:00");
  }

  /**
   * 今日の日付を YYYY-MM-DD 形式で返す（static）。
   */
  private static currentDateString(): string {
    return QuizApp.formatDate(new Date());
  }

  /**
   * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換して返す（static）。
   */
  private static formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

    for (const subject of nonAllSubjects) {
      const count = this.subjectRecommendedCounts.get(subject.id) ?? 1;
      const recommendedList = this.useCase.getRecommendedCategoriesForSubject(subject.id, count);

      // ラッパー
      const wrapper = document.createElement("div");
      wrapper.className = "subject-overview-wrapper";

      // 教科名行: アイコン・名称と教科ごとの表示数コントロール
      const subjectRow = document.createElement("div");
      subjectRow.className = "subject-overview-subject-row";
      const iconSpan = document.createElement("span");
      iconSpan.className = "subject-overview-icon";
      iconSpan.textContent = subject.icon;
      const nameSpan = document.createElement("span");
      nameSpan.className = "subject-overview-name";
      nameSpan.textContent = subject.name;
      subjectRow.appendChild(iconSpan);
      subjectRow.appendChild(nameSpan);

      // 教科ごとの表示数コントロール（1 / 3 / 5）
      const countControls = document.createElement("div");
      countControls.className = "subject-rec-count-controls";
      const countLabel = document.createElement("span");
      countLabel.className = "subject-rec-count-label";
      countLabel.textContent = "表示数:";
      countControls.appendChild(countLabel);
      for (const n of [1, 3, 5]) {
        const btn = document.createElement("button");
        btn.className = "overall-rec-count-btn";
        btn.type = "button";
        btn.textContent = String(n);
        btn.setAttribute("aria-pressed", String(count === n));
        if (count === n) btn.classList.add("active");
        const capturedSubjectId = subject.id;
        btn.addEventListener("click", () => {
          this.subjectRecommendedCounts.set(capturedSubjectId, n);
          this.saveRecommendedCounts();
          this.renderCategoryList();
        });
        countControls.appendChild(btn);
      }
      subjectRow.appendChild(countControls);
      wrapper.appendChild(subjectRow);

      if (recommendedList.length === 0) {
        // 単元なしの場合はシンプルなカードを表示
        const item = document.createElement("div");
        item.className = "subject-overview-item";
        item.dataset.subject = subject.id;
        item.textContent = "単元なし";
        wrapper.appendChild(item);
        categoryList.appendChild(wrapper);
        continue;
      }

      // 同一親カテゴリでグループ化する
      // key: "topCatId::parentCatId" （どちらかが空の場合は空文字）
      type CatGroupKey = string;
      const groupOrder: CatGroupKey[] = [];
      const groupMap = new Map<CatGroupKey, {
        topCatId: string; topCatName: string;
        parentCatId: string; parentCatName: string;
        items: typeof recommendedList;
      }>();

      for (const recommended of recommendedList) {
        const parentCat = this.useCase.getParentCategoryForUnit(subject.id, recommended.id);
        const topCat = this.useCase.getTopCategoryForUnit(subject.id, recommended.id);
        const topCatId = topCat?.id ?? "";
        const topCatName = topCat?.name ?? "";
        const parentCatId = parentCat?.id ?? "";
        const parentCatName = parentCat?.name ?? "";
        const key: CatGroupKey = `${topCatId}::${parentCatId}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, { topCatId, topCatName, parentCatId, parentCatName, items: [] });
          groupOrder.push(key);
        }
        groupMap.get(key)!.items.push(recommended);
      }

      // 未学習単元を含むグループを先頭に（未学習を上から表示するため）
      groupOrder.sort((a, b) => {
        const aHasUnlearned = groupMap.get(a)!.items.some((i) => !i.isLearned);
        const bHasUnlearned = groupMap.get(b)!.items.some((i) => !i.isLearned);
        if (aHasUnlearned && !bHasUnlearned) return -1;
        if (!aHasUnlearned && bHasUnlearned) return 1;
        return 0;
      });
      // 各グループ内でも未学習単元を先頭に
      for (const key of groupOrder) {
        const group = groupMap.get(key)!;
        group.items.sort((a, b) => {
          if (!a.isLearned && b.isLearned) return -1;
          if (a.isLearned && !b.isLearned) return 1;
          return 0;
        });
      }

      // グループごとにヘッダーとカードを描画する
      const studiedKeys = this.useCase.getStudiedCategoryKeys();
      for (const key of groupOrder) {
        const group = groupMap.get(key)!;
        const catGroup = document.createElement("div");
        catGroup.className = "subject-overview-cat-group";

        // カテゴリヘッダー（topCat › parentCat, もしくは parentCat のみ）
        if (group.parentCatId) {
          const catHeader = document.createElement("div");
          catHeader.className = "subject-overview-cat-header";
          if (group.topCatId && group.topCatId !== group.parentCatId) {
            const topSpan = document.createElement("span");
            topSpan.className = "subject-overview-outer-cat";
            topSpan.textContent = group.topCatName;
            catHeader.appendChild(topSpan);
            const arrow = document.createElement("span");
            arrow.className = "subject-overview-cat-header-arrow";
            arrow.textContent = " › ";
            catHeader.appendChild(arrow);
          }
          const parentSpan = document.createElement("span");
          parentSpan.className = "subject-overview-outer-cat";
          parentSpan.textContent = group.parentCatName;
          catHeader.appendChild(parentSpan);
          catGroup.appendChild(catHeader);
        }

        // グループ内の各単元カード
        for (const recommended of group.items) {
          const item = document.createElement("div");
          item.className = "subject-overview-item";
          item.setAttribute("role", "button");
          item.setAttribute("tabindex", "0");
          item.dataset.subject = subject.id;

          // 単元一覧と同じレイアウト: ステータスアイコン + 名前エリア
          const statusSpan = document.createElement("span");
          statusSpan.className = "subject-overview-status";
          statusSpan.setAttribute("aria-hidden", "true");

          const { mastered, total } = this.useCase.getMasteredCountForCategory(subject.id, recommended.id);
          const inProgressCount = this.useCase.getInProgressCount({ subject: subject.id, category: recommended.id });
          const catKey = `${subject.id}::${recommended.id}`;
          const isAllMastered = total > 0 && mastered === total;
          const isStudying = !isAllMastered && (inProgressCount > 0 || studiedKeys.has(catKey));
          if (isAllMastered) {
            statusSpan.textContent = "✅";
          } else if (isStudying) {
            statusSpan.textContent = "🔄";
          } else {
            statusSpan.textContent = "⬜";
          }

          const nameArea = document.createElement("div");
          nameArea.className = "subject-overview-name-area";

          // タイトル行: 名前（左）+ 学年バッジ（右）
          const titleRow = document.createElement("div");
          titleRow.className = "subject-overview-title-row";
          const recName = document.createElement("span");
          recName.className = "subject-overview-rec-name";
          recName.textContent = recommended.name;
          titleRow.appendChild(recName);

          if (recommended.referenceGrade) {
            const gradeSpan = document.createElement("span");
            gradeSpan.className = "subject-overview-grade";
            const gradeClassName = gradeColorClass(recommended.referenceGrade);
            if (gradeClassName) {
              gradeSpan.classList.add(gradeClassName);
            }
            gradeSpan.textContent = recommended.referenceGrade;
            titleRow.appendChild(gradeSpan);
          }
          nameArea.appendChild(titleRow);

          // 進捗行: 進捗バー（緑+黄）+ 進捗数値
          const progressRow = document.createElement("div");
          progressRow.className = "subject-overview-progress-row";
          const progressBar = document.createElement("div");
          progressBar.className = "subject-overview-progress-bar";
          const progressFill = document.createElement("div");
          progressFill.className = "subject-overview-progress-fill";
          const { masteredPct, inProgressPct } = calcDualProgressPct(mastered, inProgressCount, total);
          progressFill.style.width = `${masteredPct}%`;
          progressBar.appendChild(progressFill);
          const progressFillInProgress = document.createElement("div");
          progressFillInProgress.className = "subject-overview-progress-fill-inprogress";
          progressFillInProgress.style.width = `${inProgressPct}%`;
          progressBar.appendChild(progressFillInProgress);
          progressRow.appendChild(progressBar);

          if (total > 0) {
            const pctSpan = document.createElement("span");
            pctSpan.className = "subject-overview-pct";
            pctSpan.textContent = inProgressCount > 0 ? `${mastered}(${inProgressCount})/${total}` : `${mastered}/${total}`;
            progressRow.appendChild(pctSpan);
          }
          nameArea.appendChild(progressRow);

          item.appendChild(statusSpan);
          item.appendChild(nameArea);

          const capturedRec = recommended;
          const capturedSubjectId = subject.id;
          const handleActivate = (): void => {
            this.overallUnitSelected = { subject: capturedSubjectId, categoryId: capturedRec.id, categoryName: capturedRec.name };
            this.isPanelTabUserSelected = false;
            const overviewRecords = this.useCase.getHistory();
            this.autoSelectPanelTab(overviewRecords);
            this.updateStartScreen(overviewRecords);
          };

          item.addEventListener("click", handleActivate);
          item.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleActivate();
            }
          });

          catGroup.appendChild(item);
        }

        wrapper.appendChild(catGroup);
      }

      categoryList.appendChild(wrapper);
    }
  }

  // ─── 総合タブ専用サマリパネル ───────────────────────────────────────────────

  /**
   * 進度タブ用のビューを描画する。
   * 教科セレクターとカテゴリ別・学年別の進捗リストを表示する。
   */
  private renderProgressView(): void {
    const categoryList = document.getElementById("categoryList");
    const controlsEl = document.getElementById("categoryControls");
    if (!categoryList) return;
    categoryList.innerHTML = "";

    // ── カテゴリリスト（教科フィルターを一時的に切り替えて既存レンダラーを使用） ──
    const savedSubject = this.filter.subject;
    this.filter.subject = this.progressSubjectId;

    // ビューモード切替コントロールを #categoryControls に描画する（内部で innerHTML = "" される）
    this.renderCategoryViewControls();

    // 教科セレクターを #categoryControls の先頭に挿入（ビューモード切替より上に表示）
    if (controlsEl) {
      const selectorDiv = document.createElement("div");
      selectorDiv.className = "progress-subject-selector";

      const contentSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
      for (const subj of contentSubjects) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "progress-subject-btn";
        btn.textContent = `${subj.icon} ${subj.name}`;
        const isActive = subj.id === this.progressSubjectId;
        if (isActive) btn.classList.add("active");
        btn.setAttribute("aria-pressed", String(isActive));
        const capturedId = subj.id;
        btn.addEventListener("click", () => {
          this.progressSubjectId = capturedId;
          this.renderCategoryList();
        });
        selectorDiv.appendChild(btn);
      }
      controlsEl.prepend(selectorDiv);
    }

    if (this.categoryViewMode === "grade") {
      this.renderCategoryListByGrade();
    } else {
      this.renderCategoryListByCategory();
    }

    this.filter.subject = savedSubject;

    // アクティブ状態を更新（フィルターを戻した後に実行する）
    this.updateCategoryListActive();
    this.updateSubjectStats();
  }

  /**
   * 活動日付でフィルタリングしたクイズ記録を返す。
   */
  private filterRecordsBySelectedDate(records: QuizRecord[]): QuizRecord[] {
    const dateToCheck = this.parseActivityDate().toDateString();
    return records.filter((r) =>
      new Date(r.date).toDateString() === dateToCheck &&
      r.mode !== "manual" &&
      // 教科全体（category="all"）の履歴は総合タブの学習済み一覧に表示しない
      r.category !== "all"
    );
  }

  /**
   * 総合タブ専用のサマリパネルを描画する。
   */
  private renderOverallSummaryPanel(allRecords?: QuizRecord[]): void {
    const panel = document.getElementById("overallSummaryPanel");
    if (!panel) return;

    const records = allRecords ?? this.useCase.getHistory();
    this.updateActivityDateDisplay();
    this.renderTodayActivity(records);
    this.updateShareSummaryText(records);
    this.showOverallPanel(this.activeOverallPanel);
  }

  /**
   * 活動ラベルを本日実施した単元数（⭐の数、完了単元は🏆）に更新する。
   */
  private updateActivityDateDisplay(): void {
    const el = document.getElementById("overallActivityDateLabel");
    if (!el) return;
    const records = this.useCase.getHistory();
    const todayRecords = this.filterRecordsBySelectedDate(records);
    // 本日やった単元数をユニークカウント（unit ごとに集計）
    const unitKeys = new Set(todayRecords.map((r) => `${r.subject}::${r.category}`));
    let masteredCount = 0;
    let studiedCount = 0;
    for (const key of unitKeys) {
      const sepIdx = key.indexOf("::");
      const subj = key.slice(0, sepIdx);
      const cat = key.slice(sepIdx + 2);
      const { mastered, total } = this.useCase.getMasteredCountForCategory(subj, cat);
      if (total > 0 && mastered === total) {
        masteredCount++;
      } else {
        studiedCount++;
      }
    }
    const symbols =
      "🏆".repeat(Math.min(masteredCount, 5)) +
      "⭐".repeat(Math.min(studiedCount, 5));
    el.textContent = `学習数：${symbols}`;
  }

  /**
   * 総合タブのサマリパネルタブ（学習済み / シェア）を切り替える。
   */
  private showOverallPanel(tab: "learned" | "share"): void {
    document.getElementById("overallLearnedPanel")?.classList.toggle("hidden", tab !== "learned");
    document.getElementById("overallSharePanel")?.classList.toggle("hidden", tab !== "share");

    document.querySelectorAll<HTMLElement>(".panel-tab[data-overall-panel]").forEach((t) => {
      const isActive = t.dataset.overallPanel === tab;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", String(isActive));
    });
  }

  /**
   * 今日の活動セクションを描画する。
   * selectedActivityDate の日付と一致するクイズ記録を履歴と同じ形式で表示する。
   */
  private renderTodayActivity(records: QuizRecord[]): void {
    const container = document.getElementById("todayActivityContent");
    if (!container) return;

    const todayRecords = this.filterRecordsBySelectedDate(records);

    container.innerHTML = "";

    if (todayRecords.length === 0) {
      const empty = document.createElement("p");
      empty.className = "today-activity-empty";
      empty.textContent = "この日はまだ問題を解いていません。";
      container.appendChild(empty);
      return;
    }

    // 最新順に並べて履歴形式で表示（総合タブなので教科名プレフィックスを付ける）
    const sorted = [...todayRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sorted.forEach((record) => {
      container.appendChild(this.buildHistoryItem(record, true));
    });
  }

  /**
   * SNS 共有用の活動サマリテキストを構築して shareSummaryText 要素に反映する。
   */
  private updateShareSummaryText(records: QuizRecord[]): void {
    const el = document.getElementById("shareSummaryText");
    if (el) {
      el.textContent = this.buildShareSummaryText(records);
    }
  }

  /**
   * SNS 共有用の活動サマリテキストを構築して返す。
   * selectedActivityDate の日付を基準とし、各単元の成績を含む。
   * テキストに「学習サマリ」ヘッダーは含めず、単元数で合計を表示する。
   */
  private buildShareSummaryText(records: QuizRecord[]): string {
    const [year, month, day] = this.selectedActivityDate.split("-");
    const dateStr = `${year}/${month}/${day}`;
    const dateRecords = this.filterRecordsBySelectedDate(records);

    const lines: string[] = [`📅 ${dateStr}`];

    if (dateRecords.length === 0) {
      lines.push("まだクイズをしていません。");
      return lines.join("\n");
    }

    const subjectIconMap = Object.fromEntries(
      SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin").map((s) => [s.id, s.icon])
    );

    // 教科＋単元ごとに集計
    const byUnit = new Map<string, { subject: string; subjectName: string; categoryName: string; icon: string; total: number; correct: number }>();
    for (const r of dateRecords) {
      const key = `${r.subject}::${r.category}`;
      const u = byUnit.get(key) ?? {
        subject: r.subject,
        subjectName: r.subjectName,
        categoryName: r.categoryName,
        icon: subjectIconMap[r.subject] ?? "📝",
        total: 0,
        correct: 0,
      };
      u.total += r.totalCount;
      u.correct += r.correctCount;
      byUnit.set(key, u);
    }

    for (const [key, data] of byUnit.entries()) {
      const pct = Math.round((data.correct / data.total) * 100);
      const category = key.split("::")[1] ?? "";
      const topCat = this.useCase.getTopCategoryForUnit(data.subject, category);
      const parentCat = this.useCase.getParentCategoryForUnit(data.subject, category);

      // パス: 教科 > トップカテゴリ > 親カテゴリ > 単元名（存在する階層のみ表示）
      // トップカテゴリと親カテゴリが同名の場合は重複を避けてトップカテゴリを省略する
      const pathParts: string[] = [data.subjectName];
      const shouldIncludeTopCategory = topCat !== undefined && topCat.name !== parentCat?.name;
      if (shouldIncludeTopCategory && topCat) pathParts.push(topCat.name);
      if (parentCat) pathParts.push(parentCat.name);
      pathParts.push(data.categoryName);

      lines.push(`${data.icon} ${pathParts.join(" > ")}: ${data.correct}/${data.total}問正解 (${pct}%)`);
    }

    // 合計は単元数で表示する
    const unitCount = byUnit.size;
    lines.push("---");
    lines.push(`合計: ${unitCount}単元`);

    return lines.join("\n");
  }

  /**
   * 活動サマリテキストをクリップボードにコピーする。
   */
  private copyShareSummary(): void {
    const el = document.getElementById("shareSummaryText");
    const text = el?.textContent ?? "";
    if (!text) return;

    const btn = document.getElementById("copySummaryBtn") as HTMLButtonElement | null;
    const originalText = btn?.textContent ?? "";
    const markCopied = (): void => {
      if (btn) {
        btn.textContent = "✅ コピーしました";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      }
    };

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        this.fallbackCopy(text);
        markCopied();
      });
    } else {
      this.fallbackCopy(text);
      markCopied();
    }
  }

  /**
   * navigator.clipboard が使用できない環境向けのコピーフォールバック。
   * document.execCommand('copy') は非推奨だが、navigator.clipboard 非対応環境用の代替として使用する。
   */
  private fallbackCopy(text: string): void {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  /**
   * 共有 URL の「共有」ボタンの状態と URL 表示ボタンのテキストを更新する。
   * URL が設定されている場合は表示ボタンをグレー調に変更する。
   */
  private updateShareUrlOpenBtn(): void {
    const btn = document.getElementById("openShareUrlBtn") as HTMLButtonElement | null;
    if (btn) {
      if (this.shareUrl) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
      }
    }
    // URL 表示ボタンのテキストと色状態を更新
    const displayBtn = document.getElementById("shareUrlDisplayBtn") as HTMLButtonElement | null;
    if (displayBtn) {
      displayBtn.textContent = this.shareUrl || "URLを設定";
      displayBtn.classList.toggle("share-url-set", !!this.shareUrl);
    }
  }

  /**
   * 共有 URL のインライン編集エリアを開く（名称編集と同様のパターン）。
   */
  private openShareUrlEdit(): void {
    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    const editArea = document.getElementById("shareUrlEditArea");
    const input = document.getElementById("shareUrlInput") as HTMLInputElement | null;
    if (!displayBtn || !editArea || !input) return;

    input.value = this.shareUrl;
    displayBtn.classList.add("hidden");
    displayBtn.setAttribute("aria-expanded", "true");
    editArea.classList.remove("hidden");
    input.focus();
    input.select();
  }

  /**
   * 共有 URL のインライン編集エリアを閉じる。
   * フォーカスを表示ボタンに戻す。
   */
  private closeShareUrlEdit(): void {
    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    const editArea = document.getElementById("shareUrlEditArea");
    if (!displayBtn || !editArea) return;

    editArea.classList.add("hidden");
    displayBtn.classList.remove("hidden");
    displayBtn.setAttribute("aria-expanded", "false");
    displayBtn.focus();
  }

  /**
   * 共有 URL を保存してインライン編集エリアを閉じる。
   */
  private saveAndCloseShareUrl(): void {
    const input = document.getElementById("shareUrlInput") as HTMLInputElement | null;
    if (input) {
      this.saveShareUrl(input.value.trim());
      this.updateShareUrlOpenBtn();
    }
    this.closeShareUrlEdit();
  }

  private createCategoryItem(
    subject: string,
    categoryId: string,
    categoryName: string,
    parentCatId?: string,
    topCatId?: string
  ): HTMLElement {
    const item = document.createElement("div");
    item.className = "category-item";
    item.dataset.subject = subject;
    item.dataset.category = categoryId;
    if (parentCatId) {
      item.dataset.parentCategory = parentCatId;
    }
    if (topCatId) {
      item.dataset.topCategory = topCatId;
    }
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");

    const statusSpan = document.createElement("span");
    statusSpan.className = "category-status";
    statusSpan.setAttribute("aria-hidden", "true");
    statusSpan.textContent = "⬜";

    // カテゴリ名 + 例文 + 進捗バーのエリア
    const nameArea = document.createElement("div");
    nameArea.className = "category-name-area";

    // タイトルと例文・説明文を横並びにするラッパー
    const titleRow = document.createElement("div");
    titleRow.className = "category-title-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "category-name";
    nameSpan.textContent = categoryName;
    titleRow.appendChild(nameSpan);

    // 学年別ビューでは親カテゴリ・トップカテゴリの名称を表示する
    if (this.categoryViewMode === "grade") {
      const parentInfo = this.useCase.getParentCategoryForUnit(subject, categoryId);
      const topInfo = this.useCase.getTopCategoryForUnit(subject, categoryId);
      const nameParts: string[] = [];
      if (topInfo) nameParts.push(topInfo.name);
      if (parentInfo) nameParts.push(parentInfo.name);
      if (nameParts.length > 0) {
        const hierarchySpan = document.createElement("span");
        hierarchySpan.className = "category-hierarchy";
        hierarchySpan.textContent = nameParts.join(" › ");
        titleRow.appendChild(hierarchySpan);
      }
    }

    nameArea.appendChild(titleRow);

    // 進捗バーと進捗数値を横並びにするラッパー
    const progressRow = document.createElement("div");
    progressRow.className = "category-progress-row";

    const progressBar = document.createElement("div");
    progressBar.className = "category-progress-bar";
    const progressFill = document.createElement("div");
    progressFill.className = "category-progress-fill";
    progressBar.appendChild(progressFill);
    const progressFillInProgress = document.createElement("div");
    progressFillInProgress.className = "category-progress-fill-inprogress";
    progressBar.appendChild(progressFillInProgress);

    const statsSpan = document.createElement("span");
    statsSpan.className = "category-stats";

    progressRow.appendChild(progressBar);
    progressRow.appendChild(statsSpan);

    nameArea.appendChild(progressRow);

    // 参考学年バッジ（referenceGrade が設定されている場合のみ表示、学年別ビューでは非表示）
    const referenceGrade = this.useCase.getCategoryReferenceGrade(subject, categoryId);
    const gradeSpan = document.createElement("span");
    gradeSpan.className = "category-grade";
    if (referenceGrade && this.categoryViewMode !== "grade") {
      gradeSpan.textContent = referenceGrade;
      const gradeClass = gradeColorClass(referenceGrade);
      if (gradeClass) {
        gradeSpan.classList.add(gradeClass);
      }
      titleRow.appendChild(gradeSpan);
    }

    // 左列に statusSpan・nameArea をまとめる（gradeSpan・statsSpanは nameArea 内に配置済み）
    const leftCol = document.createElement("div");
    leftCol.className = "category-item-left";
    leftCol.appendChild(statusSpan);
    leftCol.appendChild(nameArea);
    item.appendChild(leftCol);

    // 説明・例文は右列に常時表示
    const description = this.useCase.getCategoryDescription(subject, categoryId);
    const example = this.useCase.getCategoryExample(subject, categoryId);

    if (description !== undefined || example !== undefined) {
      item.classList.add("category-item-has-info");
      const rightCol = document.createElement("div");
      rightCol.className = "category-item-right";
      if (description) {
        const descSpan = document.createElement("span");
        descSpan.className = "category-item-description";
        descSpan.textContent = description;
        rightCol.appendChild(descSpan);
      }
      if (example !== undefined) {
        const exampleSpan = document.createElement("span");
        exampleSpan.className = "category-example";
        this.renderBacktickText(exampleSpan, example);
        rightCol.appendChild(exampleSpan);
      }
      item.appendChild(rightCol);
    }

    const handleActivate = (e: Event): void => {
      e.stopPropagation();
      // 既に選択中の単元をクリックした場合は非選択に戻す（トグル）
      if (this.filter.subject === subject && this.filter.category === categoryId) {
        this.deselectAndRefresh();
        return;
      }
      const wasProgressTab = this.filter.subject === "progress";
      this.filter.subject = subject;
      this.filter.category = categoryId;
      this.filter.parentCategory = parentCatId;
      this.selectedTopCategoryId = null;
      if (wasProgressTab) {
        // 進度タブから単元を選択した場合: 対応する教科タブをアクティブにして再描画する
        this.selectTabByFilter();
        this.renderCategoryList();
      }
      this.updateCategoryListActive();
      const categoryRecords = this.useCase.getHistory();
      // 単元を切り替えても前回のパネルタブを引き継ぐ（解説タブへの自動切換えを抑制）
      this.isPanelTabUserSelected = true;
      this.autoSelectPanelTab(categoryRecords);
      this.updateStartScreen(categoryRecords);
    };

    item.addEventListener("click", handleActivate);
    item.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate(e);
      }
    });

    return item;
  }

  /**
   * バッククォートで囲まれたテキストを <code> タグに変換して要素に追加する。
   * 例: "I `play` games." → "I " + <code>play</code> + " games."
   */
  private renderBacktickText(container: HTMLElement, text: string): void {
    const parts = text.split(/`([^`]+)`/);
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const code = document.createElement("code");
        code.className = "category-example-highlight";
        code.textContent = part;
        container.appendChild(code);
      } else if (part) {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  /**
   * 現在のフィルターに基づいてカテゴリアイテムのアクティブ状態を更新する。
   * アクティブなカテゴリが折りたたまれているグループに属する場合は自動展開する。
   */
  private updateCategoryListActive(): void {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const selLevel = this.getSelectionLevel();

    categoryList.querySelectorAll(".category-item").forEach((item) => {
      const el = item as HTMLElement;
      const isActive =
        selLevel === "unit" &&
        el.dataset.subject === this.filter.subject &&
        el.dataset.category === this.filter.category;
      el.classList.toggle("active", isActive);

      if (isActive) {
        // 親カテゴリグループを自動展開する
        if (el.dataset.parentCategory) {
          this.expandParentCategory(el.dataset.parentCategory);
        }
        // トップカテゴリグループも自動展開する
        if (el.dataset.topCategory) {
          this.expandTopCategory(el.dataset.topCategory);
        }
        // 学年グループを自動展開する（学年別ビュー用）
        const gradeGroup = el.closest<HTMLElement>(".category-grade-group");
        if (gradeGroup) {
          const grade = gradeGroup.dataset.grade;
          if (grade && this.collapsedGradeGroups.has(grade)) {
            this.collapsedGradeGroups.delete(grade);
            gradeGroup.classList.remove("collapsed");
            const header = gradeGroup.querySelector<HTMLElement>(".category-grade-group-header");
            header?.setAttribute("aria-expanded", "true");
          }
        }
      }
    });

    // 親カテゴリヘッダーのアクティブ状態を更新
    categoryList.querySelectorAll<HTMLElement>(".category-group-header[data-parent-category]").forEach((header) => {
      const isActive =
        selLevel === "parentCategory" &&
        header.dataset.parentCategory === this.filter.parentCategory;
      header.classList.toggle("active", isActive);
    });

    // トップカテゴリヘッダーのアクティブ状態を更新
    categoryList.querySelectorAll<HTMLElement>(".category-top-group-header[data-top-category]").forEach((header) => {
      const isActive =
        selLevel === "topCategory" &&
        header.dataset.topCategory === this.selectedTopCategoryId;
      header.classList.toggle("active", isActive);
    });
  }

  /**
   * インナーパネルタブのコンテンツ表示を切り替える
   */
  private showPanelTab(tab: "quiz" | "guide" | "history" | "questions"): void {
    const quizModePanel = document.getElementById("quizModePanel");
    const guideContent = document.getElementById("guideContent");
    const historyContent = document.getElementById("historyContent");
    const questionListContent = document.getElementById("questionListContent");

    quizModePanel?.classList.toggle("hidden", tab !== "quiz");
    guideContent?.classList.toggle("hidden", tab !== "guide");
    historyContent?.classList.toggle("hidden", tab !== "history");
    questionListContent?.classList.toggle("hidden", tab !== "questions");

    document.querySelectorAll<HTMLElement>(".panel-tab").forEach((t) => {
      const isActive = t.dataset.panel === tab;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", String(isActive));
      t.setAttribute("tabindex", isActive ? "0" : "-1");
    });
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
    if (this.isPanelTabUserSelected) {
      // ユーザーが明示的にタブを選択している場合は自動選択しない
      this.showPanelTab(this.activePanelTab);
      return;
    }
    // 総合タブから単元選択時: 履歴があれば確認タブ、なければ解説タブ
    if (this.overallUnitSelected !== null) {
      const hasHistory = allRecords.some(
        (r) =>
          r.subject === this.overallUnitSelected!.subject &&
          r.category === this.overallUnitSelected!.categoryId
      );
      this.activePanelTab = hasHistory ? "quiz" : "guide";
      this.showPanelTab(this.activePanelTab);
      return;
    }
    const selLevel = this.getSelectionLevel();
    if (selLevel === "topCategory" || selLevel === "parentCategory") {
      // カテゴリ/サブカテゴリ選択時は常に解説タブを表示
      this.activePanelTab = "guide";
    } else if (selLevel === "unit") {
      const hasHistory = allRecords.some(
        (r) => r.subject === this.filter.subject && r.category === this.filter.category
      );
      this.activePanelTab = hasHistory ? "quiz" : "guide";
    } else {
      this.activePanelTab = "quiz";
    }
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
    this.isPanelTabUserSelected = false;
    this.updateCategoryListActive();
    const records = this.useCase.getHistory();
    this.autoSelectPanelTab(records);
    this.updateStartScreen(records);
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
    const container = document.getElementById("selectedUnitInfo");
    if (!container) return;

    const selLevel = this.getSelectionLevel();

    // 総合タブから単元が選択されている場合: 教科の画面と同じ形式で詳細を表示
    if (this.overallUnitSelected !== null) {
      container.classList.remove("hidden");
      container.innerHTML = "";

      const subject = this.overallUnitSelected.subject;
      const categoryId = this.overallUnitSelected.categoryId;

      const body = document.createElement("div");
      body.className = "selected-unit-info-body";

      const topInfo = this.useCase.getTopCategoryForUnit(subject, categoryId);
      const parentInfo = this.useCase.getParentCategoryForUnit(subject, categoryId);
      const catParts: string[] = [];
      if (topInfo) catParts.push(topInfo.name);
      if (parentInfo) catParts.push(parentInfo.name);
      const grade = this.useCase.getCategoryReferenceGrade(subject, categoryId);
      const example = this.useCase.getCategoryExample(subject, categoryId);
      const description = this.useCase.getCategoryDescription(subject, categoryId);

      // 行1: タイトル（左） / 説明（右）
      const headerRow = document.createElement("div");
      headerRow.className = "selected-unit-info-header-row";

      const headerLeft = document.createElement("div");
      headerLeft.className = "selected-unit-info-header-left";
      const nameSpan = document.createElement("span");
      nameSpan.className = "selected-unit-info-name";
      nameSpan.textContent = this.overallUnitSelected.categoryName;
      headerLeft.appendChild(nameSpan);
      headerRow.appendChild(headerLeft);

      if (description !== undefined) {
        const headerRight = document.createElement("div");
        headerRight.className = "selected-unit-info-header-right";
        const descDiv = document.createElement("div");
        descDiv.className = "selected-unit-info-desc-right selected-unit-info-desc";
        descDiv.textContent = description;
        headerRight.appendChild(descDiv);
        headerRow.appendChild(headerRight);
      }
      body.appendChild(headerRow);

      // 行2: カテゴリ+学年（左） / 例文（右）
      const hasCatOrGrade = catParts.length > 0 || !!grade;
      if (hasCatOrGrade || example !== undefined) {
        const descRow = document.createElement("div");
        descRow.className = "selected-unit-info-desc-row";

        const descLeft = document.createElement("div");
        descLeft.className = "selected-unit-info-desc-left";
        if (catParts.length > 0) {
          const catLabel = document.createElement("span");
          catLabel.className = "selected-unit-info-category";
          catLabel.textContent = catParts.join(" › ");
          descLeft.appendChild(catLabel);
        }
        if (grade) {
          const gradeSpan = document.createElement("span");
          gradeSpan.className = "category-grade";
          const gradeClass = gradeColorClass(grade);
          if (gradeClass) gradeSpan.classList.add(gradeClass);
          gradeSpan.textContent = grade;
          descLeft.appendChild(gradeSpan);
        }
        descRow.appendChild(descLeft);

        if (example !== undefined) {
          const descRight = document.createElement("div");
          descRight.className = "selected-unit-info-desc-right selected-unit-info-example";
          this.renderBacktickText(descRight, example);
          descRow.appendChild(descRight);
        }
        body.appendChild(descRow);
      }

      // 行3: ステータスバー（全幅）
      const { mastered, total } = this.useCase.getMasteredCountForCategory(subject, categoryId);
      const inProgressCount = this.useCase.getInProgressCount({ subject, category: categoryId });
      const { masteredPct, inProgressPct } = calcDualProgressPct(mastered, inProgressCount, total);
      const progressRow = document.createElement("div");
      progressRow.className = "selected-unit-progress-row";
      const progressBar = document.createElement("div");
      progressBar.className = "selected-unit-progress-bar";
      const progressFill = document.createElement("div");
      progressFill.className = "selected-unit-progress-fill";
      progressFill.style.width = `${masteredPct}%`;
      progressBar.appendChild(progressFill);
      const progressFillInProgress = document.createElement("div");
      progressFillInProgress.className = "selected-unit-progress-fill-inprogress";
      progressFillInProgress.style.width = `${inProgressPct}%`;
      progressBar.appendChild(progressFillInProgress);
      const progressLabel = document.createElement("span");
      progressLabel.className = "selected-unit-progress-label";
      progressLabel.textContent = inProgressCount > 0 ? `${mastered}(${inProgressCount})/${total}` : `${mastered}/${total}`;
      progressRow.appendChild(progressBar);
      progressRow.appendChild(progressLabel);
      body.appendChild(progressRow);

      container.appendChild(body);

      const closeBtn = document.createElement("button");
      closeBtn.className = "selected-unit-close-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "✕";
      closeBtn.title = "閉じる";
      closeBtn.setAttribute("aria-label", "単元の解説を閉じる");
      closeBtn.addEventListener("click", () => this.closeOverallUnitView());
      container.appendChild(closeBtn);

      document.getElementById("categoryList")?.classList.add("detail-active");
      return;
    }

    if (selLevel === "none" || this.filter.subject === "all") {
      container.classList.add("hidden");
      document.getElementById("categoryList")?.classList.remove("detail-active");
      return;
    }

    container.classList.remove("hidden");
    container.innerHTML = "";

    const body = document.createElement("div");
    body.className = "selected-unit-info-body";

    const nameSpan = document.createElement("span");
    nameSpan.className = "selected-unit-info-name";

    if (selLevel === "unit") {
      const cats = this.useCase.getCategoriesForSubject(this.filter.subject);
      nameSpan.textContent = cats[this.filter.category] ?? this.filter.category;
    } else if (selLevel === "parentCategory" && this.filter.parentCategory) {
      const parentCats = this.useCase.getParentCategoriesForSubject(this.filter.subject);
      nameSpan.textContent = parentCats[this.filter.parentCategory] ?? this.filter.parentCategory;
    } else if (selLevel === "topCategory" && this.selectedTopCategoryId) {
      const topCats = this.useCase.getTopCategoriesForSubject(this.filter.subject);
      nameSpan.textContent = topCats[this.selectedTopCategoryId] ?? this.selectedTopCategoryId;
    }

    // 詳細行（単元選択時のみ）: 新レイアウト
    if (selLevel === "unit") {
      const topInfo = this.useCase.getTopCategoryForUnit(this.filter.subject, this.filter.category);
      const parentInfo = this.useCase.getParentCategoryForUnit(this.filter.subject, this.filter.category);
      const catParts: string[] = [];
      if (topInfo) catParts.push(topInfo.name);
      if (parentInfo) catParts.push(parentInfo.name);
      const grade = this.useCase.getCategoryReferenceGrade(this.filter.subject, this.filter.category);
      const example = this.useCase.getCategoryExample(this.filter.subject, this.filter.category);
      const description = this.useCase.getCategoryDescription(this.filter.subject, this.filter.category);

      // 行1: タイトル（左） / 説明（右）
      const headerRow = document.createElement("div");
      headerRow.className = "selected-unit-info-header-row";

      const headerLeft = document.createElement("div");
      headerLeft.className = "selected-unit-info-header-left";
      headerLeft.appendChild(nameSpan);
      headerRow.appendChild(headerLeft);

      if (description !== undefined) {
        const headerRight = document.createElement("div");
        headerRight.className = "selected-unit-info-header-right";
        const descDiv = document.createElement("div");
        descDiv.className = "selected-unit-info-desc-right selected-unit-info-desc";
        descDiv.textContent = description;
        headerRight.appendChild(descDiv);
        headerRow.appendChild(headerRight);
      }
      body.appendChild(headerRow);

      // 行2: カテゴリ+学年（左） / 例文（右）
      const hasCatOrGrade = catParts.length > 0 || !!grade;
      if (hasCatOrGrade || example !== undefined) {
        const descRow = document.createElement("div");
        descRow.className = "selected-unit-info-desc-row";

        const descLeft = document.createElement("div");
        descLeft.className = "selected-unit-info-desc-left";
        if (catParts.length > 0) {
          const catLabel = document.createElement("span");
          catLabel.className = "selected-unit-info-category";
          catLabel.textContent = catParts.join(" › ");
          descLeft.appendChild(catLabel);
        }
        if (grade) {
          const gradeSpan = document.createElement("span");
          gradeSpan.className = "category-grade";
          const gradeClass = gradeColorClass(grade);
          if (gradeClass) gradeSpan.classList.add(gradeClass);
          gradeSpan.textContent = grade;
          descLeft.appendChild(gradeSpan);
        }
        descRow.appendChild(descLeft);

        if (example !== undefined) {
          const descRight = document.createElement("div");
          descRight.className = "selected-unit-info-desc-right selected-unit-info-example";
          this.renderBacktickText(descRight, example);
          descRow.appendChild(descRight);
        }
        body.appendChild(descRow);
      }

      // 行3: ステータスバー（全幅）
      const { mastered, total } = this.useCase.getMasteredCountForCategory(this.filter.subject, this.filter.category);
      const inProgressCountSidebar = this.useCase.getInProgressCount({ subject: this.filter.subject, category: this.filter.category });
      const { masteredPct, inProgressPct } = calcDualProgressPct(mastered, inProgressCountSidebar, total);
      const progressRow = document.createElement("div");
      progressRow.className = "selected-unit-progress-row";
      const progressBar = document.createElement("div");
      progressBar.className = "selected-unit-progress-bar";
      const progressFill = document.createElement("div");
      progressFill.className = "selected-unit-progress-fill";
      progressFill.style.width = `${masteredPct}%`;
      progressBar.appendChild(progressFill);
      const progressFillInProgress = document.createElement("div");
      progressFillInProgress.className = "selected-unit-progress-fill-inprogress";
      progressFillInProgress.style.width = `${inProgressPct}%`;
      progressBar.appendChild(progressFillInProgress);
      const progressLabel = document.createElement("span");
      progressLabel.className = "selected-unit-progress-label";
      progressLabel.textContent = inProgressCountSidebar > 0 ? `${mastered}(${inProgressCountSidebar})/${total}` : `${mastered}/${total}`;
      progressRow.appendChild(progressBar);
      progressRow.appendChild(progressLabel);
      body.appendChild(progressRow);
    } else {
      // カテゴリ・トップカテゴリ選択時: タイトルのみ
      body.appendChild(nameSpan);
    }

    container.appendChild(body);

    // 閉じるボタン（選択を解除して右パネルを閉じる）
    const closeBtn = document.createElement("button");
    closeBtn.className = "selected-unit-close-btn";
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.title = "閉じる";
    closeBtn.setAttribute("aria-label", "選択を解除して閉じる");
    closeBtn.addEventListener("click", () => {
      this.deselectAndRefresh();
    });
    container.appendChild(closeBtn);

    document.getElementById("categoryList")?.classList.add("detail-active");
  }

  private updateGuidePanelContent(): void {
    this.updateGuidePanelContentByIds("guidePanelFrame", "guideNoContent");
  }

  /**
   * 総合タブから選択した単元の解説表示を閉じ、総合タブの概要画面に戻る。
   */
  private closeOverallUnitView(): void {
    this.overallUnitSelected = null;
    const records = this.useCase.getHistory();
    this.updateStartScreen(records);
  }

  /**
   * 親カテゴリの解説を解説パネルに表示する。
   * 解説タブに切り替えて、指定した親カテゴリの解説 URL を解説コンテナにロードする。
   */
  private showParentCategoryGuide(guideUrl: string): void {
    this.activePanelTab = "guide";
    this.isPanelTabUserSelected = true;
    this.showPanelTab("guide");

    const guideFrame = document.getElementById("guidePanelFrame");
    const noContent = document.getElementById("guideNoContent");
    if (!guideFrame) return;

    void this.loadGuideContent(guideFrame, guideUrl, noContent ?? undefined);
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
    const guideFrame = document.getElementById(frameId);
    const noContent = document.getElementById(noContentId);
    if (!guideFrame) return;

    let guideUrl: string | undefined;

    if (this.overallUnitSelected !== null) {
      // 総合タブから単元選択時: overallUnitSelected の教科・単元で解説 URL を取得
      guideUrl = this.useCase.getCategoryGuideUrl(
        this.overallUnitSelected.subject,
        this.overallUnitSelected.categoryId
      );
    } else {
      const selLevel = this.getSelectionLevel();
      if (selLevel === "unit") {
        guideUrl = this.useCase.getCategoryGuideUrl(this.filter.subject, this.filter.category);
      } else if (selLevel === "parentCategory" && this.filter.parentCategory) {
        guideUrl = this.useCase.getParentCategoryGuideUrl(this.filter.subject, this.filter.parentCategory);
      } else if (selLevel === "topCategory" && this.selectedTopCategoryId) {
        guideUrl = this.useCase.getTopCategoryGuideUrl(this.filter.subject, this.selectedTopCategoryId);
      } else {
        guideUrl = this.useCase.getFirstAvailableGuideUrl();
      }
    }

    if (guideUrl) {
      guideFrame.classList.remove("hidden");
      noContent?.classList.add("hidden");
      void this.loadGuideContent(guideFrame, guideUrl, noContent ?? undefined);
    } else {
      guideFrame.classList.add("hidden");
      noContent?.classList.remove("hidden");
    }
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
    // 既に同じ URL を表示中なら再ロードしない
    if (container.dataset.loadedUrl === guideUrl) return;

    // リクエストごとにトークンを割り当て、最新リクエスト以外は結果を破棄する
    const token = ++this.guideLoadCounter;

    // 絶対 URL（外部オリジン）は CORS リスクがあるため fetch せず別タブで開くリンクを表示する
    try {
      const parsed = new URL(guideUrl, window.location.href);
      if (parsed.origin !== window.location.origin) {
        if (token !== this.guideLoadCounter) return;
        container.dataset.loadedUrl = "";
        container.querySelectorAll(".guide-error-msg").forEach((el) => el.remove());
        const link = document.createElement("p");
        link.className = "guide-error-msg guide-no-content";
        const anchor = document.createElement("a");
        anchor.href = guideUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = "解説を別タブで開く";
        link.appendChild(anchor);
        container.appendChild(link);
        noContent?.classList.add("hidden");
        container.classList.remove("hidden");
        return;
      }
    } catch {
      // URL パースに失敗した場合はそのまま fetch を試みる
    }

    try {
      const response = await fetch(guideUrl);
      if (token !== this.guideLoadCounter) return; // 古いリクエストは破棄
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // XSS 対策: script 要素・on* 属性・危険な要素を除去する
      doc.querySelectorAll("script, iframe, object, embed, link[rel='import'], meta[http-equiv='refresh']").forEach((el) => el.remove());
      doc.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes)
          .filter((attr) => attr.name.startsWith("on"))
          .forEach((attr) => el.removeAttribute(attr.name));
      });

      // 注入コンテンツ内のすべての id 属性を除去して主ページIDとの衝突を防ぐ
      doc.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

      // body のコンテンツを取得（site-header・site-footer・post-header・スタイル等を除く）
      const bodyClone = doc.body.cloneNode(true) as HTMLBodyElement;
      bodyClone.querySelectorAll(
        "header.site-header, footer.site-footer, footer, header.post-header, style, .site-nav, .site-title, a.site-title"
      ).forEach((el) => el.remove());
      // 「This site is open source. Improve this page.」等の GitHub Pages 固有要素を除去
      // Minima テーマの edit-link クラスや、特定の GitHub リポジトリリンクを含む要素を除去する
      bodyClone.querySelectorAll(".edit-link, .gh-edit-link, [class*='improve'], [class*='edit-page']").forEach((el) => el.remove());
      // テキストに「This site is open source」または「Improve this page」を含む要素を除去する
      // ただし h1〜h6・table・ul・ol 等のコンテンツ構造を持つ要素は除去しない（親コンテナの誤削除を防ぐ）
      const contentStructureSelector = "h1, h2, h3, h4, h5, h6, table, ul, ol";
      bodyClone.querySelectorAll("p, div, span, aside").forEach((el) => {
        const text = el.textContent ?? "";
        if ((text.includes("This site is open source") || text.includes("Improve this page")) &&
            !el.querySelector(contentStructureSelector)) {
          el.remove();
        }
      });

      // guide-content コンテナを作成（または既存を再利用）して直接挿入する
      let guideContent = container.querySelector<HTMLElement>(".guide-content");
      if (!guideContent) {
        guideContent = document.createElement("div");
        guideContent.className = "guide-content";
        container.appendChild(guideContent);
      }
      guideContent.innerHTML = bodyClone.innerHTML;

      container.dataset.loadedUrl = guideUrl;
      container.classList.remove("hidden");
      noContent?.classList.add("hidden");
    } catch (err) {
      if (token !== this.guideLoadCounter) return; // 古いリクエストは破棄
      console.error("解説の読み込みに失敗しました:", err);
      container.dataset.loadedUrl = "";
      // innerHTML を上書きせず、エラーメッセージのみ追加する
      container.querySelectorAll(".guide-error-msg").forEach((el) => el.remove());
      const errorMsg = document.createElement("p");
      errorMsg.className = "guide-error-msg guide-no-content";
      errorMsg.textContent = "解説の読み込みに失敗しました。";
      container.appendChild(errorMsg);
      noContent?.classList.add("hidden");
    }
  }

  // ─── 回答記録 ──────────────────────────────────────────────────────────────

  /**
   * 回答記録一覧を描画する
   * filter の subject・category に応じて記録を絞り込む
   * @param allRecords - 呼び出し元で取得済みの履歴配列（省略時は内部でロードする）
   */
  private renderHistoryList(filter: QuizFilter, allRecords?: QuizRecord[]): void {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    const records = (allRecords ?? this.useCase.getHistory()).filter(
      (r) =>
        (filter.subject === "all" || r.subject === filter.subject) &&
        (filter.category === "all" || r.category === filter.category)
    );
    historyList.innerHTML = "";

    if (records.length === 0) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "まだ回答記録がありません。クイズを解いてみましょう！";
      historyList.appendChild(empty);
      return;
    }

    records.forEach((record) => {
      historyList.appendChild(this.buildHistoryItem(record));
    });
  }

  /**
   * @param showSubjectPrefix true のとき「教科名 / 単元名」形式で表示する（総合タブ用）。
   *                          false のとき単元名のみ表示する（教科別タブ用）。
   */
  private buildHistoryItem(record: QuizRecord, showSubjectPrefix = false): HTMLElement {
    const item = document.createElement("div");
    item.className = "history-item";

    // ヘッダー行（日時・教科・スコア）
    const header = document.createElement("div");
    header.className = "history-item-header";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", "false");

    const date = new Date(record.date);
    // 総合タブの実施済み単元リストでは時刻のみ表示する
    const dateStr = showSubjectPrefix
      ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
      : `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    const isManual = record.mode === "manual";
    const pct = Math.round((record.correctCount / record.totalCount) * 100);

    const metaDiv = document.createElement("div");
    metaDiv.className = "history-meta";

    const dateSpan = document.createElement("span");
    dateSpan.className = "history-date";
    dateSpan.textContent = dateStr;

    const subjectSpan = document.createElement("span");
    subjectSpan.className = "history-subject";
    subjectSpan.textContent = showSubjectPrefix
      ? `${record.subjectName} / ${record.categoryName}`
      : record.categoryName;

    metaDiv.appendChild(dateSpan);
    metaDiv.appendChild(subjectSpan);

    const scoreSpan = document.createElement("span");
    if (isManual) {
      scoreSpan.className = "history-score";
      scoreSpan.textContent = "-";
    } else {
      scoreSpan.className = `history-score ${pct >= 70 ? "pass" : "fail"}`;
      scoreSpan.textContent = `${record.correctCount}/${record.totalCount} (${pct}%)`;
    }

    header.appendChild(metaDiv);
    header.appendChild(scoreSpan);

    // 詳細（折りたたみ）
    const detail = document.createElement("div");
    detail.className = "history-detail hidden";

    if (isManual) {
      // 手動確認済みの記録は詳細を展開できない
      header.removeAttribute("role");
      header.removeAttribute("tabindex");
      header.removeAttribute("aria-expanded");
    } else {
      const toggleSpan = document.createElement("span");
      toggleSpan.className = "history-toggle";
      toggleSpan.textContent = "▶";
      header.appendChild(toggleSpan);

      record.entries.forEach((entry) => {
        const entryDiv = document.createElement("div");
        entryDiv.className = `history-entry ${entry.isCorrect ? "correct" : "incorrect"}`;

        const iconSpan = document.createElement("span");
        iconSpan.className = "history-entry-icon";
        iconSpan.textContent = entry.isCorrect ? "✓" : "✗";

        const contentDiv = document.createElement("div");
        contentDiv.className = "history-entry-content";

        const question = this.useCase.getQuestionById(entry.questionId);

        const questionP = document.createElement("p");
        questionP.className = "history-entry-question";

        const answerP = document.createElement("p");
        answerP.className = "history-entry-answer";

        if (question) {
          const shuffled = shuffleChoices(question);
          questionP.textContent = question.question;
          const userAnswer = entry.userAnswerText ?? (shuffled.choices[entry.userAnswerIndex] ?? "未回答");
          const correctAnswer = shuffled.choices[shuffled.correct] ?? "";
          if (entry.isCorrect) {
            answerP.textContent = `正解: ${correctAnswer}`;
          } else {
            answerP.textContent = `あなたの回答: ${userAnswer} → 正解: ${correctAnswer}`;
          }
        } else {
          questionP.textContent = `(問題ID: ${entry.questionId})`;
          answerP.textContent = entry.isCorrect ? "正解" : "不正解";
        }

        contentDiv.appendChild(questionP);
        contentDiv.appendChild(answerP);
        entryDiv.appendChild(iconSpan);
        entryDiv.appendChild(contentDiv);
        detail.appendChild(entryDiv);
      });

      // 折りたたみ切り替え
      const toggleDetail = (): void => {
        const isExpanded = !detail.classList.contains("hidden");
        detail.classList.toggle("hidden", isExpanded);
        toggleSpan.textContent = isExpanded ? "▶" : "▼";
        header.setAttribute("aria-expanded", String(!isExpanded));
      };

      header.addEventListener("click", toggleDetail);
      header.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleDetail();
        }
      });
    }

    item.appendChild(header);
    item.appendChild(detail);
    return item;
  }

  // ─── 問題一覧パネル ────────────────────────────────────────────────────────

  /**
   * 現在のフィルターに基づいて問題一覧パネルを描画する
   */
  private renderQuestionList(): void {
    const bodyEl = document.getElementById("questionListBody");
    if (!bodyEl) return;

    let questions = this.useCase.getFilteredQuestions(this.getEffectiveFilter());

    // 学習済みフィルターを適用
    if (this.questionListFilter === "learned") {
      questions = questions.filter((q) => this.useCase.isMastered(q.id));
    } else if (this.questionListFilter === "unlearned") {
      questions = questions.filter((q) => !this.useCase.isMastered(q.id));
    }

    // フィルター済み問題数を表示
    const countEl = document.getElementById("questionListFilterCount");
    if (countEl) countEl.textContent = `${questions.length}問`;

    bodyEl.innerHTML = "";
    if (questions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "この単元に問題はありません。";
      bodyEl.appendChild(empty);
    } else {
      questions.forEach((q) => {
        bodyEl.appendChild(this.buildQuestionListItem(q));
      });
    }
  }

  /**
   * 問題一覧の1問分のHTML要素を構築する（問題・統計・ヒント（正解を含む）を表示）
   */
  private buildQuestionListItem(question: Question): HTMLElement {
    const item = document.createElement("div");
    item.className = "question-list-item";

    const stat = this.useCase.getQuestionStat(question.id);
    // 習得済みなら完了（🏆）
    const isCompleted = this.useCase.isMastered(question.id);
    const streak = this.useCase.getCorrectStreak(question.id);
    if (isCompleted) {
      item.classList.add("question-list-completed");
    }

    const rowDiv = document.createElement("div");
    rowDiv.className = "question-list-row";

    const textDiv = document.createElement("span");
    textDiv.className = "question-list-text";
    textDiv.textContent = question.question;
    rowDiv.appendChild(textDiv);

    // 回答統計バッジ（連続正答数を星で表示）
    const statSpan = document.createElement("span");
    statSpan.className = "question-list-stat";
    if (stat.total > 0) {
      const maxStreak = 3;
      const filledStar = "⭐";
      const emptyStar = "☆";
      const starStr = isCompleted
        ? "🏆"
        : Array.from({ length: maxStreak }, (_, i) => i < streak ? filledStar : emptyStar).join("");
      statSpan.textContent = `${starStr} 全${stat.total}回`;
    } else {
      statSpan.textContent = "-";
    }
    rowDiv.appendChild(statSpan);

    const hintBtn = document.createElement("button");
    hintBtn.className = "question-list-hint-btn";
    hintBtn.textContent = "💡";
    hintBtn.setAttribute("aria-label", "ヒントを表示");
    hintBtn.setAttribute("aria-expanded", "false");
    rowDiv.appendChild(hintBtn);

    item.appendChild(rowDiv);

    const hintDiv = document.createElement("div");
    hintDiv.className = "question-list-hint hidden";

    // 正解をヒントの中に表示
    const correctDiv = document.createElement("span");
    correctDiv.className = "question-list-correct";
    correctDiv.textContent = `✓ ${question.choices[question.correct]}`;
    hintDiv.appendChild(correctDiv);

    if (question.explanation) {
      const explanationDiv = document.createElement("div");
      explanationDiv.className = "question-list-hint-explanation";
      explanationDiv.textContent = question.explanation;
      hintDiv.appendChild(explanationDiv);
    }

    item.appendChild(hintDiv);

    hintBtn.addEventListener("click", () => {
      const isHidden = hintDiv.classList.toggle("hidden");
      hintBtn.setAttribute("aria-expanded", isHidden ? "false" : "true");
    });

    return item;
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.on("startRandomBtn", "click", () => { this.startQuiz("random").catch(console.error); });
    this.on("markLearnedBtn", "click", () => this.toggleLearnedStatus());
    this.on("prevBtn", "click", () => this.navigate(-1));
    this.on("nextBtn", "click", () => this.navigate(1));
    this.on("submitBtn", "click", () => this.submitQuiz());
    this.on("retryAllBtn", "click", () => { this.startQuiz("random").catch(console.error); });
    this.on("backToStartBtn", "click", () => this.showScreen("start"));
    this.on("cancelQuizBtn", "click", () => { void this.navigateToStart(); });

    // 問題一覧フィルターボタン
    const filterBtns = [
      { id: "questionListFilterAll", value: "all" as const },
      { id: "questionListFilterUnlearned", value: "unlearned" as const },
      { id: "questionListFilterLearned", value: "learned" as const },
    ];
    filterBtns.forEach(({ id, value }) => {
      document.getElementById(id)?.addEventListener("click", () => {
        this.questionListFilter = value;
        filterBtns.forEach(({ id: btnId }) => {
          document.getElementById(btnId)?.classList.remove("active");
        });
        document.getElementById(id)?.classList.add("active");
        this.renderQuestionList();
      });
    });

    // タイトルクリックでスタート画面へ
    const titleBtn = document.getElementById("titleBtn");
    if (titleBtn) {
      titleBtn.addEventListener("click", () => { void this.navigateToStart(); });
      titleBtn.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void this.navigateToStart();
        }
      });
    }

    // ヘッダーのユーザー名をクリックして編集を開く
    const headerUserNameBtn = document.getElementById("headerUserName");
    headerUserNameBtn?.addEventListener("click", () => this.openUserNameEdit());
    // 保存ボタン
    const headerUserNameSaveBtn = document.getElementById("headerUserNameSaveBtn");
    headerUserNameSaveBtn?.addEventListener("click", () => this.saveHeaderUserName());

    // 入力フィールド：Enterで保存、Escapeでキャンセル
    const headerUserNameInput = document.getElementById("headerUserNameInput");
    headerUserNameInput?.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.saveHeaderUserName();
      } else if (e.key === "Escape") {
        this.closeUserNameEdit();
      }
    });
    headerUserNameInput?.addEventListener("blur", (e: FocusEvent) => {
      // 保存ボタンへのフォーカス移動はスキップ（保存ボタンのclickが先に発火するため）
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget?.id !== "headerUserNameSaveBtn") {
        this.saveHeaderUserName();
      }
    });

    // 問題数選択の変更を監視
    const countInputs = document.querySelectorAll<HTMLInputElement>('input[name="questionCount"]');
    countInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.questionCount = parseInt(target.value);
          this.saveQuizSettings();
        }
      });
    });

    // 並び順選択の変更を監視
    const orderInputs = document.querySelectorAll<HTMLInputElement>('input[name="quizOrder"]');
    orderInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.quizOrder = target.value as "random" | "straight";
          this.saveQuizSettings();
        }
      });
    });

    // 学習済み含む/含まない選択の変更を監視
    const learnedInputs = document.querySelectorAll<HTMLInputElement>('input[name="quizLearned"]');
    learnedInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.includeMastered = target.value === "include";
          this.saveQuizSettings();
        }
      });
    });

    // メモエリアのコントロール
    this.on("clearNotesBtn", "click", () => this.clearNotes());
    this.on("eraserBtn", "click", () => this.toggleEraserMode());

    // KanjiCanvas操作ボタン（text-input問題のメモタブで使用）
    this.on("kanjiDeleteLastBtn", "click", () => this.kanjiDeleteLast());
    this.on("kanjiEraseBtn", "click", () => this.kanjiErase());

    // KanjiCanvas折りたたみトグルボタン
    document.getElementById("kanjiToggleBtn")?.addEventListener("click", () => {
      const body = document.getElementById("kanjiInputBody");
      const btn = document.getElementById("kanjiToggleBtn");
      if (!body || !btn) return;
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      body.classList.toggle("hidden", isExpanded);
      this.applyKanjiToggleBtnState(btn, !isExpanded);
    });

    // カテゴリ学習状態フィルターボタン
    const statusFilterBtns: Array<{ id: string; filter: "all" | "unlearned" | "studying" | "learned" }> = [
      { id: "filterStatusAll", filter: "all" },
      { id: "filterStatusUnlearned", filter: "unlearned" },
      { id: "filterStatusStudying", filter: "studying" },
      { id: "filterStatusLearned", filter: "learned" },
    ];
    statusFilterBtns.forEach(({ id, filter }) => {
      document.getElementById(id)?.addEventListener("click", () => {
        this.setCategoryStatusFilter(filter);
      });
    });

    // ページ更新ボタン
    this.on("reloadBtn", "click", () => location.reload());

    const penSizeSelect = document.getElementById("penSizeSelect") as HTMLSelectElement | null;
    penSizeSelect?.addEventListener("change", (e) => {
      const size = parseInt((e.target as HTMLSelectElement).value);
      this.notesCanvas?.setPenSize(size);
    });

    const penColorSelect = document.getElementById("penColorSelect") as HTMLSelectElement | null;
    penColorSelect?.addEventListener("change", (e) => {
      const color = (e.target as HTMLSelectElement).value;
      this.notesCanvas?.setPenColor(color);
    });

    // フォントサイズ切替ボタン
    document.querySelectorAll<HTMLButtonElement>(".font-size-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const size = btn.dataset.size as "small" | "medium" | "large" | undefined;
        if (size === "small" || size === "medium" || size === "large") {
          this.applyFontSize(size);
        }
      });
    });

    // 総合タブ: 活動サマリコピーボタン
    this.on("copySummaryBtn", "click", () => this.copyShareSummary());

    // 総合タブ: 共有ボタン（URLを新しいタブで開く）
    this.on("openShareUrlBtn", "click", () => {
      if (this.shareUrl) {
        window.open(this.shareUrl, "_blank", "noopener,noreferrer");
      }
    });

    // 総合タブ: URL表示ボタン（クリックで編集モードへ）
    this.on("shareUrlDisplayBtn", "click", () => this.openShareUrlEdit());

    // 総合タブ: 共有URL保存ボタン
    this.on("saveShareUrlBtn", "click", () => this.saveAndCloseShareUrl());

    // 総合タブ: 共有URL入力でEnterキー押下時に保存
    const shareUrlInput = document.getElementById("shareUrlInput") as HTMLInputElement | null;
    shareUrlInput?.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.saveAndCloseShareUrl();
      } else if (e.key === "Escape") {
        this.closeShareUrlEdit();
      }
    });

    // 総合タブ: URL編集中に編集エリア外をクリックしたらキャンセル
    document.addEventListener("mousedown", (e: MouseEvent) => {
      const editArea = document.getElementById("shareUrlEditArea");
      if (!editArea || editArea.classList.contains("hidden")) return;
      const inline = document.querySelector(".share-url-inline");
      if (inline && !inline.contains(e.target as Node)) {
        this.closeShareUrlEdit();
      }
    });

    // ブラウザの戻るボタンでスタート画面に戻る（setupEventListeners はコンストラクタから1度だけ呼ばれる）
    // クイズ進行中の場合は確認ダイアログを表示し、キャンセルされたら履歴に再プッシュして戻る操作を打ち消す
    window.addEventListener("popstate", () => {
      const startScreen = document.getElementById("startScreen");
      if (!startScreen?.classList.contains("hidden")) return;
      void this.navigateToStart().then(() => {
        // キャンセル時（スタート画面に遷移しなかった場合）は履歴エントリを再追加して「進む」操作を封じる
        const stillOnStart = !document.getElementById("startScreen")?.classList.contains("hidden");
        if (!stillOnStart) {
          const activeScreen = document.querySelector(".screen:not(.hidden)");
          const screenName = activeScreen?.id === "quizScreen" ? "quiz" : "result";
          window.history.pushState({ screen: screenName }, document.title);
        }
      });
    });

    // スマホ用：単元一覧に戻るボタン
    document.getElementById("mobileBackBtn")?.addEventListener("click", () => {
      this.navigateBackToList();
    });

    // ヘッダーのメニューボタン（管理パネルへのナビゲーション）
    document.getElementById("adminMenuBtn")?.addEventListener("click", () => {
      this.navigateToAdmin();
    });
  }

  // ─── スタート画面 ──────────────────────────────────────────────────────────

  /**
   * 現在有効なクイズフィルターを返す。
   * 総合タブからおすすめ単元を選択している場合は、その単元の subject/categoryId を含むフィルターを返す。
   * それ以外の場合は通常の this.filter をそのまま返す。
   */
  private getEffectiveFilter(): QuizFilter {
    if (this.overallUnitSelected !== null) {
      return {
        subject: this.overallUnitSelected.subject,
        category: this.overallUnitSelected.categoryId,
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
    if (this.filter.subject === "all") {
      // 総合タブの場合は単元選択を解除する
      this.overallUnitSelected = null;
    } else {
      // 通常タブの場合は単元・カテゴリ選択を解除する
      this.filter.category = "all";
      this.filter.parentCategory = undefined;
      this.selectedTopCategoryId = null;
    }
    this.isPanelTabUserSelected = false;
    const records = this.useCase.getHistory();
    this.updateStartScreen(records);
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
    this.overallUnitSelected = null;

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
    const masteredInFilter = filteredQuestions
      .filter((q) => masteredIdsSet.has(q.id)).length;
    // 学習中: 1回以上回答済みで未習得の問題（イシュー要件: 1回以上回答で学習済みになっていないもの）
    const inProgressInFilter = filteredQuestions
      .filter((q) => {
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
      if (this.overallUnitSelected !== null) {
        // 総合タブで単元選択中: 解説コンテンツを更新する
        this.updateGuidePanelContent();
      } else {
        this.renderOverallSummaryPanel(allRecords);
      }
    }
  }

  private updateSubjectStats(): void {
    // 全問題を1回だけ走査して subject/category/parentCategory ごとの統計を集計する
    const allQuestions = this.useCase.getFilteredQuestions({ subject: "all", category: "all" });
    const masteredSet = new Set(this.useCase.getMasteredIds());
    // questionStats をキャッシュして各問題のループ内で再利用する
    const allQuestionStats = this.useCase.getAllQuestionStats();

    const statsMap = new Map<string, { total: number; inProgress: number; mastered: number }>();
    const addStat = (key: string, isInProgress: boolean, isMastered: boolean): void => {
      const s = statsMap.get(key) ?? { total: 0, inProgress: 0, mastered: 0 };
      s.total++;
      if (isInProgress) s.inProgress++;
      if (isMastered) s.mastered++;
      statsMap.set(key, s);
    };

    for (const q of allQuestions) {
      const qStat = allQuestionStats[q.id];
      const isMastered = masteredSet.has(q.id);
      // 1回以上回答済みで未習得の問題を「学習中」とカウント
      const isInProgress = (qStat?.total ?? 0) > 0 && !isMastered;
      addStat("all::all", isInProgress, isMastered);
      addStat(`${q.subject}::all`, isInProgress, isMastered);
      addStat(`${q.subject}::${q.category}`, isInProgress, isMastered);
      if (q.parentCategory) {
        addStat(`${q.subject}::parent::${q.parentCategory}`, isInProgress, isMastered);
      }
    }

    const formatCategoryStats = (stat: { total: number; inProgress: number; mastered: number }): string => {
      if (stat.total === 0) return "";
      // 常に進捗数値を表示する
      if (stat.inProgress > 0) {
        return `${stat.mastered}(${stat.inProgress})/${stat.total}`;
      }
      return `${stat.mastered}/${stat.total}`;
    };

    // カテゴリアイテムの統計を更新
    const studiedKeys = this.useCase.getStudiedCategoryKeys();
    document.querySelectorAll(".category-item[data-subject]").forEach((item) => {
      const el = item as HTMLElement;
      const subject = el.dataset.subject || "";
      const category = el.dataset.category || "all";

      let key: string;
      if (category !== "all") {
        key = `${subject}::${category}`;
      } else {
        key = `${subject}::all`;
      }

      const stat = statsMap.get(key) ?? { total: 0, inProgress: 0, mastered: 0 };
      const statsEl = el.querySelector(".category-stats");
      if (statsEl) {
        statsEl.textContent = formatCategoryStats(stat);
      }

      // 進捗バーと進捗数値を更新
      const progressFill = el.querySelector(".category-progress-fill") as HTMLElement | null;
      const progressFillInProgress = el.querySelector(".category-progress-fill-inprogress") as HTMLElement | null;
      if (progressFill) {
        if (stat.mastered > 0 || stat.inProgress > 0) {
          const { masteredPct, inProgressPct } = calcDualProgressPct(stat.mastered, stat.inProgress, stat.total);
          progressFill.style.width = `${masteredPct}%`;
          progressFill.classList.toggle("progress-fill-done", masteredPct === 100);
          if (progressFillInProgress) {
            progressFillInProgress.style.width = `${inProgressPct}%`;
          }
        } else {
          progressFill.style.width = "0%";
          progressFill.classList.remove("progress-fill-done");
          if (progressFillInProgress) {
            progressFillInProgress.style.width = "0%";
          }
        }
      }

      // 学習状態の絵文字を更新（⬜未学習 / 🔄学習中 / ✅学習済）
      // ✅: 全問題が masteredIds にある（明示的に学習済みにした、またはクイズで習得）
      // 🔄: 1回以上回答済みで未習得の問題あり、またはクイズ履歴あり
      // ⬜: 未学習（一度も回答していない）
      const isAllMastered = stat.total > 0 && stat.mastered === stat.total;
      const isStudying = !isAllMastered && (stat.inProgress > 0 || studiedKeys.has(key));
      el.classList.toggle("learned", isAllMastered);
      el.classList.toggle("studying", isStudying);
      const statusEl = el.querySelector(".category-status");
      if (statusEl) {
        if (isAllMastered) {
          statusEl.textContent = "✅";
        } else if (isStudying) {
          statusEl.textContent = "🔄";
        } else {
          statusEl.textContent = "⬜";
        }
      }
    });
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
    const categoryList = document.getElementById("categoryList");
    if (categoryList) {
      categoryList.classList.remove("filter-unlearned", "filter-studying", "filter-learned", "hide-learned");
      if (this.categoryStatusFilter !== "all") {
        categoryList.classList.add(`filter-${this.categoryStatusFilter}`);
      }
    }
    // ボタンのアクティブ状態と aria-pressed を更新
    const btnIds: Record<string, string> = {
      all: "filterStatusAll",
      unlearned: "filterStatusUnlearned",
      studying: "filterStatusStudying",
      learned: "filterStatusLearned",
    };
    for (const [state, id] of Object.entries(btnIds)) {
      const btn = document.getElementById(id);
      const isActive = state === this.categoryStatusFilter;
      btn?.classList.toggle("active", isActive);
      btn?.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
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
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const isCollapsed = this.collapsedParentCategories.has(parentCatId);
    const groupDiv = categoryList.querySelector<HTMLElement>(`.category-group[data-parent-category="${parentCatId}"]`);
    if (groupDiv) {
      groupDiv.classList.toggle("collapsed", isCollapsed);
      const groupHeader = groupDiv.querySelector<HTMLElement>(".category-group-header");
      groupHeader?.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }
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
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const isCollapsed = this.collapsedTopCategories.has(topCatId);
    const topGroupDiv = categoryList.querySelector<HTMLElement>(`.category-top-group[data-top-category="${topCatId}"]`);
    if (topGroupDiv) {
      topGroupDiv.classList.toggle("collapsed", isCollapsed);
      const topGroupHeader = topGroupDiv.querySelector<HTMLElement>(".category-top-group-header");
      topGroupHeader?.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  /**
   * 現在選択中のカテゴリが学習済み（🏆）かどうかを返す。
   */
  private isCurrentCategoryLearned(): boolean {
    const effectiveFilter = this.getEffectiveFilter();
    if (effectiveFilter.category === "all") return false;
    const { mastered, total } = this.useCase.getMasteredCountForCategory(effectiveFilter.subject, effectiveFilter.category);
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
    const message = isCurrentlyLearned
      ? "この単元を未学習に戻しますか？"
      : "この単元を学習済みにしますか？";
    void this.showConfirmDialog(message).then((confirmed) => {
      if (!confirmed) return;
      if (isCurrentlyLearned) {
        this.useCase.unmarkCategoryAsLearned(effectiveFilter);
      } else {
        this.useCase.markCategoryAsLearned(effectiveFilter);
      }
      this.updateStartScreen();
    }).catch(console.error);
  }

  /**
   * クイズパネルの表示/非表示を更新する。
   * 教科タブでカテゴリが未選択（category === "all"）の場合はクイズパネルを非表示にし、
   * カテゴリが選択されている場合は表示する。
   * 「総合」タブ（subject === "all"）では通常のパネルタブを非表示にし、総合サマリパネルを表示する。
   */
  private updateQuizPanelVisibility(): void {
    const subjectContent = document.getElementById("subjectContent");
    if (!subjectContent) return;

    if (this.filter.subject === "admin") {
      subjectContent.classList.add("category-only");
      subjectContent.classList.remove("all-subject-layout");
      subjectContent.classList.remove("all-subject-unit-selected");
      // 管理タブでは学習状態フィルターを非表示にする
      const adminStatusFilter = document.querySelector(".category-status-filter") as HTMLElement | null;
      if (adminStatusFilter) adminStatusFilter.classList.add("hidden");
      // 管理タブでは日付ナビを非表示にする
      document.getElementById("overallDateNav")?.classList.add("hidden");
      // 管理タブでは「おすすめ単元」タイトルを非表示、「管理」タイトルを表示
      document.getElementById("allSubjectPanelTitle")?.classList.add("hidden");
      document.getElementById("categoryListTitle")?.classList.remove("hidden");
      return;
    }

    if (this.filter.subject === "progress") {
      subjectContent.classList.add("category-only");
      subjectContent.classList.remove("all-subject-layout");
      subjectContent.classList.remove("all-subject-unit-selected");
      // 進度タブでは学習状態フィルターを非表示にする
      const progressStatusFilter = document.querySelector(".category-status-filter") as HTMLElement | null;
      if (progressStatusFilter) progressStatusFilter.classList.add("hidden");
      // 進度タブでは日付ナビを非表示にする
      document.getElementById("overallDateNav")?.classList.add("hidden");
      // 進度タブでは「おすすめ単元」タイトルを非表示、「進度」タイトルを表示
      document.getElementById("allSubjectPanelTitle")?.classList.add("hidden");
      document.getElementById("categoryListTitle")?.classList.remove("hidden");
      // 進度タブではすべてのパネルタブとコンテンツを非表示にする
      ["panelTab-guide", "panelTab-quiz", "panelTab-history", "panelTab-questions"].forEach((id) => {
        document.getElementById(id)?.classList.add("hidden");
      });
      ["quizModePanel", "guideContent", "historyContent", "questionListContent"].forEach((id) => {
        document.getElementById(id)?.classList.add("hidden");
      });
      document.getElementById("overallSummaryPanel")?.classList.add("hidden");
      return;
    }

    const isAll = this.filter.subject === "all";
    const hasOverallUnit = this.overallUnitSelected !== null;
    const selLevel = this.getSelectionLevel();
    const noCategory = !isAll && selLevel === "none";
    const isCategoryLevel = !isAll && (selLevel === "topCategory" || selLevel === "parentCategory");

    // 総合タブ時は単元選択を左・活動パネルを右にするレイアウトを適用
    subjectContent.classList.toggle("all-subject-layout", isAll);
    // 総合タブで単元選択時は1:2比率のレイアウトを適用
    subjectContent.classList.toggle("all-subject-unit-selected", isAll && hasOverallUnit);
    // 何も選択されていない場合（総合タブを除く）は右パネルを非表示にしてカテゴリリストを全幅表示する
    // 総合タブは総合サマリパネルを右に表示するため category-only にしない
    subjectContent.classList.toggle("category-only", noCategory);

    // 総合タブでは単元未選択時のみパネルタブを非表示（単元選択時は教科画面と同じ表示）
    ["panelTab-guide", "panelTab-quiz", "panelTab-history", "panelTab-questions"].forEach((id) => {
      document.getElementById(id)?.classList.toggle("hidden", isAll && !hasOverallUnit);
    });

    // カテゴリ/サブカテゴリ選択時は確認・問題一覧・履歴タブを非表示
    ["panelTab-quiz", "panelTab-history", "panelTab-questions"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!isAll && isCategoryLevel) {
        el.classList.add("hidden");
      } else if (!isAll) {
        el.classList.remove("hidden");
      }
    });

    if (isAll) {
      if (hasOverallUnit) {
        // 総合タブから単元選択時: 教科の画面と同じレイアウトで表示
        document.getElementById("overallSummaryPanel")?.classList.add("hidden");
        this.showPanelTab(this.activePanelTab);
      } else {
        // 通常のコンテンツパネルを非表示にして総合サマリパネルを表示
        ["quizModePanel", "guideContent", "historyContent", "questionListContent"].forEach((id) => {
          document.getElementById(id)?.classList.add("hidden");
        });
        document.getElementById("overallSummaryPanel")?.classList.remove("hidden");
      }
    } else {
      // 総合サマリパネルを非表示にして通常のパネルを表示
      document.getElementById("overallSummaryPanel")?.classList.add("hidden");
      // 「総合」以外では現在アクティブなパネルを表示する（総合から戻った場合も含む）
      this.showPanelTab(this.activePanelTab);
    }

    // 「おすすめ単元」タイトルは総合タブ時のみ表示
    document.getElementById("allSubjectPanelTitle")?.classList.toggle("hidden", !isAll);
    // 「単元一覧」タイトルは教科別タブ時のみ表示
    document.getElementById("categoryListTitle")?.classList.toggle("hidden", isAll);
    // 学習状態フィルターボタンは総合タブ・管理タブでは非表示
    const statusFilterEl = document.querySelector(".category-status-filter") as HTMLElement | null;
    if (statusFilterEl) statusFilterEl.classList.toggle("hidden", isAll || this.filter.subject === "admin");
    // 日付ナビゲーションは総合タブかつ単元未選択時のみ表示
    document.getElementById("overallDateNav")?.classList.toggle("hidden", !isAll || hasOverallUnit);

    // 選択中の単元情報パネルを更新する
    this.updateSelectedUnitInfo();
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
    const effectiveMode: QuizMode = (mode === "random" && this.quizOrder === "straight") ? "practice" : mode;
    try {
      if (this.includeMastered) {
        this.currentSession = this.useCase.startSessionWithAllQuestions(effectiveMode, this.getEffectiveFilter(), this.questionCount);
      } else {
        this.currentSession = this.useCase.startSession(effectiveMode, this.getEffectiveFilter(), this.questionCount);
      }
    } catch (error) {
      if (error instanceof Error && error.message === ERROR_ALL_MASTERED) {
        const confirmed = await this.showConfirmDialog("すべての問題が学習済みです。全問題からランダムに出題しますか？");
        if (confirmed) {
          try {
            // 全問出題時は常にランダム順で開始する
            this.currentSession = this.useCase.startSessionWithAllQuestions("random", this.getEffectiveFilter(), this.questionCount);
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
    this.notesStates.clear();

    this.showScreen("quiz");
    document.getElementById("quizScreen")?.classList.toggle("practice-mode", effectiveMode === "practice");
    this.initializeNotesCanvas();
    this.notesCanvas?.clear();
    this.renderQuestion();
  }

  // ─── 問題表示 ──────────────────────────────────────────────────────────────

  private renderQuestion(): void {
    const session = this.currentSession;
    if (!session) return;

    const question = session.currentQuestion;
    const total = session.totalCount;
    const idx = session.currentIndex;

    this.setText("questionNumber", `問題 ${idx + 1} / ${total}`);
    const topicParts: string[] = [];
    if (question.topCategoryName) topicParts.push(question.topCategoryName);
    if (question.parentCategoryName) topicParts.push(question.parentCategoryName);
    topicParts.push(question.categoryName ?? question.category);
    this.setText("topicName", topicParts.join(" › "));

    const progress = ((idx + 1) / total) * 100;
    (document.getElementById("progressFill") as HTMLElement).style.width = `${progress}%`;

    this.setText("questionText", question.question);
    this.updateSpeakButton(question);
    this.renderChoices(question, session);

    // メモエリアをタッチペン入力モード用に更新
    const isAnswered = session.getAnswer(session.currentIndex) !== undefined;
    this.updateNotesAreaForQuestion(question, isAnswered);

    // 既に回答済みの場合はフィードバックを表示、未回答の場合は非表示
    const userAnswer = session.getAnswer(session.currentIndex);
    if (userAnswer !== undefined) {
      const userAnswerText = question.questionType === "text-input"
        ? session.getTextAnswer(session.currentIndex)
        : undefined;
      this.showAnswerFeedback(question, userAnswer, userAnswerText);
    } else {
      this.hideAnswerFeedback();
    }

    this.updateNavigationButtons(session);
  }

  private renderChoices(question: Question, session: QuizSession): void {
    if (question.questionType === "text-input") {
      this.renderTextInput(question, session);
    } else {
      this.renderMultipleChoice(question, session);
    }
  }

  /**
   * 読み上げボタンの表示を更新する。英語の問題かつ Web Speech API が利用可能な場合のみ
   * ボタンを表示し、クリック時にアメリカ英語（en-US）で読み上げる。
   */
  private updateSpeakButton(question: Question): void {
    const btn = document.getElementById("speakBtn");
    if (!btn) return;

    const isSpeechAvailable = typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";

    if (question.subject === "english" && isSpeechAvailable) {
      btn.classList.remove("hidden");
      btn.onclick = () => {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(question.question);
          utterance.lang = "en-US";
          window.speechSynthesis.speak(utterance);
        } catch {
          // 読み上げがサポートされていない環境ではスキップする
        }
      };
    } else {
      btn.classList.add("hidden");
      btn.onclick = null;
    }
  }

  private renderMultipleChoice(question: Question, session: QuizSession): void {
    const container = document.getElementById("choicesContainer");
    if (!container) return;
    container.innerHTML = "";

    const existingAnswer = session.getAnswer(session.currentIndex);

    question.choices.forEach((choice, index) => {
      const label = document.createElement("label");
      label.className = "choice-label";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = String(index);
      input.checked = existingAnswer === index;
      input.disabled = existingAnswer !== undefined;
      input.addEventListener("change", () => {
        session.selectAnswer(session.currentIndex, index);
        this.showAnswerFeedback(question, index);
        this.updateNavigationButtons(session);
        // 回答後は全選択肢を無効化して変更不可に
        container.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
          r.disabled = true;
        });
      });

      const span = document.createElement("span");
      span.className = "choice-text";
      span.textContent = choice;

      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  private renderTextInput(question: Question, session: QuizSession): void {
    const container = document.getElementById("choicesContainer");
    if (!container) return;
    container.innerHTML = "";

    const existingAnswerIndex = session.getAnswer(session.currentIndex);
    const isAnswered = existingAnswerIndex !== undefined;

    const wrapper = document.createElement("div");
    wrapper.className = "text-answer-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "text-answer-input";
    input.placeholder = "答えを入力してください";
    input.setAttribute("aria-label", "解答を入力");
    input.disabled = isAnswered;

    if (isAnswered) {
      // 既回答の場合、入力テキストを復元して表示
      const storedText = session.getTextAnswer(session.currentIndex);
      if (storedText !== undefined) {
        input.value = storedText;
      } else {
        // 後方互換: 正解インデックスと一致する場合は正解テキストを表示
        if (existingAnswerIndex === question.correct) {
          input.value = question.choices[question.correct] ?? "";
        }
      }
    }

    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "text-answer-submit-btn";
    submitBtn.textContent = "確認する";
    submitBtn.disabled = isAnswered;

    const handleSubmit = (): void => {
      const text = input.value.trim();
      if (!text) return;
      session.selectTextAnswer(session.currentIndex, text);
      input.disabled = true;
      submitBtn.disabled = true;
      const answerIndex = session.getAnswer(session.currentIndex)!;
      this.showAnswerFeedback(question, answerIndex, text);
      this.updateNavigationButtons(session);
      // 確認後は確定ボタンも非表示にする（キーボード入力で回答済みになったため）
      this.updateNotesAreaForQuestion(question, true);
    };

    submitBtn.addEventListener("click", handleSubmit);
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      handleSubmit();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);

    if (!isAnswered) {
      input.focus();
    }
  }

  /**
   * メモエリアをtextinput問題のKanjiCanvas入力用に更新する。
   * - text-input問題かつ未回答かつKanjiCanvas利用可能の場合: KanjiCanvas入力エリアを表示、ノートキャンバスを非表示
   * - それ以外: KanjiCanvas入力エリアを非表示、ノートキャンバスを表示
   * 問題遷移のたびに呼ばれる。
   */
  private updateNotesAreaForQuestion(question: Question | null, isAnswered: boolean): void {
    const notesTitle = document.getElementById("notesTitle");
    const kanjiInputArea = document.getElementById("kanjiInputArea");
    const notesCanvas = document.getElementById("notesCanvas");
    const notesControls = document.querySelector<HTMLElement>(".notes-controls");

    const isTextInput = question?.questionType === "text-input";
    // KanjiCanvas が読み込まれていない場合はフォールバックとして通常ノートキャンバスを表示する
    const showKanji = isTextInput && !isAnswered && this.isKanjiCanvasAvailable();

    if (notesTitle) {
      notesTitle.textContent = showKanji
        ? "✏️ 1文字ずつ書いて漢字を入力できます"
        : "タッチペンで書けます";
    }
    if (kanjiInputArea) {
      kanjiInputArea.classList.toggle("hidden", !showKanji);
    }
    // KanjiCanvas表示時はトグルボタンを展開状態にリセットする
    if (showKanji) {
      const kanjiInputBody = document.getElementById("kanjiInputBody");
      const kanjiToggleBtn = document.getElementById("kanjiToggleBtn");
      if (kanjiInputBody) kanjiInputBody.classList.remove("hidden");
      if (kanjiToggleBtn) this.applyKanjiToggleBtnState(kanjiToggleBtn, true);
    }
    // KanjiCanvas使用時はノートキャンバスと通常コントロールを非表示
    if (notesCanvas) {
      notesCanvas.classList.toggle("hidden", showKanji);
    }
    if (notesControls) {
      notesControls.classList.toggle("hidden", showKanji);
    }

    if (showKanji) {
      this.initializeKanjiCanvas();
      this.kanjiErase();
      // 初期化時はストロークがないため候補は表示しない
    }
  }

  /**
   * KanjiCanvas グローバルが利用可能かどうかを確認する。
   * kanji-canvas.min.js の読み込みに失敗した場合（ネットワークエラー・ブロック等）に false を返す。
   */
  private isKanjiCanvasAvailable(): boolean {
    return typeof (globalThis as unknown as { KanjiCanvas?: unknown }).KanjiCanvas !== "undefined";
  }

  /**
   * KanjiCanvas 折りたたみボタンの表示状態を更新する。
   * @param btn ボタン要素
   * @param expanded 展開状態のとき true
   */
  private applyKanjiToggleBtnState(btn: HTMLElement, expanded: boolean): void {
    btn.setAttribute("aria-expanded", String(expanded));
    btn.textContent = expanded ? "▲" : "▼";
    const label = expanded ? "入力エリアを折りたたむ" : "入力エリアを展開する";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  /**
   * スクリプトファイルを動的にロードする汎用ヘルパー。
   */
  private loadScript(src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error(`${src} の読み込みに失敗しました: ${e instanceof Event ? e.type : e}`));
      document.body.appendChild(script);
    });
  }

  /**
   * ref-patterns.js（漢字パターンデータ）と hiragana-patterns.js（ひらがなパターンデータ）を
   * 動的に遅延ロードする。重複ロードを防ぐため Promise をキャッシュする。
   * 読み込み失敗時はキャッシュをクリアし、次回呼び出しで再試行できるようにする。
   */
  private loadRefPatterns(): Promise<void> {
    if (this.refPatternsLoadPromise) return this.refPatternsLoadPromise;
    this.refPatternsLoadPromise = this.loadScript("./vendor/ref-patterns.js")
      .then(() => this.loadScript("./vendor/hiragana-patterns.js"))
      .catch((error) => {
        this.refPatternsLoadPromise = null;
        throw error;
      });
    return this.refPatternsLoadPromise;
  }

  /**
   * KanjiCanvasを初期化する。初回呼び出し時のみ初期化し、ストローク完了後に候補を自動更新する。
   * KanjiCanvas グローバルが存在しない場合は警告を出して何もしない。
   */
  private initializeKanjiCanvas(): void {
    if (!this.isKanjiCanvasAvailable()) {
      console.warn("KanjiCanvas が読み込まれていません。手書き入力機能は無効です。");
      return;
    }
    if (this.kanjiCanvasInitialized) return;
    // CSS zoom によるキャンバス座標ズレを防ぐため、canvasの属性サイズを表示サイズに合わせる
    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement | null;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }
    }
    KanjiCanvas.init("kanjiCanvas");
    // 書き順番号と線の色変化を無効化する（全ストロークをデフォルト色 #333 で統一）
    KanjiCanvas.strokeColors = [];
    if (canvas) {
      canvas.addEventListener("mouseup", () => this.updateKanjiCandidates());
      canvas.addEventListener("touchend", () => this.updateKanjiCandidates());
    }
    this.kanjiCanvasInitialized = true;
    // ref-patterns.js（漢字）と hiragana-patterns.js（ひらがな）を遅延ロードする。
    // ロード完了前のストロークでは候補が表示されないが、ロード後の次ストロークから表示される。
    void this.loadRefPatterns().catch((e) => {
      console.warn("パターンデータの読み込みに失敗しました:", e);
    });
  }

  /**
   * 文字列がひらがなのみで構成されているかどうかを判定する。
   */
  private isHiraganaOnly(str: string): boolean {
    return /^[\u3041-\u309F]+$/.test(str);
  }

  /**
   * 文字列がラテン文字（ASCII 0x20–0x7E の印字可能文字）のみで構成されているかどうかを判定する。
   * @param str 判定対象の文字列
   * @returns ラテン文字（ASCII 0x20–0x7E）のみで構成されている場合は true
   */
  private isLatinOnly(str: string): boolean {
    return /^[\x20-\x7E]+$/.test(str);
  }

  /**
   * KanjiCanvasで描かれたストロークを認識して候補ボタンを更新する。
   * ひらがな問題（正解がひらがなのみ）の場合はひらがな以外の候補を除外する。
   * 英語問題（正解がラテン文字のみ）の場合はラテン文字以外の候補を除外する。
   * ストロークが描かれていない場合は候補を表示しない。
   */
  private updateKanjiCandidates(): void {
    const candidateList = document.getElementById("kanjiCandidateList");
    if (!candidateList || !this.isKanjiCanvasAvailable()) return;

    const result = KanjiCanvas.recognize("kanjiCanvas");
    // ストロークがない場合（認識結果が空）は候補を表示しない
    if (!result.trim()) {
      candidateList.innerHTML = "";
      return;
    }
    let candidates = result.trim().split(/\s+/).filter(Boolean);

    const question = this.currentSession?.currentQuestion;
    const correctAnswer = question?.choices[question.correct];
    if (correctAnswer !== undefined && this.isHiraganaOnly(correctAnswer)) {
      candidates = candidates.filter((char) => this.isHiraganaOnly(char));
    } else if (correctAnswer !== undefined && this.isLatinOnly(correctAnswer)) {
      candidates = candidates.filter((char) => this.isLatinOnly(char));
    }

    candidates = candidates.slice(0, 5);

    candidateList.innerHTML = "";
    candidates.forEach((char) => {
      const btn = document.createElement("button");
      btn.className = "kanji-candidate-btn";
      btn.type = "button";
      btn.textContent = char;
      btn.addEventListener("click", () => this.selectKanjiCandidate(char));
      candidateList.appendChild(btn);
    });
  }

  /**
   * 候補漢字を選択して解答入力欄に追加し、KanjiCanvasをクリアする。
   */
  private selectKanjiCandidate(char: string): void {
    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    if (textInput) {
      textInput.value += char;
      textInput.focus();
    }
    this.kanjiErase();
  }

  /**
   * KanjiCanvasの最後の1画を取り消す。
   */
  private kanjiDeleteLast(): void {
    if (!this.kanjiCanvasInitialized || !this.isKanjiCanvasAvailable()) return;
    KanjiCanvas.deleteLast("kanjiCanvas");
    this.updateKanjiCandidates();
  }

  /**
   * KanjiCanvasの全ストロークを消去する。
   */
  private kanjiErase(): void {
    if (this.kanjiCanvasInitialized && this.isKanjiCanvasAvailable()) {
      KanjiCanvas.erase("kanjiCanvas");
    }
    const candidateList = document.getElementById("kanjiCandidateList");
    if (candidateList) {
      candidateList.innerHTML = "";
    }
  }

  private navigate(direction: 1 | -1): void {
    const session = this.currentSession;
    if (!session) return;

    // 現在のメモ状態を保存
    this.saveNotesState(session.currentIndex);

    session.navigate(direction);
    this.renderQuestion();

    // 新しい問題のメモ状態を復元
    this.restoreNotesState(session.currentIndex);
  }

  private showAnswerFeedback(question: Question, userAnswerIndex: number, userAnswerText?: string): void {
    const feedbackDiv = document.getElementById("answerFeedback");
    if (!feedbackDiv) return;

    const isCorrect = question.correct === userAnswerIndex;
    const resultDiv = document.getElementById("feedbackResult");
    const explanationDiv = document.getElementById("feedbackExplanation");

    if (resultDiv) {
      if (isCorrect) {
        resultDiv.textContent = "✅ 正解です！";
      } else if (question.questionType === "text-input") {
        const correctAnswer = question.choices[question.correct] ?? "";
        const typed = userAnswerText ?? "";
        resultDiv.textContent = typed
          ? `❌ 不正解です。あなたの解答「${typed}」→ 正解は「${correctAnswer}」`
          : `❌ 不正解です。正解は「${correctAnswer}」`;
      } else {
        const correctAnswer = question.choices[question.correct];
        resultDiv.textContent = `❌ 不正解です。正解は「${correctAnswer}」です。`;
      }
    }

    if (explanationDiv) {
      explanationDiv.textContent = question.explanation;
    }

    feedbackDiv.classList.remove("hidden");
    feedbackDiv.classList.toggle("correct", isCorrect);
    feedbackDiv.classList.toggle("incorrect", !isCorrect);
  }

  private hideAnswerFeedback(): void {
    const feedbackDiv = document.getElementById("answerFeedback");
    if (feedbackDiv) {
      feedbackDiv.classList.add("hidden");
    }
  }

  private updateNavigationButtons(session: QuizSession): void {
    const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
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

  // ─── 採点 ──────────────────────────────────────────────────────────────────

  private submitQuiz(): void {
    const session = this.currentSession;
    if (!session) return;
    const results = this.useCase.submitSession(session);
    this.useCase.addHistoryRecord(results, this.filter, this.currentMode);
    this.showResultScreen(results);
  }

  // ─── 結果画面 ──────────────────────────────────────────────────────────────

  private showResultScreen(results: AnswerResult[]): void {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correctCount / total) * 100);

    // 単元名・カテゴリ・教科を表示する（クイズ結果画面の上部）
    const resultUnitName = document.getElementById("resultUnitName");
    if (resultUnitName) {
      const firstResult = results[0];
      if (firstResult) {
        const q = firstResult.question;
        const parts: string[] = [];
        if (q.subjectName) parts.push(q.subjectName);
        if (q.topCategoryName) parts.push(q.topCategoryName);
        if (q.parentCategoryName) parts.push(q.parentCategoryName);
        if (q.categoryName) parts.push(q.categoryName);
        if (parts.length > 0) {
          resultUnitName.textContent = parts.join(" › ");
          resultUnitName.classList.remove("hidden");
        } else {
          resultUnitName.textContent = "";
          resultUnitName.classList.add("hidden");
        }
      } else {
        resultUnitName.textContent = "";
        resultUnitName.classList.add("hidden");
      }
    }

    // 正答数に応じた前向きなメッセージ
    const resultMessage = document.getElementById("resultMessage");
    if (resultMessage) {
      let message = "";
      if (percentage === 100) message = "🌟 満点！すごい！";
      else if (percentage >= 80) message = "🎉 よくできました！";
      else if (percentage >= 60) message = "😊 もう少し！次はきっとできる！";
      else message = "💪 がんばれ！次は必ず正解できます！";
      resultMessage.textContent = message;
    }

    const scoreDisplay = document.getElementById("scoreDisplay");
    if (scoreDisplay) {
      const isPerfect = correctCount === total;
      const circleClass = isPerfect ? "perfect" : percentage >= 70 ? "pass" : "fail";
      scoreDisplay.innerHTML = `
        <div class="score-circle ${circleClass}">
          ${isPerfect ? '<div class="score-perfect-icon">✅</div>' : ""}
          <div class="score-percentage">${percentage}%</div>
          <div class="score-text">${correctCount} / ${total} 正解</div>
        </div>
      `;
    }

    const resultDetails = document.getElementById("resultDetails");
    if (resultDetails) {
      resultDetails.innerHTML = "<h3>解答一覧</h3>";
      results.forEach((r) => resultDetails.appendChild(this.buildResultItem(r)));
    }

    this.showScreen("result");

    // 回答完了後にスクロール位置をトップに戻す
    const resultScreen = document.getElementById("resultScreen");
    if (resultScreen) resultScreen.scrollTop = 0;

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
    const { question, userAnswerIndex, isCorrect } = r;
    const div = document.createElement("div");
    div.className = `result-item ${isCorrect ? "correct" : "incorrect"}`;

    const header = document.createElement("div");
    header.className = "result-header";

    const icon = document.createElement("span");
    icon.className = "result-icon";
    icon.textContent = isCorrect ? "✓" : "✗";

    const questionText = document.createElement("span");
    questionText.className = "result-question";
    questionText.textContent = question.question;

    // あなたの解答を問題と同じ行の右側に表示する
    const userAnswerInline = document.createElement("span");
    userAnswerInline.className = "result-user-answer";
    const userAnswerLabel = document.createTextNode("あなた: ");
    const userAnswerValue = document.createElement("strong");
    if (question.questionType === "text-input") {
      userAnswerValue.textContent = r.userAnswerText ?? "（未入力）";
    } else {
      userAnswerValue.textContent = question.choices[userAnswerIndex] ?? "未回答";
    }
    userAnswerInline.appendChild(userAnswerLabel);
    userAnswerInline.appendChild(userAnswerValue);

    header.appendChild(icon);
    header.appendChild(questionText);
    header.appendChild(userAnswerInline);

    const answer = document.createElement("div");
    answer.className = "result-answer";

    const correctDiv = document.createElement("div");
    correctDiv.appendChild(document.createTextNode("正解: "));
    const correctValue = document.createElement("strong");
    correctValue.textContent = question.choices[question.correct] ?? "";
    correctDiv.appendChild(correctValue);
    answer.appendChild(correctDiv);

    const explanation = document.createElement("div");
    explanation.className = "explanation";
    explanation.textContent = question.explanation;
    answer.appendChild(explanation);

    div.appendChild(header);
    div.appendChild(answer);
    return div;
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
    return new Promise((resolve) => {
      const overlay = document.getElementById("confirmDialog");
      const msgEl = document.getElementById("confirmDialogMessage");
      const okBtn = document.getElementById("confirmDialogOk") as HTMLButtonElement | null;
      const cancelBtn = document.getElementById("confirmDialogCancel") as HTMLButtonElement | null;
      if (!overlay || !msgEl || !okBtn || !cancelBtn) {
        if (alertOnly) {
          alert(message);
          resolve(true);
        } else {
          resolve(window.confirm(message));
        }
        return;
      }
      msgEl.textContent = message;
      overlay.classList.remove("hidden");
      if (alertOnly) {
        cancelBtn.classList.add("hidden");
      } else {
        cancelBtn.classList.remove("hidden");
      }

      const previousFocus = document.activeElement as HTMLElement | null;

      const close = (result: boolean): void => {
        overlay.classList.add("hidden");
        cancelBtn.classList.remove("hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        overlay.removeEventListener("keydown", onKeydown);
        previousFocus?.focus();
        resolve(result);
      };
      const onOk = (): void => close(true);
      const onCancel = (): void => close(false);
      const onKeydown = (e: KeyboardEvent): void => {
        if (e.key === "Escape") {
          e.preventDefault();
          close(alertOnly ? true : false);
        }
        // フォーカストラップ: Tabキーをダイアログ内のボタンに限定する
        if (e.key === "Tab") {
          e.preventDefault();
          if (alertOnly) {
            // アラートモードではOKボタンのみ。Tabキーを押してもOKボタンにフォーカスを維持する
            okBtn.focus();
          } else if (document.activeElement === okBtn) {
            cancelBtn.focus();
          } else {
            okBtn.focus();
          }
        }
      };
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      overlay.addEventListener("keydown", onKeydown);

      okBtn.focus();
    });
  }

  /**
   * スタート画面へ遷移する。クイズ進行中は確認ダイアログを表示する。
   */
  private async navigateToStart(): Promise<void> {
    if (this.isQuizInProgress()) {
      const confirmed = await this.showConfirmDialog("問題が途中です。単元選択に戻りますか？（進行状況は保存されません）");
      if (!confirmed) return;
    }
    this.showScreen("start");
  }

  private showScreen(screenName: "start" | "quiz" | "result"): void {
    // ブラウザ履歴を管理する:
    // - クイズ/結果画面への遷移時は pushState で新しいエントリを追加（戻るボタンで戻れる）
    // - スタート画面への遷移時は replaceState で現在のエントリを置き換え（スタック上に中間状態を残さない）
    if (screenName === "quiz" || screenName === "result") {
      window.history.pushState({ screen: screenName }, document.title);
    } else {
      window.history.replaceState({ screen: "start" }, document.title);
    }
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    const idMap = { start: "startScreen", quiz: "quizScreen", result: "resultScreen" };
    document.getElementById(idMap[screenName])?.classList.remove("hidden");

    if (screenName === "start") {
      this.updateSubjectStats();
      this.selectFirstUnlearnedCategory();
      const screenRecords = this.useCase.getHistory();
      this.autoSelectPanelTab(screenRecords);
      this.updateStartScreen(screenRecords);
    }
  }

  /**
   * 学習済みではない最初のカテゴリを自動選択する。
   * スタート画面の表示時に呼び出されることで、次に学習すべき単元を案内する。
   * URLパラメータでカテゴリが明示指定されている場合はスキップする。
   */
  private selectFirstUnlearnedCategory(): void {
    // URLパラメータまたはフラグメントで特定カテゴリが指定されている場合はディープリンク挙動を維持する
    if (this.getURLParams().has("category")) return;

    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const firstUnlearned = categoryList.querySelector<HTMLElement>(".category-item:not(.learned)");
    if (!firstUnlearned) return;

    const subject = firstUnlearned.dataset.subject;
    const category = firstUnlearned.dataset.category;
    const parentCategory = firstUnlearned.dataset.parentCategory;

    if (subject && category) {
      this.filter.subject = subject;
      this.filter.category = category;
      this.filter.parentCategory = parentCategory;
      this.selectedTopCategoryId = null;
      this.updateCategoryListActive();
      // updateStartScreen() は呼び出し元が担う（二重実行を避けるため）
    }
  }

  // ─── ユーティリティ ────────────────────────────────────────────────────────

  private updateUserNameDisplay(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = `👤 ${this.userName}`;
    }
  }

  /**
   * ヘッダーに今日の日付を表示する。
   */
  private updateHeaderTodayDate(): void {
    const el = document.getElementById("headerTodayDate");
    if (!el) return;
    const now = new Date();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}（${weekdays[now.getDay()]}）`;
    el.textContent = dateStr;
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private on(id: string, event: string, handler: () => void): void {
    document.getElementById(id)?.addEventListener(event, handler);
  }

  // ─── メモエリア管理 ────────────────────────────────────────────────────────

  private initializeNotesCanvas(): void {
    if (!this.notesCanvas) {
      this.notesCanvas = new NotesCanvas();
      this.notesCanvas.initialize("notesCanvas");

      // デフォルト設定を適用
      const penSizeSelect = document.getElementById("penSizeSelect") as HTMLSelectElement | null;
      const penColorSelect = document.getElementById("penColorSelect") as HTMLSelectElement | null;

      if (penSizeSelect) {
        this.notesCanvas.setPenSize(parseInt(penSizeSelect.value));
      }
      if (penColorSelect) {
        this.notesCanvas.setPenColor(penColorSelect.value);
      }
    }
  }

  private saveNotesState(questionIndex: number): void {
    const state = this.notesCanvas?.save();
    if (state) {
      this.notesStates.set(questionIndex, state);
    }
  }

  private restoreNotesState(questionIndex: number): void {
    const state = this.notesStates.get(questionIndex);
    if (state) {
      this.notesCanvas?.restore(state);
    } else {
      this.notesCanvas?.clear();
    }
  }

  private clearNotes(): void {
    if (this.currentSession) {
      // 現在の問題のメモ状態を削除
      this.notesStates.delete(this.currentSession.currentIndex);
    }
    this.notesCanvas?.clear();
  }

  private toggleEraserMode(): void {
    if (!this.notesCanvas) return;
    const isEraser = !this.notesCanvas.isEraserMode;
    this.notesCanvas.setEraserMode(isEraser);
    const eraserBtn = document.getElementById("eraserBtn");
    if (eraserBtn) {
      eraserBtn.classList.toggle("eraser-active", isEraser);
      eraserBtn.title = isEraser ? "ペンに戻す" : "消しゴム";
    }
  }
}

// アプリケーション起動
document.addEventListener("DOMContentLoaded", () => {
  new QuizApp(new IndexedDBProgressRepository());
});
