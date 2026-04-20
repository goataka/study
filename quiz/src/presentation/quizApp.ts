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
    this.setupEventListeners();
    this.initializeSubjectSelection();
    this.updateStartScreen();
  }

  private initializeSubjectSelection(): void {
    // 初期状態で「すべて」を選択
    const allSubjectItem = document.querySelector('.subject-item[data-subject="all"]');
    if (allSubjectItem) {
      allSubjectItem.classList.add("active");
    }
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

    // エクスプローラ風の教科選択
    const subjectItems = document.querySelectorAll(".subject-item");
    subjectItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const subject = target.dataset.subject || "all";

        // アクティブクラスの切り替え
        subjectItems.forEach((s) => s.classList.remove("active"));
        target.classList.add("active");

        // フィルター更新
        this.filter.subject = subject;
        this.filter.category = "all";
        this.updateCategoryFilter();
        this.updateStartScreen();
      });
    });

    const categoryFilter = document.getElementById("categoryFilter") as HTMLSelectElement | null;

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
      const categories = this.useCase.getCategoriesForSubject(this.filter.subject);
      for (const [categoryId, categoryName] of Object.entries(categories)) {
        const option = document.createElement("option");
        option.value = categoryId;
        option.textContent = categoryName;
        categoryFilter.appendChild(option);
      }
    }
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
    const subjects = ["all", "english", "math"];

    subjects.forEach((subject) => {
      const filter: QuizFilter = { subject, category: "all" };
      const totalCount = this.useCase.getFilteredQuestions(filter).length;
      const wrongCount = this.useCase.getWrongCount(filter);

      const subjectItem = document.querySelector(
        `.subject-item[data-subject="${subject}"]`
      ) as HTMLElement | null;
      if (!subjectItem) return;

      const statsEl = subjectItem.querySelector(".subject-stats");
      if (!statsEl) return;

      if (totalCount === 0) {
        statsEl.textContent = "問題なし";
      } else if (wrongCount > 0) {
        statsEl.textContent = `${totalCount}問中 ${wrongCount}問が要復習`;
      } else {
        statsEl.textContent = `${totalCount}問`;
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
