/**
 * QuizApp — プレゼンテーション層の UI コントローラー。
 * ビジネスロジックはすべて QuizUseCase に委譲する。
 */

import { QuizUseCase } from "../application/quizUseCase";
import type { QuizMode, QuizFilter, AnswerResult, QuizRecord } from "../application/quizUseCase";
import { QuizSession } from "../domain/quizSession";
import type { Question } from "../domain/question";
import { RemoteQuestionRepository } from "../infrastructure/remoteQuestionRepository";
import { LocalStorageProgressRepository } from "../infrastructure/localStorageProgressRepository";
import { NotesCanvas } from "./notesCanvas";
import type { DrawingState } from "./notesCanvas";

/** 教科一覧（タブ表示用） */
const SUBJECTS = [
  { id: "english", name: "英語", icon: "📚" },
  { id: "math", name: "数学", icon: "🔢" },
] as const;

export class QuizApp {
  private readonly useCase: QuizUseCase;
  private currentSession: QuizSession | null = null;
  private currentMode: QuizMode = "random";
  private filter: QuizFilter = { subject: "english", category: "all", parentCategory: undefined };
  private userName: string = "ゲスト";
  private questionCount: number = 20;
  private notesCanvas: NotesCanvas | null = null;
  private notesStates: Map<number, DrawingState> = new Map();
  private activeTab: "subject" | "history" = "subject";

  constructor() {
    this.useCase = new QuizUseCase(
      new RemoteQuestionRepository("questions"),
      new LocalStorageProgressRepository()
    );
    this.init();
  }

