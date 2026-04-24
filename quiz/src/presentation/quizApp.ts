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
  { id: "japanese", name: "国語", icon: "📖" },
] as const;

export class QuizApp {
  private readonly useCase: QuizUseCase;
  private currentSession: QuizSession | null = null;
  private currentMode: QuizMode = "random";
  private filter: QuizFilter = { subject: "english", category: "all", parentCategory: undefined };
  private userName: string = "ゲスト";
  private questionCount: number = 10;
  private notesCanvas: NotesCanvas | null = null;
  private notesStates: Map<number, DrawingState> = new Map();
  private activePanelTab: "quiz" | "guide" | "history" | "questions" = "quiz";
  private hideLearnedCategories: boolean = true;

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
    this.loadQuestionCountFromDOM();
    this.setupEventListeners();
    this.buildSubjectTabs();
    this.buildPanelTabs();
    this.showPanelTab(this.activePanelTab);
    this.updateSubjectStats();
    this.selectFirstUnlearnedCategory();
    this.updateStartScreen();
    // 学習済み非表示の初期状態をボタンのaria-pressed属性に反映する
    const hideLearnedBtn = document.getElementById("hideLearnedBtn");
    if (hideLearnedBtn) {
      hideLearnedBtn.setAttribute("aria-pressed", String(this.hideLearnedCategories));
    }
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

