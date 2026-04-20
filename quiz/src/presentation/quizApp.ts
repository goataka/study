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

export class QuizApp {
  private readonly useCase: QuizUseCase;
  private currentSession: QuizSession | null = null;
  private filter: QuizFilter = { subject: "all", category: "all" };

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
    this.loadFilterFromURL();
    this.setupEventListeners();
    this.buildCategoryTree();
    this.updateStartScreen();
  }

  /**
   * URL パラメータから subject と category を読み取り、フィルターを設定する。
   * 例: ?subject=english&category=linking
   */
  private loadFilterFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const category = params.get("category");

    if (subject) {
      this.filter.subject = subject;
    }
    if (category) {
      this.filter.category = category;
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
      const categories = hasChildren
        ? this.useCase.getCategoriesForSubject(subject.id)
        : {};

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

      if (hasChildren && Object.keys(categories).length > 0) {
        const children = document.createElement("div");
        children.className = "tree-children hidden";
        children.id = childrenId;

        for (const [categoryId, categoryName] of Object.entries(categories)) {
          const catItem = document.createElement("div");
          catItem.className = "tree-item category-node";
          catItem.dataset.subject = subject.id;
          catItem.dataset.category = categoryId;

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
          children.appendChild(catItem);
        }

        item.appendChild(children);
      }

      treeContainer.appendChild(item);
    });

    // イベントリスナーをツリーアイテムに設定
    const treeItems = treeContainer.querySelectorAll(".tree-item");
    treeItems.forEach((node) => {
      const el = node as HTMLElement;
      const nodeHeader = el.querySelector(":scope > .tree-node-header") as HTMLElement | null;
      if (!nodeHeader) return;

      const handleActivate = (e: Event): void => {
        e.stopPropagation();
        const subject = el.dataset.subject || "all";
        const category = el.dataset.category;

        // 教科ノード（カテゴリでない）の場合は展開/折りたたみをトグル
        if (!category && subject !== "all") {
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
        this.filter.category = category ?? "all";
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

    // フィルターに基づいてノードを選択・展開
    this.selectAndExpandTreeNode(treeContainer);
  }

  /**
   * フィルターに基づいて、対応するツリーノードを選択して展開する。
   */
  private selectAndExpandTreeNode(treeContainer: Element): void {
    const { subject, category } = this.filter;

    // カテゴリが指定されている場合は、そのカテゴリノードを選択
    if (category && category !== "all") {
      const categoryNode = treeContainer.querySelector(
        `.tree-item[data-subject="${subject}"][data-category="${category}"]`
      );
      if (categoryNode) {
        categoryNode.classList.add("active");
        // 親の subject ノードを展開
        const subjectNode = treeContainer.querySelector(
          `.tree-item[data-subject="${subject}"]:not([data-category])`
        );
        if (subjectNode) {
          subjectNode.classList.add("expanded");
          const header = subjectNode.querySelector(".tree-node-header");
          header?.setAttribute("aria-expanded", "true");
          const children = subjectNode.querySelector(".tree-children");
          children?.classList.remove("hidden");
        }
        return;
      }
    }

    // カテゴリが指定されていない場合は、subject ノードを選択
    if (subject && subject !== "all") {
      const subjectNode = treeContainer.querySelector(
        `.tree-item[data-subject="${subject}"]:not([data-category])`
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
    // 全問題を1回だけ走査して subject/category ごとの統計を集計する
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
    }

    // DOM を一括更新
    const treeItems = document.querySelectorAll(".tree-item[data-subject]");
    treeItems.forEach((node) => {
      const el = node as HTMLElement;
      const subject = el.dataset.subject || "all";
      const category = el.dataset.category ?? "all";
      const key = `${subject}::${category}`;
      const stat = statsMap.get(key) ?? { total: 0, wrong: 0 };

      const statsEl = el.querySelector(":scope > .tree-node-header > .tree-node-stats");
      if (!statsEl) return;

      if (stat.total === 0) {
        statsEl.textContent = "";
      } else if (stat.wrong > 0) {
        statsEl.textContent = `${stat.wrong}/${stat.total}`;
      } else {
        statsEl.textContent = `${stat.total}問`;
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
    this.showScreen("quiz");
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
    session.navigate(direction);
    this.renderQuestion();
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

    if (!isCorrect) {
      const correctDiv = document.createElement("div");
      correctDiv.appendChild(document.createTextNode("正解: "));
      const correctValue = document.createElement("strong");
      correctValue.textContent = question.choices[question.correct] ?? "";
      correctDiv.appendChild(correctValue);
      answer.appendChild(correctDiv);
    }

    const explanation = document.createElement("div");
    explanation.className = "explanation";
    explanation.textContent = question.explanation;
    answer.appendChild(explanation);

    div.appendChild(header);
    div.appendChild(answer);
    return div;
  }

  // ─── 画面切替 ──────────────────────────────────────────────────────────────

  private showScreen(screenName: "start" | "quiz" | "result"): void {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    const idMap = { start: "startScreen", quiz: "quizScreen", result: "resultScreen" };
    document.getElementById(idMap[screenName])?.classList.remove("hidden");

    if (screenName === "start") {
      this.updateStartScreen();
    }
  }

  // ─── ユーティリティ ────────────────────────────────────────────────────────

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private on(id: string, event: string, handler: () => void): void {
    document.getElementById(id)?.addEventListener(event, handler);
  }
}

// アプリケーション起動
document.addEventListener("DOMContentLoaded", () => {
  new QuizApp();
});
