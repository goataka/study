"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/questionLoader.ts
  async function loadAllQuestions(baseUrl = "questions") {
    const manifest = await fetchJson(`${baseUrl}/index.json`);
    validateManifest(manifest);
    const results = await Promise.all(
      manifest.questionFiles.map(
        (file) => fetchJson(`${baseUrl}/${file}`).then(
          (qf) => expandQuestions(qf)
        )
      )
    );
    return results.flat();
  }
  function validateManifest(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Manifest must be an object");
    }
    const manifest = data;
    if (typeof manifest.version !== "string") {
      throw new Error('Manifest must have a "version" string field');
    }
    if (!manifest.subjects || typeof manifest.subjects !== "object") {
      throw new Error('Manifest must have a "subjects" object');
    }
    if (!Array.isArray(manifest.questionFiles)) {
      throw new Error('Manifest must have a "questionFiles" array');
    }
  }
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch "${url}": ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
  function expandQuestions(qf) {
    return qf.questions.map((q) => ({
      ...q,
      subject: qf.subject,
      subjectName: qf.subjectName,
      category: qf.category,
      categoryName: qf.categoryName
    }));
  }
  var init_questionLoader = __esm({
    "src/questionLoader.ts"() {
      "use strict";
    }
  });

  // src/quiz.ts
  var require_quiz = __commonJS({
    "src/quiz.ts"() {
      init_questionLoader();
      var QuizApp = class {
        constructor() {
          this.allQuestions = [];
          this.currentQuestions = [];
          this.currentQuestionIndex = 0;
          this.userAnswers = [];
          this.wrongQuestions = this.loadWrongQuestions();
          this.filter = { subject: "all", category: "all" };
          this.init();
        }
        // ─── 初期化 ────────────────────────────────────────────────────────────────
        async init() {
          await this.fetchQuestions();
          this.setupEventListeners();
          this.updateStartScreen();
        }
        async fetchQuestions() {
          try {
            this.allQuestions = await loadAllQuestions("questions");
          } catch (error) {
            console.error("\u554F\u984C\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F:", error);
            alert("\u554F\u984C\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
          }
        }
        // ─── イベント登録 ──────────────────────────────────────────────────────────
        setupEventListeners() {
          this.on("startRandomBtn", "click", () => this.startQuiz("random"));
          this.on("startRetryBtn", "click", () => this.startQuiz("retry"));
          this.on("prevBtn", "click", () => this.navigateQuestion(-1));
          this.on("nextBtn", "click", () => this.navigateQuestion(1));
          this.on("submitBtn", "click", () => this.submitQuiz());
          this.on("retryAllBtn", "click", () => this.startQuiz("random"));
          this.on("retryWrongBtn", "click", () => this.startQuiz("retry"));
          this.on("backToStartBtn", "click", () => this.showScreen("start"));
          const subjectFilter = document.getElementById("subjectFilter");
          const categoryFilter = document.getElementById("categoryFilter");
          subjectFilter?.addEventListener("change", (e) => {
            this.filter.subject = e.target.value;
            this.updateCategoryFilter();
            this.updateStartScreen();
          });
          categoryFilter?.addEventListener("change", (e) => {
            this.filter.category = e.target.value;
            this.updateStartScreen();
          });
        }
        // ─── フィルター ────────────────────────────────────────────────────────────
        updateCategoryFilter() {
          const categoryFilter = document.getElementById("categoryFilter");
          if (!categoryFilter) return;
          categoryFilter.innerHTML = '<option value="all">\u3059\u3079\u3066\u306E\u30AB\u30C6\u30B4\u30EA</option>';
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
        getCategoriesForSubject(subject) {
          const categories = {};
          for (const q of this.allQuestions) {
            if (q.subject === subject && !(q.category in categories)) {
              categories[q.category] = q.categoryName;
            }
          }
          return categories;
        }
        getFilteredQuestions() {
          return this.allQuestions.filter(
            (q) => (this.filter.subject === "all" || q.subject === this.filter.subject) && (this.filter.category === "all" || q.category === this.filter.category)
          );
        }
        // ─── スタート画面 ──────────────────────────────────────────────────────────
        updateStartScreen() {
          const statsInfo = document.getElementById("statsInfo");
          const retryBtn = document.getElementById("startRetryBtn");
          if (!statsInfo || !retryBtn) return;
          const filtered = this.getFilteredQuestions();
          const wrongCount = this.wrongQuestions.filter(
            (id) => filtered.some((q) => q.id === id)
          ).length;
          statsInfo.textContent = wrongCount > 0 ? `\u5168${filtered.length}\u554F / \u9593\u9055\u3048\u305F\u554F\u984C\u304C${wrongCount}\u554F\u3042\u308A\u307E\u3059` : `\u5168${filtered.length}\u554F / \u9593\u9055\u3048\u305F\u554F\u984C\u306F\u3042\u308A\u307E\u305B\u3093`;
          retryBtn.disabled = wrongCount === 0;
        }
        // ─── クイズ開始 ────────────────────────────────────────────────────────────
        startQuiz(mode) {
          this.currentQuestionIndex = 0;
          this.userAnswers = [];
          const filtered = this.getFilteredQuestions();
          if (mode === "random") {
            this.currentQuestions = this.pickRandom(filtered, 10);
          } else {
            const retrySet = new Set(this.wrongQuestions);
            this.currentQuestions = filtered.filter((q) => retrySet.has(q.id));
            if (this.currentQuestions.length === 0) {
              alert("\u9593\u9055\u3048\u305F\u554F\u984C\u304C\u3042\u308A\u307E\u305B\u3093");
              return;
            }
          }
          this.showScreen("quiz");
          this.renderQuestion();
        }
        pickRandom(arr, n) {
          return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
        }
        // ─── 問題表示 ──────────────────────────────────────────────────────────────
        renderQuestion() {
          const question = this.currentQuestions[this.currentQuestionIndex];
          if (!question) return;
          const total = this.currentQuestions.length;
          const idx = this.currentQuestionIndex;
          this.setText("questionNumber", `\u554F\u984C ${idx + 1} / ${total}`);
          this.setText("topicName", question.categoryName ?? question.category);
          const progress = (idx + 1) / total * 100;
          document.getElementById("progressFill").style.width = `${progress}%`;
          this.setText("questionText", question.question);
          this.renderChoices(question);
          this.updateNavigationButtons();
        }
        renderChoices(question) {
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
        selectAnswer(choiceIndex) {
          this.userAnswers[this.currentQuestionIndex] = choiceIndex;
          this.updateNavigationButtons();
        }
        navigateQuestion(direction) {
          this.currentQuestionIndex += direction;
          this.renderQuestion();
        }
        updateNavigationButtons() {
          const prevBtn = document.getElementById("prevBtn");
          const nextBtn = document.getElementById("nextBtn");
          const submitBtn = document.getElementById("submitBtn");
          const isLast = this.currentQuestionIndex === this.currentQuestions.length - 1;
          prevBtn.disabled = this.currentQuestionIndex === 0;
          if (isLast) {
            nextBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");
            submitBtn.disabled = this.userAnswers.length !== this.currentQuestions.length;
          } else {
            nextBtn.classList.remove("hidden");
            submitBtn.classList.add("hidden");
            nextBtn.disabled = this.userAnswers[this.currentQuestionIndex] === void 0;
          }
        }
        // ─── 採点 ──────────────────────────────────────────────────────────────────
        submitQuiz() {
          const results = this.currentQuestions.map((q, i) => ({
            question: q,
            userAnswerIndex: this.userAnswers[i] ?? -1,
            isCorrect: this.userAnswers[i] === q.correct
          }));
          const newlyWrong = [];
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
        showResultScreen(results) {
          const correctCount = results.filter((r) => r.isCorrect).length;
          const total = results.length;
          const percentage = Math.round(correctCount / total * 100);
          const scoreDisplay = document.getElementById("scoreDisplay");
          if (scoreDisplay) {
            scoreDisplay.innerHTML = `
        <div class="score-circle ${percentage >= 70 ? "pass" : "fail"}">
          <div class="score-percentage">${percentage}%</div>
          <div class="score-text">${correctCount} / ${total} \u6B63\u89E3</div>
        </div>
      `;
          }
          const resultDetails = document.getElementById("resultDetails");
          if (resultDetails) {
            resultDetails.innerHTML = "<h3>\u89E3\u7B54\u4E00\u89A7</h3>";
            results.forEach((r) => resultDetails.appendChild(this.buildResultItem(r)));
          }
          const retryWrongBtn = document.getElementById("retryWrongBtn");
          if (retryWrongBtn) {
            retryWrongBtn.disabled = this.wrongQuestions.length === 0;
            retryWrongBtn.textContent = this.wrongQuestions.length > 0 ? `\u9593\u9055\u3048\u305F\u554F\u984C\u3060\u3051 (${this.wrongQuestions.length}\u554F)` : "\u9593\u9055\u3048\u305F\u554F\u984C\u3060\u3051";
          }
          this.showScreen("result");
        }
        buildResultItem(r) {
          const { question, userAnswerIndex, isCorrect } = r;
          const div = document.createElement("div");
          div.className = `result-item ${isCorrect ? "correct" : "incorrect"}`;
          div.innerHTML = `
      <div class="result-header">
        <span class="result-icon">${isCorrect ? "\u2713" : "\u2717"}</span>
        <span class="result-question">${question.question}</span>
        <span class="result-topic">[${question.categoryName}]</span>
      </div>
      <div class="result-answer">
        <div>\u3042\u306A\u305F\u306E\u89E3\u7B54: <strong>${question.choices[userAnswerIndex] ?? "\u672A\u56DE\u7B54"}</strong></div>
        ${!isCorrect ? `<div>\u6B63\u89E3: <strong>${question.choices[question.correct]}</strong></div>` : ""}
        <div class="explanation">${question.explanation}</div>
      </div>
    `;
          return div;
        }
        // ─── 画面切替 ──────────────────────────────────────────────────────────────
        showScreen(screenName) {
          document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
          const idMap = { start: "startScreen", quiz: "quizScreen", result: "resultScreen" };
          document.getElementById(idMap[screenName])?.classList.remove("hidden");
          if (screenName === "start") {
            this.updateStartScreen();
          }
        }
        // ─── LocalStorage ──────────────────────────────────────────────────────────
        loadWrongQuestions() {
          try {
            const saved = localStorage.getItem("wrongQuestions");
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        }
        saveWrongQuestions() {
          try {
            localStorage.setItem("wrongQuestions", JSON.stringify(this.wrongQuestions));
          } catch (error) {
            console.error("\u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F:", error);
          }
        }
        // ─── ユーティリティ ────────────────────────────────────────────────────────
        setText(id, text) {
          const el = document.getElementById(id);
          if (el) el.textContent = text;
        }
        on(id, event, handler) {
          document.getElementById(id)?.addEventListener(event, handler);
        }
      };
      document.addEventListener("DOMContentLoaded", () => {
        new QuizApp();
      });
    }
  });
  require_quiz();
})();
