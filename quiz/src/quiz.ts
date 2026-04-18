/**
 * クイズアプリケーション
 */

import { loadAllQuestions } from "./questionLoader";
import type { Question, QuizMode, QuizFilter, AnswerResult } from "./types";

class QuizApp {
  private allQuestions: Question[] = [];
  private currentQuestions: Question[] = [];
  private currentQuestionIndex = 0;
  private userAnswers: (number | undefined)[] = [];
  private wrongQuestions: string[] = this.loadWrongQuestions();
  private filter: QuizFilter = { subject: "all", category: "all" };

  constructor() {
    this.init();
  }

  // ─── 初期化 ────────────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    await this.fetchQuestions();
    this.setupEventListeners();
    this.updateStartScreen();
  }

  private async fetchQuestions(): Promise<void> {
    try {
      this.allQuestions = await loadAllQuestions("questions");
    } catch (error) {
      console.error("問題の読み込みに失敗しました:", error);
      alert("問題の読み込みに失敗しました。ページを再読み込みしてください。");
    }
  }

  // ─── イベント登録 ──────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.on("startRandomBtn", "click", () => this.startQuiz("random"));
    this.on("startRetryBtn", "click", () => this.startQuiz("retry"));
    this.on("prevBtn", "click", () => this.navigateQuestion(-1));
    this.on("nextBtn", "click", () => this.navigateQuestion(1));
    this.on("submitBtn", "click", () => this.submitQuiz());
    this.on("retryAllBtn", "click", () => this.startQuiz("random"));
    this.on("retryWrongBtn", "click", () => this.startQuiz("retry"));
    this.on("backToStartBtn", "click", () => this.showScreen("start"));

    const subjectFilter = document.getElementById("subjectFilter") as HTMLSelectElement | null;
    const categoryFilter = document.getElementById("categoryFilter") as HTMLSelectElement | null;

    subjectFilter?.addEventListener("change", (e) => {
      this.filter.subject = (e.target as HTMLSelectElement).value;
      this.updateCategoryFilter();
      this.updateStartScreen();
    });

    categoryFilter?.addEventListener("change", (e) => {
      this.filter.category = (e.target as HTMLSelectElement).value;
      this.updateStartScreen();
    });
  }

  // ─── フィルター ────────────────────────────────────────────────────────────

  private updateCategoryFilter(): void {
    const categoryFilter = document.getElementById("categoryFilter") as HTMLSelectElement | null;
    if (!categoryFilter) return;

    categoryFilter.innerHTML = '<option value="all">すべてのカテゴリ</option>';

    if (this.filter.subject !== "all") {
      const categories = this.getCategoriesForSubject(this.filter.subject);
      for (const [categoryId, categoryName] of Object.entries(categories)) {
        const option = document.createElement("option");
        option.value = categoryId;
        option.textContent = categoryName;
        categoryFilter.appendChild(option);
      }
    }

    this.filter.category = "all";
  }

  private getCategoriesForSubject(subject: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }

  private getFilteredQuestions(): Question[] {
    return this.allQuestions.filter(
      (q) =>
        (this.filter.subject === "all" || q.subject === this.filter.subject) &&
        (this.filter.category === "all" || q.category === this.filter.category)
    );
  }

  // ─── スタート画面 ──────────────────────────────────────────────────────────

  private updateStartScreen(): void {
    const statsInfo = document.getElementById("statsInfo");
    const retryBtn = document.getElementById("startRetryBtn") as HTMLButtonElement | null;
    if (!statsInfo || !retryBtn) return;

    const filtered = this.getFilteredQuestions();
    const wrongCount = this.wrongQuestions.filter((id) =>
      filtered.some((q) => q.id === id)
    ).length;

    statsInfo.textContent =
      wrongCount > 0
        ? `全${filtered.length}問 / 間違えた問題が${wrongCount}問あります`
        : `全${filtered.length}問 / 間違えた問題はありません`;

    retryBtn.disabled = wrongCount === 0;
  }

  // ─── クイズ開始 ────────────────────────────────────────────────────────────

  private startQuiz(mode: QuizMode): void {
    this.currentQuestionIndex = 0;
    this.userAnswers = [];

    const filtered = this.getFilteredQuestions();

    if (mode === "random") {
      this.currentQuestions = this.pickRandom(filtered, 10);
    } else {
      const retrySet = new Set(this.wrongQuestions);
      this.currentQuestions = filtered.filter((q) => retrySet.has(q.id));
      if (this.currentQuestions.length === 0) {
        alert("間違えた問題がありません");
        return;
      }
    }

    this.showScreen("quiz");
    this.renderQuestion();
  }

  private pickRandom<T>(arr: T[], n: number): T[] {
    const count = Math.min(n, arr.length);
    const shuffled = [...arr];
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (shuffled.length - i));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled.slice(0, count);
  }

  // ─── 問題表示 ──────────────────────────────────────────────────────────────

  private renderQuestion(): void {
    const question = this.currentQuestions[this.currentQuestionIndex];
    if (!question) return;
    const total = this.currentQuestions.length;
    const idx = this.currentQuestionIndex;

    this.setText("questionNumber", `問題 ${idx + 1} / ${total}`);
    this.setText("topicName", question.categoryName ?? question.category);

    const progress = ((idx + 1) / total) * 100;
    (document.getElementById("progressFill") as HTMLElement).style.width = `${progress}%`;

    this.setText("questionText", question.question);
    this.renderChoices(question);
    this.updateNavigationButtons();
  }

  private renderChoices(question: Question): void {
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
      input.checked = this.userAnswers[this.currentQuestionIndex] === index;
      input.addEventListener("change", () => this.selectAnswer(index));

      const span = document.createElement("span");
      span.className = "choice-text";
      span.textContent = choice;

      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  private selectAnswer(choiceIndex: number): void {
    this.userAnswers[this.currentQuestionIndex] = choiceIndex;
    this.updateNavigationButtons();
  }

  private navigateQuestion(direction: number): void {
    this.currentQuestionIndex += direction;
    this.renderQuestion();
  }

  private updateNavigationButtons(): void {
    const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
    const isLast = this.currentQuestionIndex === this.currentQuestions.length - 1;

    prevBtn.disabled = this.currentQuestionIndex === 0;

    if (isLast) {
      nextBtn.classList.add("hidden");
      submitBtn.classList.remove("hidden");
      submitBtn.disabled = this.userAnswers.length !== this.currentQuestions.length;
    } else {
      nextBtn.classList.remove("hidden");
      submitBtn.classList.add("hidden");
      nextBtn.disabled = this.userAnswers[this.currentQuestionIndex] === undefined;
    }
  }

  // ─── 採点 ──────────────────────────────────────────────────────────────────

  private submitQuiz(): void {
    const results: AnswerResult[] = this.currentQuestions.map((q, i) => ({
      question: q,
      userAnswerIndex: this.userAnswers[i] ?? -1,
      isCorrect: this.userAnswers[i] === q.correct,
    }));

    const newlyWrong: string[] = [];

    for (const r of results) {
      if (r.isCorrect) {
        this.wrongQuestions = this.wrongQuestions.filter((id) => id !== r.question.id);
      } else if (!this.wrongQuestions.includes(r.question.id)) {
        newlyWrong.push(r.question.id);
      }
    }

    this.wrongQuestions.push(...newlyWrong);
    this.saveWrongQuestions();
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

    const retryWrongBtn = document.getElementById("retryWrongBtn") as HTMLButtonElement | null;
    if (retryWrongBtn) {
      retryWrongBtn.disabled = this.wrongQuestions.length === 0;
      retryWrongBtn.textContent =
        this.wrongQuestions.length > 0
          ? `間違えた問題だけ (${this.wrongQuestions.length}問)`
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

  // ─── LocalStorage ──────────────────────────────────────────────────────────

  private loadWrongQuestions(): string[] {
    try {
      const saved = localStorage.getItem("wrongQuestions");
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  }

  private saveWrongQuestions(): void {
    try {
      localStorage.setItem("wrongQuestions", JSON.stringify(this.wrongQuestions));
    } catch (error) {
      console.error("データの保存に失敗しました:", error);
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
