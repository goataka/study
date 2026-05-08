/**
 * QuizApp プレゼンテーション層 — 結果画面・カテゴリ進捗バー仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { setupTabDom, setupFetchMock, mockQuestionFile } from "./quizApp.testHelpers";

describe("QuizApp — 結果画面の全問正解表示仕様", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
      <span id="headerUserName"></span>
      <div id="startScreen" class="screen active">
        <div id="statsInfo"></div>
        <input type="radio" name="questionCount" value="5">
        <input type="radio" name="questionCount" value="10" checked>
        <input type="radio" name="questionCount" value="20">
        <button id="startRandomBtn">ランダム</button>
        <button id="startRetryBtn" disabled>間違えた問題</button>
      </div>
      <div id="quizScreen" class="screen">
        <div id="questionNumber"></div>
        <div id="topicName"></div>
        <div id="progressFill" style="width:0%"></div>
        <div id="questionText"></div>
        <button id="speakBtn" class="speak-btn hidden" type="button">🔊</button>
        <div id="choicesContainer"></div>
        <div id="answerFeedback" class="answer-feedback hidden">
          <div id="feedbackResult" class="feedback-result"></div>
          <div id="feedbackExplanation" class="feedback-explanation"></div>
        </div>
        <button id="prevBtn" disabled>前へ</button>
        <button id="nextBtn">次へ</button>
        <button id="submitBtn" disabled>提出</button>
      </div>
      <div id="resultScreen" class="screen">
        <div id="resultUnitName" class="result-unit-name hidden"></div>
        <div id="resultMessage" class="result-message"></div>
        <div id="scoreDisplay"></div>
        <div id="resultDetails"></div>
        <button id="retryAllBtn">もう一度</button>
        <button id="retryWrongBtn">間違えた問題</button>
        <button id="backToStartBtn">スタート画面に戻る</button>
      </div>
    `;
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** クイズを開始して全問に正解し採点する */
  async function completeQuizWithAllCorrect(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // 全問（最大5問）に正解する
    for (let i = 0; i < 5; i++) {
      // 正解の選択肢「ア」を持つラベルをクリック
      const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
      const correctLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent === "ア");
      correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

      const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
      const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
      if (!submitBtn.classList.contains("hidden") && !submitBtn.disabled) {
        submitBtn.click();
        break;
      } else if (!nextBtn.classList.contains("hidden") && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }

  /** クイズを開始して全問に不正解し採点する */
  async function completeQuizWithAllWrong(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    for (let i = 0; i < 5; i++) {
      // 不正解の選択肢（「ア」以外）をクリック
      const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
      const wrongLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent !== "ア");
      wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

      const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
      const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
      if (!submitBtn.classList.contains("hidden") && !submitBtn.disabled) {
        submitBtn.click();
        break;
      } else if (!nextBtn.classList.contains("hidden") && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }

  it("全問正解時にスコアサークルに perfect クラスが付与される", async () => {
    await completeQuizWithAllCorrect();

    const scoreCircle = document.querySelector(".score-circle");
    expect(scoreCircle?.classList.contains("perfect")).toBe(true);
  });

  it("全問正解時に ✅ アイコン要素が表示される", async () => {
    await completeQuizWithAllCorrect();

    const perfectIcon = document.querySelector(".score-perfect-icon");
    expect(perfectIcon).not.toBeNull();
    expect(perfectIcon?.textContent).toBe("✅");
  });

  it("全問正解時に pass クラスは付与されない", async () => {
    await completeQuizWithAllCorrect();

    const scoreCircle = document.querySelector(".score-circle");
    expect(scoreCircle?.classList.contains("pass")).toBe(false);
  });

  it("全問不正解時には perfect クラスが付与されない", async () => {
    await completeQuizWithAllWrong();

    const scoreCircle = document.querySelector(".score-circle");
    expect(scoreCircle?.classList.contains("perfect")).toBe(false);
    expect(document.querySelector(".score-perfect-icon")).toBeNull();
  });
});

