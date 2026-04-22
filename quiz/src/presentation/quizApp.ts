/**
 * QuizApp — プレゼンテーション層の UI コントローラー。
 * ビジネスロジックはすべて QuizUseCase に委譲する。
 */

import { QuizUseCase } from "../application/quizUseCase";
import type { QuizMode, QuizFilter, AnswerResult } from "../application/quizUseCase";
import { QuizSession } from "../domain/quizSession";
import type { Question } from "../domain/question";
import { RemoteQuestionRepository } from "../infrastructure/remoteQuestionRepository";
import { LocalStorageProgressRepository } from "../infrastructure/localStorageProgressRepository";
import { NotesCanvas } from "./notesCanvas";
import type { DrawingState } from "./notesCanvas";

export class QuizApp {
  private readonly useCase: QuizUseCase;
  private currentSession: QuizSession | null = null;
  private filter: QuizFilter = { subject: "all", category: "all", parentCategory: undefined };
  private userName: string = "";
  private notesCanvas: NotesCanvas | null = null;
  private notesStates: Map<number, DrawingState> = new Map();

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
    this.buildCategoryTree();
    this.updateStartScreen();
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
      const input = document.getElementById("userNameInput") as HTMLInputElement | null;
      if (input) {
        input.value = savedName;
      }
    }
  }

  private saveUserName(): void {
    const input = document.getElementById("userNameInput") as HTMLInputElement | null;
    if (input) {
      const name = input.value.trim();
      if (name) {
        this.userName = name;
        const progressRepo = new LocalStorageProgressRepository();
        progressRepo.saveUserName(name);
        this.showSaveFeedback();
      }
    }
  }

  private showSaveFeedback(): void {
    const feedback = document.getElementById("saveUserNameFeedback");
    if (feedback) {
      feedback.classList.remove("hidden");
      setTimeout(() => {
        feedback.classList.add("hidden");
      }, 2000);
    }
  }

  private buildCategoryTree(): void {
    const treeContainer = document.querySelector(".subject-tree");
    if (!treeContainer) return;

    treeContainer.innerHTML = "";

    const subjects = [
      { id: "all", name: "すべて", icon: "📋" },
      { id: "english", name: "英語", icon: "📚" },
      { id: "math", name: "数学", icon: "🔢" },
    ];

    subjects.forEach((subject) => {
      const hasChildren = subject.id !== "all";

      const item = document.createElement("div");
      item.className = "tree-item";
      item.dataset.subject = subject.id;

      const childrenId = `tree-children-${subject.id}`;

      const header = document.createElement("div");
      header.className = "tree-node-header";
      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");

      if (hasChildren) {
        const toggle = document.createElement("span");
        toggle.className = "tree-toggle";
        toggle.textContent = "▶";
        toggle.setAttribute("aria-hidden", "true");
        header.appendChild(toggle);
        header.setAttribute("aria-expanded", "false");
        header.setAttribute("aria-controls", childrenId);
      }

      const label = document.createElement("span");
      label.className = "tree-node-label";
      label.textContent = `${subject.icon} ${subject.name}`;
      header.appendChild(label);

      const stats = document.createElement("span");
      stats.className = "tree-node-stats";
      header.appendChild(stats);

      item.appendChild(header);

      if (hasChildren) {
        const children = document.createElement("div");
        children.className = "tree-children hidden";
        children.id = childrenId;

        // 親カテゴリを取得
        const parentCategories = this.useCase.getParentCategoriesForSubject(subject.id);

        if (Object.keys(parentCategories).length > 0) {
          // 親カテゴリがある場合は階層構造で表示
          for (const [parentCatId, parentCatName] of Object.entries(parentCategories)) {
            const parentItem = this.createParentCategoryNode(subject.id, parentCatId, parentCatName);
            children.appendChild(parentItem);
          }
        }

        // 親カテゴリがない問題も表示（レガシー互換）
        const categoriesWithoutParent = this.useCase.getCategoriesForSubject(subject.id);
        const categoriesForParent: Record<string, Set<string>> = {};

        // 各親カテゴリに属するカテゴリを収集
        for (const [parentCatId] of Object.entries(parentCategories)) {
          const cats = this.useCase.getCategoriesForParent(subject.id, parentCatId);
          categoriesForParent[parentCatId] = new Set(Object.keys(cats));
        }

        // 親カテゴリに属さないカテゴリのみ表示
        for (const [categoryId, categoryName] of Object.entries(categoriesWithoutParent)) {
          let belongsToParent = false;
          for (const catSet of Object.values(categoriesForParent)) {
            if (catSet.has(categoryId)) {
              belongsToParent = true;
              break;
            }
          }
          if (!belongsToParent) {
            const catItem = this.createCategoryNode(subject.id, categoryId, categoryName);
            children.appendChild(catItem);
          }
        }

        item.appendChild(children);
      }

      treeContainer.appendChild(item);
    });

    // イベントリスナーをツリーアイテムに設定
    this.attachTreeEventListeners(treeContainer);

    // 初期状態で「すべて」を選択
    const allNode = treeContainer.querySelector('.tree-item[data-subject="all"]');
    allNode?.classList.add("active");
  }

  private createParentCategoryNode(subject: string, parentCatId: string, parentCatName: string): HTMLElement {
    const parentItem = document.createElement("div");
    parentItem.className = "tree-item parent-category-node";
    parentItem.dataset.subject = subject;
    parentItem.dataset.parentCategory = parentCatId;

    const childrenId = `tree-children-${subject}-${parentCatId}`;

    const parentHeader = document.createElement("div");
    parentHeader.className = "tree-node-header";
    parentHeader.setAttribute("role", "button");
    parentHeader.setAttribute("tabindex", "0");

    const parentLabel = document.createElement("span");
    parentLabel.className = "tree-node-label";
    parentLabel.textContent = parentCatName;

    const parentStats = document.createElement("span");
    parentStats.className = "tree-node-stats";

    parentItem.appendChild(parentHeader);

    // 子カテゴリを追加
    const categories = this.useCase.getCategoriesForParent(subject, parentCatId);
    if (Object.keys(categories).length > 0) {
      const parentToggle = document.createElement("span");
      parentToggle.className = "tree-toggle";
      parentToggle.textContent = "▶";
      parentToggle.setAttribute("aria-hidden", "true");
      parentHeader.appendChild(parentToggle);
      parentHeader.setAttribute("aria-expanded", "false");
      parentHeader.setAttribute("aria-controls", childrenId);

      const catChildren = document.createElement("div");
      catChildren.className = "tree-children hidden";
      catChildren.id = childrenId;

      for (const [categoryId, categoryName] of Object.entries(categories)) {
        const catItem = this.createCategoryNode(subject, categoryId, categoryName, parentCatId);
        catChildren.appendChild(catItem);
      }

      parentItem.appendChild(catChildren);
    }

    parentHeader.appendChild(parentLabel);
    parentHeader.appendChild(parentStats);

    return parentItem;
  }

  private createCategoryNode(subject: string, categoryId: string, categoryName: string, parentCatId?: string): HTMLElement {
    const catItem = document.createElement("div");
    catItem.className = "tree-item category-node";
    catItem.dataset.subject = subject;
    catItem.dataset.category = categoryId;
    if (parentCatId) {
      catItem.dataset.parentCategory = parentCatId;
    }

    const catHeader = document.createElement("div");
    catHeader.className = "tree-node-header";
    catHeader.setAttribute("role", "button");
    catHeader.setAttribute("tabindex", "0");

    const catLabel = document.createElement("span");
    catLabel.className = "tree-node-label";
    catLabel.textContent = categoryName;
    catHeader.appendChild(catLabel);

    const catStats = document.createElement("span");
    catStats.className = "tree-node-stats";
    catHeader.appendChild(catStats);

    catItem.appendChild(catHeader);
    return catItem;
  }

  private attachTreeEventListeners(treeContainer: Element): void {
    const treeItems = treeContainer.querySelectorAll(".tree-item");
    treeItems.forEach((node) => {
      const el = node as HTMLElement;
      const nodeHeader = el.querySelector(":scope > .tree-node-header") as HTMLElement | null;
      if (!nodeHeader) return;

      const handleActivate = (e: Event): void => {
        e.stopPropagation();
        const subject = el.dataset.subject || "all";
        const category = el.dataset.category;
        const parentCategory = el.dataset.parentCategory;

        // 教科ノードまたは親カテゴリノード（カテゴリでない）の場合は展開/折りたたみをトグル
        if (!category && (subject !== "all" || parentCategory)) {
          el.classList.toggle("expanded");
          const isExpanded = el.classList.contains("expanded");
          nodeHeader.setAttribute("aria-expanded", String(isExpanded));
          const childrenEl = el.querySelector(":scope > .tree-children");
          childrenEl?.classList.toggle("hidden");
        }

        // アクティブ状態を更新
        treeItems.forEach((t) => t.classList.remove("active"));
        el.classList.add("active");

        // フィルターを更新
        this.filter.subject = subject;
        if (category) {
          // カテゴリノードがクリックされた場合
          this.filter.category = category;
          this.filter.parentCategory = parentCategory;
        } else if (parentCategory && subject !== "all") {
          // 親カテゴリノードがクリックされた場合
          this.filter.category = "all";
          this.filter.parentCategory = parentCategory;
        } else {
          // 教科ノードまたは「すべて」がクリックされた場合
          this.filter.category = "all";
          this.filter.parentCategory = undefined;
        }
        this.updateStartScreen();
      };

      nodeHeader.addEventListener("click", handleActivate);
      nodeHeader.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate(e);
        }
      });
    });

    // フィルターに基づいて初期選択を設定
    this.selectTreeItemByFilter();
  }

  /**
   * 現在のフィルター設定に基づいてツリーアイテムを選択する
   */
  private selectTreeItemByFilter(): void {
    const treeContainer = document.querySelector(".subject-tree");
    if (!treeContainer) return;

    const treeItems = treeContainer.querySelectorAll(".tree-item");

    // まず全てのアクティブ状態をクリア
    treeItems.forEach((item) => item.classList.remove("active"));

    // フィルターに一致するアイテムを探して選択
    if (this.filter.category !== "all") {
      // カテゴリが指定されている場合、そのカテゴリを選択
      const categoryNode = treeContainer.querySelector(
        `.tree-item[data-subject="${this.filter.subject}"][data-category="${this.filter.category}"]`
      );
      if (categoryNode) {
        categoryNode.classList.add("active");
        // 親の教科ノードを展開
        const parentSubject = categoryNode.closest('.tree-item[data-subject]:not([data-category])');
        if (parentSubject) {
          parentSubject.classList.add("expanded");
          const header = parentSubject.querySelector(".tree-node-header");
          header?.setAttribute("aria-expanded", "true");
          const children = parentSubject.querySelector(":scope > .tree-children");
          children?.classList.remove("hidden");
        }
        return;
      }
    }

    // カテゴリが見つからない、またはsubjectのみの場合
    if (this.filter.subject !== "all") {
      const subjectNode = treeContainer.querySelector(
        `.tree-item[data-subject="${this.filter.subject}"]:not([data-category])`
      );
      if (subjectNode) {
        subjectNode.classList.add("active");
        return;
      }
    }

    // デフォルトは「すべて」を選択
    const allNode = treeContainer.querySelector('.tree-item[data-subject="all"]');
    allNode?.classList.add("active");
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.on("startRandomBtn", "click", () => this.startQuiz("random"));
    this.on("startRetryBtn", "click", () => this.startQuiz("retry"));
    this.on("prevBtn", "click", () => this.navigate(-1));
    this.on("nextBtn", "click", () => this.navigate(1));
    this.on("submitBtn", "click", () => this.submitQuiz());
    this.on("retryAllBtn", "click", () => this.startQuiz("random"));
    this.on("retryWrongBtn", "click", () => this.startQuiz("retry"));
    this.on("backToStartBtn", "click", () => this.showScreen("start"));
    this.on("topBtn", "click", () => this.navigateToTop());

    // ユーザー名入力の変更を監視
    const userNameInput = document.getElementById("userNameInput");
    userNameInput?.addEventListener("input", () => this.saveUserName());

    // メモエリアのコントロール
    this.on("clearNotesBtn", "click", () => this.clearNotes());

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

    // DOM を一括更新
    const treeItems = document.querySelectorAll(".tree-item[data-subject]");
    treeItems.forEach((node) => {
      const el = node as HTMLElement;
      const subject = el.dataset.subject || "all";
      const category = el.dataset.category;
      const parentCategory = el.dataset.parentCategory;

      let key: string;
      if (category) {
        // カテゴリノード
        key = `${subject}::${category}`;
      } else if (parentCategory) {
        // 親カテゴリノード
        key = `${subject}::parent::${parentCategory}`;
      } else {
        // 教科ノードまたは「すべて」
        key = `${subject}::all`;
      }

      const stat = statsMap.get(key) ?? { total: 0, wrong: 0 };

      const statsEl = el.querySelector(":scope > .tree-node-header > .tree-node-stats");
      if (!statsEl) return;

      if (stat.total === 0) {
        statsEl.textContent = "";
      } else if (stat.wrong > 0) {
        statsEl.textContent = `${stat.wrong}/${stat.total}`;
      } else {
        statsEl.textContent = `0/${stat.total}`;
      }
    });
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  private startQuiz(mode: QuizMode): void {
    try {
      this.currentSession = this.useCase.startSession(mode, this.filter);
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
      return;
    }

    // メモ状態をリセット
    this.notesStates.clear();

    this.showScreen("quiz");
    this.updateUserNameDisplay("quizUserName");
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
        // クエリ・フラグメントを除いたパス部分で拡張子を判定し、なければ .md を補完する
        const url = question.guideUrl;
        const pathPart = url.split(/[?#]/)[0] ?? url;
        const lastSegment = pathPart.split("/").pop() ?? "";
        if (/\.[^.]+$/.test(lastSegment)) {
          guideLink.href = url;
        } else {
          // .md をパス部分の後・クエリ/フラグメントの前に挿入する
          const rest = url.slice(pathPart.length);
          guideLink.href = pathPart + ".md" + rest;
        }
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

    question.choices.forEach((choice, index) => {
      const label = document.createElement("label");
      label.className = "choice-label";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = String(index);
      input.checked = session.getAnswer(session.currentIndex) === index;
      input.addEventListener("change", () => {
        session.selectAnswer(session.currentIndex, index);
        this.showAnswerFeedback(question, index);
        this.updateNavigationButtons(session);
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
    this.updateUserNameDisplay("resultUserName");
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
   * 学習トップページへ遷移する。クイズ進行中は確認ダイアログを表示する。
   */
  private navigateToTop(): void {
    if (this.isQuizInProgress()) {
      const confirmed = window.confirm("クイズが途中です。学習トップに戻りますか？（進行状況は保存されません）");
      if (!confirmed) return;
    }
    window.location.href = "../";
  }

  private showScreen(screenName: "start" | "quiz" | "result"): void {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    const idMap = { start: "startScreen", quiz: "quizScreen", result: "resultScreen" };
    document.getElementById(idMap[screenName])?.classList.remove("hidden");

    if (screenName === "start") {
      this.updateStartScreen();
    }
  }

  // ─── ユーティリティ ────────────────────────────────────────────────────────

  private updateUserNameDisplay(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = this.userName ? `👤 ${this.userName}` : "";
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
}

// アプリケーション起動
document.addEventListener("DOMContentLoaded", () => {
  new QuizApp();
});