  private loadQuestionCountFromDOM(): void {
    const checked = document.querySelector<HTMLInputElement>('input[name="questionCount"]:checked');
    if (checked) {
      this.questionCount = parseInt(checked.value);
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
   * インナーパネルタブ（クイズモード選択 / 解説 / 実行記録 / 問題一覧）を初期化する
   */
  private buildPanelTabs(): void {
    document.querySelectorAll<HTMLElement>(".panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const panel = tab.dataset.panel as "quiz" | "guide" | "history" | "questions";
        this.activePanelTab = panel;
        this.showPanelTab(panel);
        if (panel === "guide") {
          this.updateGuidePanelContent();
        } else if (panel === "history") {
          this.renderHistoryList(this.filter);
        } else if (panel === "questions") {
          this.renderQuestionList();
        }
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
    // 学習済の非表示状態を維持する
    categoryList.classList.toggle("hide-learned", this.hideLearnedCategories);
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

    // カテゴリ名 + 進捗バーのエリア
    const nameArea = document.createElement("div");
    nameArea.className = "category-name-area";

    const nameSpan = document.createElement("span");
    nameSpan.className = "category-name";
    nameSpan.textContent = categoryName;

    const progressBar = document.createElement("div");
    progressBar.className = "category-progress-bar";
    const progressFill = document.createElement("div");
    progressFill.className = "category-progress-fill";
    progressBar.appendChild(progressFill);

    nameArea.appendChild(nameSpan);
    nameArea.appendChild(progressBar);

    // 解説リンク（guideUrl が設定されている場合のみ表示）
    const guideUrl = this.useCase.getCategoryGuideUrl(subject, categoryId);
    const guideLink = document.createElement("a");
    guideLink.className = "category-guide-link";
    guideLink.setAttribute("aria-label", "解説を開く");
    guideLink.textContent = "📖";
    if (guideUrl) {
      guideLink.href = guideUrl;
      guideLink.target = "_blank";
      guideLink.rel = "noopener noreferrer";
    } else {
      guideLink.classList.add("hidden");
    }
    // カテゴリ選択のイベントが解説リンクで発火しないようにする
    guideLink.addEventListener("click", (e) => e.stopPropagation());
    guideLink.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
      }
      if (e.key === " ") {
        e.preventDefault();
      }
    });

    const statsSpan = document.createElement("span");
    statsSpan.className = "category-stats";

    item.appendChild(statusSpan);
    item.appendChild(nameArea);
    item.appendChild(guideLink);
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
   * メモエリアのタブを切り替える（"memo" または "guide"）。
   */
  private showNoteTab(tab: "memo" | "guide"): void {
    const memoContent = document.getElementById("notesMemoContent");
    const guideContent = document.getElementById("notesGuideContent");

    memoContent?.classList.toggle("hidden", tab !== "memo");
    guideContent?.classList.toggle("hidden", tab !== "guide");

    document.querySelectorAll<HTMLElement>(".notes-tab-btn").forEach((t) => {
      const isActive = t.id === `notesTab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", String(isActive));
      t.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    if (tab === "guide") {
      this.updateGuidePanelContentByIds("notesGuideFrame", "notesGuideNoContent");
    }
  }

  // ─── 解説パネル ────────────────────────────────────────────────────────────

  /**
   * 解説パネルのコンテンツを現在選択中のカテゴリに合わせて更新する（メインパネル用）。
   */
  private updateGuidePanelContent(): void {
    this.updateGuidePanelContentByIds("guidePanelFrame", "guideNoContent");
  }

  /**
   * 指定した iframe と空表示要素 ID を使って解説コンテンツを更新する共通処理。
   */
  private updateGuidePanelContentByIds(frameId: string, noContentId: string): void {
    const guideFrame = document.getElementById(frameId) as HTMLIFrameElement | null;
    const noContent = document.getElementById(noContentId);
    if (!guideFrame) return;

    const guideUrl =
      this.filter.category !== "all"
        ? this.useCase.getCategoryGuideUrl(this.filter.subject, this.filter.category)
        : undefined;

    if (guideUrl) {
      if (guideFrame.getAttribute("src") !== guideUrl) {
        guideFrame.src = guideUrl;
      }
      guideFrame.classList.remove("hidden");
      noContent?.classList.add("hidden");
    } else {
      guideFrame.src = "about:blank";
      guideFrame.classList.add("hidden");
      noContent?.classList.remove("hidden");
    }
  }

  // ─── 回答記録 ──────────────────────────────────────────────────────────────

  /**
   * 回答記録一覧を描画する
   * filter の subject・category に応じて記録を絞り込む
   */
  private renderHistoryList(filter: QuizFilter): void {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    const allRecords = this.useCase.getHistory();
    const records = allRecords.filter(
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
    modeSpan.textContent = record.mode === "retry" ? "復習" : record.mode === "practice" ? "練習" : record.mode === "manual" ? "手動" : "本番";

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
      const userAnswer = entry.userAnswerText ?? (entry.choices[entry.userAnswerIndex] ?? "未回答");
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

  // ─── 問題一覧パネル ────────────────────────────────────────────────────────

  /**
   * 現在のフィルターに基づいて問題一覧パネルを描画する
   */
  private renderQuestionList(): void {
    const bodyEl = document.getElementById("questionListBody");
    if (!bodyEl) return;

    const questions = this.useCase.getFilteredQuestions(this.filter);

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
   * 問題一覧の1問分のHTML要素を構築する（問題・正解・ヒントのみ表示）
   */
  private buildQuestionListItem(question: Question): HTMLElement {
    const item = document.createElement("div");
    item.className = "question-list-item";

    const rowDiv = document.createElement("div");
    rowDiv.className = "question-list-row";

    const textDiv = document.createElement("span");
    textDiv.className = "question-list-text";
    textDiv.textContent = question.question;
    rowDiv.appendChild(textDiv);

    const correctDiv = document.createElement("span");
    correctDiv.className = "question-list-correct";
    correctDiv.textContent = `✓ ${question.choices[question.correct]}`;
    rowDiv.appendChild(correctDiv);

    const hintBtn = document.createElement("button");
    hintBtn.className = "question-list-hint-btn";
    hintBtn.textContent = "💡";
    hintBtn.setAttribute("aria-label", "ヒントを表示");
    hintBtn.setAttribute("aria-expanded", "false");
    rowDiv.appendChild(hintBtn);

    item.appendChild(rowDiv);

    const hintDiv = document.createElement("div");
    hintDiv.className = "question-list-hint hidden";
    hintDiv.textContent = question.explanation;
    item.appendChild(hintDiv);

    hintBtn.addEventListener("click", () => {
      const isHidden = hintDiv.classList.toggle("hidden");
      hintBtn.setAttribute("aria-expanded", isHidden ? "false" : "true");
    });

    return item;
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.on("startRandomBtn", "click", () => this.startQuiz("random"));
    this.on("startPracticeBtn", "click", () => this.startQuiz("practice"));
    this.on("startRetryBtn", "click", () => this.startQuiz("retry"));
    this.on("markLearnedBtn", "click", () => this.toggleLearnedStatus());
    this.on("prevBtn", "click", () => this.navigate(-1));
    this.on("nextBtn", "click", () => this.navigate(1));
    this.on("submitBtn", "click", () => this.submitQuiz());
    this.on("retryAllBtn", "click", () => this.startQuiz("random"));
    this.on("retryWrongBtn", "click", () => this.startQuiz("retry"));
    this.on("backToStartBtn", "click", () => this.showScreen("start"));
    this.on("cancelQuizBtn", "click", () => this.navigateToStart());

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

    // ノートタブの切り替え
    document.getElementById("notesTabMemo")?.addEventListener("click", () => this.showNoteTab("memo"));
    document.getElementById("notesTabGuide")?.addEventListener("click", () => this.showNoteTab("guide"));

    // タッチペン入力確定ボタン（text-input問題のメモタブで使用）
    document.getElementById("handwritingConfirmBtn")?.addEventListener("click", () => this.handleHandwritingConfirm());

    // 学習済カテゴリの非表示トグル
    this.on("hideLearnedBtn", "click", () => this.toggleHideLearned());

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
    this.updateQuizPanelVisibility();
    const statsInfo = document.getElementById("statsInfo");
    const retryBtn = document.getElementById("startRetryBtn") as HTMLButtonElement | null;
    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement | null;
    if (!statsInfo || !retryBtn) return;

    const filteredCount = this.useCase.getFilteredQuestions(this.filter).length;
    const wrongCount = this.useCase.getWrongCount(this.filter);

    statsInfo.textContent =
      wrongCount > 0
        ? `全${filteredCount}問 / 間違えた問題が${wrongCount}問あります`
        : `全${filteredCount}問 / 間違えた問題はありません`;

    retryBtn.disabled = wrongCount === 0;

    // 特定カテゴリが選択されている場合のみ「学習済みにする」ボタンを有効化
    if (markLearnedBtn) {
      markLearnedBtn.disabled = this.filter.category === "all";
      markLearnedBtn.textContent = this.isCurrentCategoryLearned() ? "↩ 未学習に戻す" : "✅ 学習済みにする";
    }

    this.renderHistoryList(this.filter);
    if (this.activePanelTab === "questions") {
      this.renderQuestionList();
    }
    if (this.activePanelTab === "guide") {
      this.updateGuidePanelContent();
    }
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

      // 進捗バーを更新（学習履歴がある場合）
      const progressFill = el.querySelector(".category-progress-fill") as HTMLElement | null;
      if (progressFill) {
        const isStudied = studiedKeys.has(key);
        if (isStudied || stat.wrong > 0) {
          const pct = stat.total > 0 ? Math.round(((stat.total - stat.wrong) / stat.total) * 100) : 0;
          progressFill.style.width = `${pct}%`;
          progressFill.classList.toggle("progress-fill-done", pct === 100);
        } else {
          progressFill.style.width = "0%";
          progressFill.classList.remove("progress-fill-done");
        }
      }

      // 学習状態の絵文字を更新（⬜未学習 / 📖学習中 / ✅学習済）
      const isLearned = studiedKeys.has(key) && stat.wrong === 0;
      el.classList.toggle("learned", isLearned);
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

  /**
   * 学習済カテゴリの表示/非表示を切り替える
   */
  private toggleHideLearned(): void {
    this.hideLearnedCategories = !this.hideLearnedCategories;
    const categoryList = document.getElementById("categoryList");
    if (categoryList) {
      categoryList.classList.toggle("hide-learned", this.hideLearnedCategories);
    }
    const btn = document.getElementById("hideLearnedBtn");
    if (btn) {
      btn.setAttribute("aria-pressed", String(this.hideLearnedCategories));
    }
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  /**
  /**
   * 現在選択中のカテゴリが学習済み（✅）かどうかを返す。
   */
  private isCurrentCategoryLearned(): boolean {
    if (this.filter.category === "all") return false;
    const studiedKeys = this.useCase.getStudiedCategoryKeys();
    const wrongCount = this.useCase.getWrongCount(this.filter);
    return studiedKeys.has(`${this.filter.subject}::${this.filter.category}`) && wrongCount === 0;
  }

  /**
   * 現在選択中のカテゴリの学習済み状態をトグルする。
   * 学習済みなら未学習に戻し、そうでなければ学習済みにする。
   */
  private toggleLearnedStatus(): void {
    if (this.isCurrentCategoryLearned()) {
      this.useCase.unmarkCategoryAsLearned(this.filter);
    } else {
      this.useCase.markCategoryAsLearned(this.filter);
    }
    this.updateStartScreen();
  }

  /**
   * クイズパネルの表示/非表示を更新する。
   * カテゴリが未選択（"all"）の場合はパネルを非表示にし、
   * 特定のカテゴリが選択されている場合は表示する。
   */
  private updateQuizPanelVisibility(): void {
    const subjectContent = document.getElementById("subjectContent");
    if (!subjectContent) return;
    const noCategory = this.filter.category === "all";
    subjectContent.classList.toggle("category-only", noCategory);
  }

  /**
   * 現在選択中のカテゴリを学習済みとしてマークする。
   * 解答なしでも単元を学習済みにできる。
   */
  private markCategoryAsLearned(): void {
    this.useCase.markCategoryAsLearned(this.filter);
    this.updateStartScreen();
  }

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

    this.setText("questionText", question.question);
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
   * メモエリアをtextinput問題のタッチペン入力用に更新する。
   * - text-input問題かつ未回答の場合: 確定ボタンを表示、ガイドテキストを変更
   * - それ以外: 確定ボタンを非表示、ガイドテキストを元に戻す
   * 問題遷移のたびに呼ばれ、自己評価UIをクリアして確定ボタンを復元する。
   */
  private updateNotesAreaForQuestion(question: Question | null, isAnswered: boolean): void {
    const notesTitle = document.getElementById("notesTitle");
    const confirmArea = document.getElementById("handwritingConfirmArea");
    const confirmBtn = document.getElementById("handwritingConfirmBtn") as HTMLButtonElement | null;
    const selfEvalArea = document.getElementById("handwritingSelfEvalArea");

    const isTextInput = question?.questionType === "text-input";
    const showConfirm = isTextInput && !isAnswered;

    if (notesTitle) {
      notesTitle.textContent = isTextInput
        ? "✏️ ここに手書きで解答できます"
        : "タッチペンで書けます";
    }
    if (confirmArea) {
      confirmArea.classList.toggle("hidden", !showConfirm);
    }
    // 確定ボタンを再表示してdisabled状態をリセット（問題遷移時の復元）
    if (confirmBtn) {
      confirmBtn.classList.remove("hidden");
      confirmBtn.disabled = !showConfirm;
    }
    // 自己評価UIをクリア（問題遷移時のリセット）
    if (selfEvalArea) {
      selfEvalArea.innerHTML = "";
      selfEvalArea.classList.add("hidden");
    }
  }

  /**
   * タッチペン入力の確定ボタンが押されたときの処理。
   * 正解を表示してユーザーに自己評価させ、テキスト欄に結果を反映する。
   */
  private handleHandwritingConfirm(): void {
    const session = this.currentSession;
    if (!session) return;

    const question = session.currentQuestion;
    if (question.questionType !== "text-input") return;

    // 既回答の場合は何もしない
    if (session.getAnswer(session.currentIndex) !== undefined) return;

    const correctAnswer = question.choices[question.correct] ?? "";

    // 確定ボタンを隠し、自己評価UIを同一confirmArea内の別divに表示
    const confirmBtn = document.getElementById("handwritingConfirmBtn") as HTMLButtonElement | null;
    const selfEvalArea = document.getElementById("handwritingSelfEvalArea");
    if (!selfEvalArea) return;

    confirmBtn?.classList.add("hidden");
    selfEvalArea.innerHTML = "";
    selfEvalArea.classList.remove("hidden");

    const revealText = document.createElement("p");
    revealText.className = "handwriting-reveal-text";
    revealText.textContent = `正解は「${correctAnswer}」です。あっていましたか？`;

    const selfEvalBtns = document.createElement("div");
    selfEvalBtns.className = "self-eval-buttons";

    const correctBtn = document.createElement("button");
    correctBtn.type = "button";
    correctBtn.className = "self-eval-btn self-eval-correct";
    correctBtn.textContent = "○ 正解だった";

    const incorrectBtn = document.createElement("button");
    incorrectBtn.type = "button";
    incorrectBtn.className = "self-eval-btn self-eval-incorrect";
    incorrectBtn.textContent = "× 不正解だった";

    const handleSelfEval = (selfCorrect: boolean): void => {
      // 不正解時は空文字を保存（"×" などのセンチネルを使わない）
      const text = selfCorrect ? correctAnswer : "";
      session.selectTextAnswer(session.currentIndex, text);
      const answerIndex = session.getAnswer(session.currentIndex)!;

      // テキスト入力欄に結果を反映して無効化
      const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
      if (textInput) {
        textInput.value = selfCorrect ? correctAnswer : "";
        textInput.disabled = true;
      }
      const keyboardSubmitBtn = document.querySelector<HTMLButtonElement>(".text-answer-submit-btn");
      if (keyboardSubmitBtn) {
        keyboardSubmitBtn.disabled = true;
      }

      this.showAnswerFeedback(question, answerIndex, selfCorrect ? correctAnswer : undefined);
      this.updateNavigationButtons(session);

      correctBtn.disabled = true;
      incorrectBtn.disabled = true;
    };

    correctBtn.addEventListener("click", () => handleSelfEval(true));
    incorrectBtn.addEventListener("click", () => handleSelfEval(false));

    selfEvalBtns.appendChild(correctBtn);
    selfEvalBtns.appendChild(incorrectBtn);
    selfEvalArea.appendChild(revealText);
    selfEvalArea.appendChild(selfEvalBtns);
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

    const wrongCount = this.useCase.wrongQuestionIds.length;
    const retryWrongBtn = document.getElementById("retryWrongBtn") as HTMLButtonElement | null;
    if (retryWrongBtn) {
      retryWrongBtn.disabled = wrongCount === 0;
      retryWrongBtn.textContent =
        wrongCount > 0
          ? `復習 (${wrongCount}問)`
          : "復習";
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
    if (question.questionType === "text-input") {
      userAnswerValue.textContent = r.userAnswerText ?? "（未入力）";
    } else {
      userAnswerValue.textContent = question.choices[userAnswerIndex] ?? "未回答";
    }
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
      this.showPanelTab(this.activePanelTab);
      this.updateSubjectStats();
      this.selectFirstUnlearnedCategory();
      this.updateStartScreen();
    }
  }

  /**
   * 学習済みではない最初のカテゴリを自動選択する。
   * スタート画面の表示時に呼び出されることで、次に学習すべき単元を案内する。
   * URLパラメータでカテゴリが明示指定されている場合はスキップする。
   */
  private selectFirstUnlearnedCategory(): void {
    // URLパラメータで特定カテゴリが指定されている場合はディープリンク挙動を維持する
    if (new URLSearchParams(window.location.search).has("category")) return;

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

  private showNoteTab(tab: "memo" | "guide"): void {
    const memoContent = document.getElementById("notesMemoContent");
    const guideContent = document.getElementById("notesGuideContent");

    memoContent?.classList.toggle("hidden", tab !== "memo");
    guideContent?.classList.toggle("hidden", tab !== "guide");

    const memoBtn = document.getElementById("notesTabMemo");
    const guideBtn = document.getElementById("notesTabGuide");

    memoBtn?.classList.toggle("active", tab === "memo");
    guideBtn?.classList.toggle("active", tab === "guide");
  }
}

// アプリケーション起動
document.addEventListener("DOMContentLoaded", () => {
  new QuizApp();
});