describe("QuizApp — 確認結果画面の単元名表示仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("単元を選択してクイズを完了すると確認結果に単元名が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 単元を選択
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // クイズを開始して全問正解
    document.getElementById("startRandomBtn")?.click();
    for (let i = 0; i < 5; i++) {
      const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
      const correctLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent === "ア");
      correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

      const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
      const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
      if (!submitBtn.classList.contains("hidden") && !submitBtn.disabled) {
        submitBtn.click();
        break;
      } else if (!nextBtn.classList.contains("hidden") && !nextBtn.disabled) {
        nextBtn.click();
      }
    }

    const resultUnitName = document.getElementById("resultUnitName");
    expect(resultUnitName?.textContent).toBe("英語 › フォニックス（1文字）");
    expect(resultUnitName?.classList.contains("hidden")).toBe(false);
  });

  it("カテゴリが「すべて」の状態でクイズを完了すると resultUnitName に教科名が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 単元を選択せずそのままスタート（filter.category は "all"）
    document.getElementById("startRandomBtn")?.click();
    for (let i = 0; i < 5; i++) {
      const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
      const correctLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent === "ア");
      correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

      const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
      const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
      if (!submitBtn.classList.contains("hidden") && !submitBtn.disabled) {
        submitBtn.click();
        break;
      } else if (!nextBtn.classList.contains("hidden") && !nextBtn.disabled) {
        nextBtn.click();
      }
    }

    const resultUnitName = document.getElementById("resultUnitName");
    // カテゴリが「すべて」の場合でも最初の問題の単元名・教科を表示する
    expect(resultUnitName?.classList.contains("hidden")).toBe(false);
    expect(resultUnitName?.textContent).toContain("英語");
  });
});

describe("QuizApp — カテゴリ進捗バー仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("カテゴリアイテムには .category-progress-bar が含まれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.querySelector(".category-progress-bar")).not.toBeNull();
    expect(catItem?.querySelector(".category-progress-fill")).not.toBeNull();
  });

  it("未学習カテゴリの進捗バーは 0% の幅になっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    expect(fill?.style.width).toBe("0%");
  });

  it("学習済（間違いなし）カテゴリの進捗バーは 100% になり progress-fill-done クラスが付く", async () => {
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [
            { questionId: "q1", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q2", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q3", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q4", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q5", isCorrect: true, userAnswerIndex: 0 },
          ],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    // 進捗バーは mastered / total を使うため全問題を mastered に設定する
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    expect(fill?.style.width).toBe("100%");
    expect(fill?.classList.contains("progress-fill-done")).toBe(true);
  });

  it("カテゴリアイテムには .category-stats が含まれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.querySelector(".category-stats")).not.toBeNull();
  });

  it("未学習カテゴリの進捗数値は 0/total 形式になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const stats = catItem?.querySelector(".category-stats") as HTMLElement | null;
    expect(stats?.textContent).toBe("0/5");
  });

  it("学習済（間違いなし）カテゴリの進捗数値は mastered/total 形式になる", async () => {
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 5,
          entries: [
            { questionId: "q1", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q2", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q3", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q4", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q5", isCorrect: true, userAnswerIndex: 0 },
          ],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    // 進捗バーは mastered / total を使うため全問題を mastered に設定する
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const stats = catItem?.querySelector(".category-stats") as HTMLElement | null;
    expect(stats?.textContent).toBe("5/5");
  });

  it("学習中問題ありのカテゴリの進捗数値は mastered(inProgress)/total 形式になり、バー幅も 80% になる", async () => {
    // mockQuestionFile には q1–q5 の5問がある。q1 を学習中（1回解答済み未習得）として登録し、q2–q5 を習得済みとする。
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 5,
          correctCount: 4,
          entries: [
            { questionId: "q1", isCorrect: false, userAnswerIndex: 1 },
            { questionId: "q2", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q3", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q4", isCorrect: true, userAnswerIndex: 0 },
            { questionId: "q5", isCorrect: true, userAnswerIndex: 0 },
          ],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify(["q1"]));
    // 進捗バーは mastered / total を使うため q2–q5 の4問を mastered に設定する（4/5 = 80%）
    localStorage.setItem("masteredIds", JSON.stringify(["q2", "q3", "q4", "q5"]));
    // q1 は1回回答済みで未習得（学習中）
    localStorage.setItem("questionStats", JSON.stringify({ q1: { total: 1, correct: 0 } }));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    const fillInProgress = catItem?.querySelector(".category-progress-fill-inprogress") as HTMLElement | null;
    const stats = catItem?.querySelector(".category-stats") as HTMLElement | null;

    expect(fill?.style.width).toBe("80%");
    // 学習中バー: 1/5 = 20%
    expect(fillInProgress?.style.width).toBe("20%");
    expect(stats?.textContent).toBe("4(1)/5");
  });

  it("手動で学習済みにしたカテゴリ（entries が空の manual レコード）の進捗バーは 100% になる", async () => {
    // manual モードは entries が空でも履歴レコードが存在する（学習済みマーク機能）
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: new Date().toISOString(),
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "manual",
          totalCount: 5,
          correctCount: 5,
          entries: [],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    // markCategoryAsLearned は masteredIds にも追加するため、テストでも masteredIds を設定する
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const fill = catItem?.querySelector(".category-progress-fill") as HTMLElement | null;
    const statsEl = catItem?.querySelector(".category-stats") as HTMLElement | null;

    expect(fill?.style.width).toBe("100%");
    expect(fill?.classList.contains("progress-fill-done")).toBe(true);
    expect(statsEl?.textContent).toBe("5/5");
  });
});