  // ─── 初期化 ────────────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    try {
      await this.useCase.initialize();
    } catch (error) {
      console.error("問題の読み込みに失敗しました:", error);
      alert("問題の読み込みに失敗しました。ページを再読み込みしてください。");
    }
    this.loadUserName();
    this.loadFilterFromURL();
    this.setupEventListeners();
    this.buildSubjectTabs();
    this.showStartTabContent(this.activeTab);
    this.renderHistoryList(this.activeTab === "subject" ? this.filter.subject : undefined);
    this.updateStartScreen();
    this.updateUserNameDisplay("headerUserName");
  }

  /**
   * URL パラメータからフィルターを読み込む
   * 例: ?subject=english&category=tenses-regular-present
   */
  private loadFilterFromURL(): void {
    const params = new URLSearchParams(window.location.search);
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
    const progressRepo = new LocalStorageProgressRepository();
    const savedName = progressRepo.loadUserName();
    if (savedName) {
      this.userName = savedName;
    }
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
    const progressRepo = new LocalStorageProgressRepository();
    progressRepo.saveUserName(this.userName);
    this.updateUserNameDisplay("headerUserName");
    this.closeUserNameEdit();
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

      const statsSpan = document.createElement("span");
      statsSpan.className = "tab-stats";

      tab.appendChild(labelSpan);
      tab.appendChild(statsSpan);

      tab.addEventListener("click", () => {
        this.filter.subject = subject.id;
        this.filter.category = "all";
        this.filter.parentCategory = undefined;

        tabsContainer.querySelectorAll(".subject-tab").forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        this.activeTab = "subject";
        this.showStartTabContent("subject");
        this.renderCategoryList();
        this.renderHistoryList(subject.id);
        this.updateStartScreen();
      });

      tabsContainer.appendChild(tab);
    });

    // 記録タブを追加
    const historyTab = document.createElement("button");
    historyTab.className = "subject-tab history-tab";
    historyTab.dataset.tab = "history";
    historyTab.setAttribute("role", "tab");
    historyTab.setAttribute("type", "button");
    historyTab.setAttribute("aria-selected", "false");
    historyTab.textContent = "📊 記録";
    historyTab.addEventListener("click", () => {
      tabsContainer.querySelectorAll(".subject-tab").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      historyTab.classList.add("active");
      historyTab.setAttribute("aria-selected", "true");
      this.activeTab = "history";
      this.showStartTabContent("history");
      this.renderHistoryList();
    });
    tabsContainer.appendChild(historyTab);

    // フィルターに基づいてアクティブタブを設定
    this.selectTabByFilter();
    // カテゴリリストを描画
    this.renderCategoryList();
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
      // 「すべて」タブではカテゴリを細分化しないため、リストは空のまま
      categoryList.innerHTML = "";
      return;
    }

    // 親カテゴリとその配下のカテゴリを収集
    const parentCategories = this.useCase.getParentCategoriesForSubject(subject);
    const categoriesForParent: Record<string, Set<string>> = {};
    for (const [parentCatId] of Object.entries(parentCategories)) {
      const cats = this.useCase.getCategoriesForParent(subject, parentCatId);
      categoriesForParent[parentCatId] = new Set(Object.keys(cats));
    }

    // 親カテゴリがある場合はグループヘッダー付きで表示
    for (const [parentCatId, parentCatName] of Object.entries(parentCategories)) {
      const groupHeader = document.createElement("div");
      groupHeader.className = "category-group-header";
      groupHeader.textContent = parentCatName;
      categoryList.appendChild(groupHeader);

      const cats = this.useCase.getCategoriesForParent(subject, parentCatId);
      for (const [catId, catName] of Object.entries(cats)) {
        const catItem = this.createCategoryItem(subject, catId, catName, parentCatId);
        categoryList.appendChild(catItem);
      }
    }

    // 親カテゴリに属さないスタンドアロンカテゴリ
    const allCategories = this.useCase.getCategoriesForSubject(subject);
    for (const [catId, catName] of Object.entries(allCategories)) {
      const belongsToParent = Object.values(categoriesForParent).some((catSet) => catSet.has(catId));
      if (!belongsToParent) {
        const catItem = this.createCategoryItem(subject, catId, catName);
        categoryList.appendChild(catItem);
      }
    }

    // アクティブ状態を更新
    this.updateCategoryListActive();
  }

  private createCategoryItem(
    subject: string,
    categoryId: string,
    categoryName: string,
    parentCatId?: string
  ): HTMLElement {
    const item = document.createElement("div");
    item.className = "category-item";
    item.dataset.subject = subject;
    item.dataset.category = categoryId;
    if (parentCatId) {
      item.dataset.parentCategory = parentCatId;
    }
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");

    const statusSpan = document.createElement("span");
    statusSpan.className = "category-status";
    statusSpan.setAttribute("aria-hidden", "true");
    statusSpan.textContent = "⬜";

    const nameSpan = document.createElement("span");
    nameSpan.className = "category-name";
    nameSpan.textContent = categoryName;

    const statsSpan = document.createElement("span");
    statsSpan.className = "category-stats";

    item.appendChild(statusSpan);
    item.appendChild(nameSpan);
    item.appendChild(statsSpan);

    const handleActivate = (e: Event): void => {
      e.stopPropagation();
      this.filter.subject = subject;
      this.filter.category = categoryId;
      this.filter.parentCategory = parentCatId;
      this.updateCategoryListActive();
      this.updateStartScreen();
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
   * 現在のフィルターに基づいてカテゴリアイテムのアクティブ状態を更新する
   */
  private updateCategoryListActive(): void {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    categoryList.querySelectorAll(".category-item").forEach((item) => {
      const el = item as HTMLElement;
      const isActive =
        el.dataset.subject === this.filter.subject &&
        el.dataset.category === this.filter.category;
      el.classList.toggle("active", isActive);
    });
  }

  /**
   * スタート画面のタブコンテンツ表示を切り替える
   */
  private showStartTabContent(tab: "subject" | "history"): void {
    const subjectContent = document.getElementById("subjectContent");
    const historyContent = document.getElementById("historyContent");
    if (tab === "subject") {
      subjectContent?.classList.remove("hidden");
      historyContent?.classList.remove("hidden");
    } else {
      subjectContent?.classList.add("hidden");
      historyContent?.classList.remove("hidden");
    }
  }

  // ─── 回答記録 ──────────────────────────────────────────────────────────────

  /**
   * 回答記録一覧を描画する
   * subject が指定された場合はその教科の記録のみ表示する
   */
  private renderHistoryList(subject?: string): void {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    const allRecords = this.useCase.getHistory();
    const records = subject ? allRecords.filter((r) => r.subject === subject) : allRecords;
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

  private buildHistoryItem(record: QuizRecord): HTMLElement {
    const item = document.createElement("div");
    item.className = "history-item";

    // ヘッダー行（日時・教科・スコア）
    const header = document.createElement("div");
    header.className = "history-item-header";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", "false");

    const date = new Date(record.date);
    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    const pct = Math.round((record.correctCount / record.totalCount) * 100);

    const metaDiv = document.createElement("div");
    metaDiv.className = "history-meta";

    const dateSpan = document.createElement("span");
    dateSpan.className = "history-date";
    dateSpan.textContent = dateStr;

    const subjectSpan = document.createElement("span");
    subjectSpan.className = "history-subject";
    subjectSpan.textContent = record.categoryName;

    const modeSpan = document.createElement("span");
    modeSpan.className = "history-mode";
    modeSpan.textContent = record.mode === "retry" ? "復習" : record.mode === "practice" ? "練習" : "ランダム";

    metaDiv.appendChild(dateSpan);
    metaDiv.appendChild(subjectSpan);
    metaDiv.appendChild(modeSpan);

    const scoreSpan = document.createElement("span");
    scoreSpan.className = `history-score ${pct >= 70 ? "pass" : "fail"}`;
    scoreSpan.textContent = `${record.correctCount}/${record.totalCount} (${pct}%)`;

    const toggleSpan = document.createElement("span");
    toggleSpan.className = "history-toggle";
    toggleSpan.textContent = "▶";

    header.appendChild(metaDiv);
    header.appendChild(scoreSpan);
    header.appendChild(toggleSpan);

    // 詳細（折りたたみ）
    const detail = document.createElement("div");
    detail.className = "history-detail hidden";

    record.entries.forEach((entry) => {
      const entryDiv = document.createElement("div");
      entryDiv.className = `history-entry ${entry.isCorrect ? "correct" : "incorrect"}`;

      const iconSpan = document.createElement("span");
      iconSpan.className = "history-entry-icon";
      iconSpan.textContent = entry.isCorrect ? "✓" : "✗";

      const contentDiv = document.createElement("div");
      contentDiv.className = "history-entry-content";

      const questionP = document.createElement("p");
      questionP.className = "history-entry-question";
      questionP.textContent = entry.questionText;

      const answerP = document.createElement("p");
      answerP.className = "history-entry-answer";
      const userAnswer = entry.choices[entry.userAnswerIndex] ?? "未回答";
      const correctAnswer = entry.choices[entry.correctAnswerIndex] ?? "";
      if (entry.isCorrect) {
        answerP.textContent = `正解: ${correctAnswer}`;
      } else {
        answerP.textContent = `あなたの回答: ${userAnswer} → 正解: ${correctAnswer}`;
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

    item.appendChild(header);
    item.appendChild(detail);
    return item;
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.on("startRandomBtn", "click", () => this.startQuiz("random"));
    this.on("startPracticeBtn", "click", () => this.startQuiz("practice"));
    this.on("startRetryBtn", "click", () => this.startQuiz("retry"));
    this.on("prevBtn", "click", () => this.navigate(-1));
    this.on("nextBtn", "click", () => this.navigate(1));
    this.on("submitBtn", "click", () => this.submitQuiz());
    this.on("retryAllBtn", "click", () => this.startQuiz("random"));
    this.on("retryWrongBtn", "click", () => this.startQuiz("retry"));
    this.on("backToStartBtn", "click", () => this.showScreen("start"));

    // タイトルクリックでスタート画面へ
    const titleBtn = document.getElementById("titleBtn");
    if (titleBtn) {
      titleBtn.addEventListener("click", () => this.navigateToStart());
      titleBtn.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.navigateToStart();
        }
      });
    }

    // ヘッダーのユーザー名ボタン：クリックで編集モードを開く
    const headerUserName = document.getElementById("headerUserName");
    headerUserName?.addEventListener("click", () => this.openUserNameEdit());
    headerUserName?.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.openUserNameEdit();
      }
    });

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
        }
      });
    });

    // メモエリアのコントロール
    this.on("clearNotesBtn", "click", () => this.clearNotes());
    this.on("eraserBtn", "click", () => this.toggleEraserMode());

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
  }

  // ─── スタート画面 ──────────────────────────────────────────────────────────

  private updateStartScreen(): void {
    this.updateSubjectStats();
    const statsInfo = document.getElementById("statsInfo");
    const retryBtn = document.getElementById("startRetryBtn") as HTMLButtonElement | null;
    if (!statsInfo || !retryBtn) return;

    const filteredCount = this.useCase.getFilteredQuestions(this.filter).length;
    const wrongCount = this.useCase.getWrongCount(this.filter);

    statsInfo.textContent =
      wrongCount > 0
        ? `全${filteredCount}問 / 間違えた問題が${wrongCount}問あります`
        : `全${filteredCount}問 / 間違えた問題はありません`;

    retryBtn.disabled = wrongCount === 0;
    this.renderHistoryList(this.activeTab === "subject" ? this.filter.subject : undefined);
  }

  private updateSubjectStats(): void {
    // 全問題を1回だけ走査して subject/category/parentCategory ごとの統計を集計する
    const allQuestions = this.useCase.getFilteredQuestions({ subject: "all", category: "all" });
    const wrongSet = new Set(this.useCase.wrongQuestionIds);

    const statsMap = new Map<string, { total: number; wrong: number }>();
    const addStat = (key: string, isWrong: boolean): void => {
      const s = statsMap.get(key) ?? { total: 0, wrong: 0 };
      s.total++;
      if (isWrong) s.wrong++;
      statsMap.set(key, s);
    };

    for (const q of allQuestions) {
      const isWrong = wrongSet.has(q.id);
      addStat("all::all", isWrong);
      addStat(`${q.subject}::all`, isWrong);
      addStat(`${q.subject}::${q.category}`, isWrong);
      if (q.parentCategory) {
        addStat(`${q.subject}::parent::${q.parentCategory}`, isWrong);
      }
    }

    const formatStats = (stat: { total: number; wrong: number }): string => {
      if (stat.total === 0) return "";
      return `${stat.wrong}/${stat.total}`;
    };

    // タブの統計を更新
    document.querySelectorAll(".subject-tab[data-subject]").forEach((tab) => {
      const el = tab as HTMLElement;
      const subject = el.dataset.subject || "all";
      const stat = statsMap.get(`${subject}::all`) ?? { total: 0, wrong: 0 };
      const statsEl = el.querySelector(".tab-stats");
      if (statsEl) {
        statsEl.textContent = formatStats(stat);
      }
    });

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

      const stat = statsMap.get(key) ?? { total: 0, wrong: 0 };
      const statsEl = el.querySelector(".category-stats");
      if (statsEl) {
        statsEl.textContent = formatStats(stat);
      }

      // 学習状態の絵文字を更新（⬜未学習 / 📖学習中 / ✅学習済）
      const statusEl = el.querySelector(".category-status");
      if (statusEl) {
        if (!studiedKeys.has(key)) {
          statusEl.textContent = "⬜";
        } else if (stat.wrong > 0) {
          statusEl.textContent = "📖";
        } else {
          statusEl.textContent = "✅";
        }
      }
    });
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  private startQuiz(mode: QuizMode): void {
    try {
      this.currentSession = this.useCase.startSession(mode, this.filter, this.questionCount);
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
      return;
    }

    this.currentMode = mode;

    // メモ状態をリセット
    this.notesStates.clear();

    this.showScreen("quiz");
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
    this.setText("topicName", question.categoryName ?? question.category);

    const progress = ((idx + 1) / total) * 100;
    (document.getElementById("progressFill") as HTMLElement).style.width = `${progress}%`;

    // 解説リンクを更新
    const guideLink = document.getElementById("guideLink") as HTMLAnchorElement | null;
    if (guideLink) {
      if (question.guideUrl) {
        guideLink.href = question.guideUrl;
        guideLink.classList.remove("hidden");
      } else {
        guideLink.classList.add("hidden");
      }
    }

    this.setText("questionText", question.question);
    this.renderChoices(question, session);

    // 既に回答済みの場合はフィードバックを表示、未回答の場合は非表示
    const userAnswer = session.getAnswer(session.currentIndex);
    if (userAnswer !== undefined) {
      this.showAnswerFeedback(question, userAnswer);
    } else {
      this.hideAnswerFeedback();
    }

    this.updateNavigationButtons(session);
  }

  private renderChoices(question: Question, session: QuizSession): void {
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

  private showAnswerFeedback(question: Question, userAnswerIndex: number): void {
    const feedbackDiv = document.getElementById("answerFeedback");
    if (!feedbackDiv) return;

    const isCorrect = question.correct === userAnswerIndex;
    const resultDiv = document.getElementById("feedbackResult");
    const explanationDiv = document.getElementById("feedbackExplanation");

    if (resultDiv) {
      if (isCorrect) {
        resultDiv.textContent = "✅ 正解です！";
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

    const scoreDisplay = document.getElementById("scoreDisplay");
    if (scoreDisplay) {
      scoreDisplay.innerHTML = `
        <div class="score-circle ${percentage >= 70 ? "pass" : "fail"}">
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

    const wrongCount = this.useCase.wrongQuestionIds.length;
    const retryWrongBtn = document.getElementById("retryWrongBtn") as HTMLButtonElement | null;
    if (retryWrongBtn) {
      retryWrongBtn.disabled = wrongCount === 0;
      retryWrongBtn.textContent =
        wrongCount > 0
          ? `間違えた問題だけ (${wrongCount}問)`
          : "間違えた問題だけ";
    }

    this.showScreen("result");
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

    const topic = document.createElement("span");
    topic.className = "result-topic";
    topic.textContent = `[${question.categoryName}]`;

    header.appendChild(icon);
    header.appendChild(questionText);
    header.appendChild(topic);

    const answer = document.createElement("div");
    answer.className = "result-answer";

    const userAnswerDiv = document.createElement("div");
    userAnswerDiv.appendChild(document.createTextNode("あなたの解答: "));
    const userAnswerValue = document.createElement("strong");
    userAnswerValue.textContent = question.choices[userAnswerIndex] ?? "未回答";
    userAnswerDiv.appendChild(userAnswerValue);
    answer.appendChild(userAnswerDiv);

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
   * スタート画面へ遷移する。クイズ進行中は確認ダイアログを表示する。
   */
  private navigateToStart(): void {
    if (this.isQuizInProgress()) {
      const confirmed = window.confirm("クイズが途中です。スタート画面に戻りますか？（進行状況は保存されません）");
      if (!confirmed) return;
    }
    this.showScreen("start");
  }

  private showScreen(screenName: "start" | "quiz" | "result"): void {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    const idMap = { start: "startScreen", quiz: "quizScreen", result: "resultScreen" };
    document.getElementById(idMap[screenName])?.classList.remove("hidden");

    if (screenName === "start") {
      this.showStartTabContent(this.activeTab);
      this.updateStartScreen();
    }
  }

  // ─── ユーティリティ ────────────────────────────────────────────────────────

  private updateUserNameDisplay(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = `👤 ${this.userName}`;
    }
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
  new QuizApp();
});
