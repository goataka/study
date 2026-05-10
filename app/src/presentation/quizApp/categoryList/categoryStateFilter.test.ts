/**
 * QuizApp — カテゴリ学習状態フィルター仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import { setupTabDom, setupFetchMock, setupFetchMockWithParent } from "../testHelpers";

describe("QuizApp — カテゴリ学習状態フィルター仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態ではcategoryListにフィルタークラスが付与されていない（すべて表示）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("filter-unlearned")).toBe(false);
    expect(categoryList?.classList.contains("filter-studying")).toBe(false);
    expect(categoryList?.classList.contains("filter-learned")).toBe(false);
    // hide-learned クラスも付与されていないこと（バグ修正の回帰防止）
    expect(categoryList?.classList.contains("hide-learned")).toBe(false);
  });

  it("「すべて」フィルター選択時に hide-learned クラスが付与されず学習済みカテゴリが表示対象になる", async () => {
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
          entries: [],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    // ✅ が表示されるには全問題が masteredIds に含まれる必要がある
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 「すべて」フィルターを選択
    document.getElementById("filterStatusAll")?.click();

    const categoryList = document.getElementById("categoryList");
    // hide-learned クラスが付与されないこと
    expect(categoryList?.classList.contains("hide-learned")).toBe(false);

    // 学習済みカテゴリが .learned クラスを持ち、DOM上に存在すること
    const learnedItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(learnedItem?.classList.contains("learned")).toBe(true);
  });

  it("「学習済」ボタンをクリックするとcategoryListにfilter-learnedクラスが付与される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("filterStatusLearned") as HTMLElement;
    btn?.click();

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("filter-learned")).toBe(true);
  });

  it("「未学習」ボタンをクリックするとcategoryListにfilter-unlearnedクラスが付与される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("filterStatusUnlearned") as HTMLElement;
    btn?.click();

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("filter-unlearned")).toBe(true);
  });

  it("「学習中」ボタンをクリックするとcategoryListにfilter-studyingクラスが付与される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("filterStatusStudying") as HTMLElement;
    btn?.click();

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("filter-studying")).toBe(true);
  });

  it("「学習済」を選択後「すべて」ボタンをクリックするとフィルタークラスが解除される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("filterStatusLearned")?.click();
    document.getElementById("filterStatusAll")?.click();

    const categoryList = document.getElementById("categoryList");
    expect(categoryList?.classList.contains("filter-learned")).toBe(false);
  });

  it("「学習済」ボタン選択時にactiveクラスが付与される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("filterStatusLearned") as HTMLElement;
    btn?.click();

    expect(btn?.classList.contains("active")).toBe(true);
    expect(document.getElementById("filterStatusAll")?.classList.contains("active")).toBe(false);
    // aria-pressed も更新される
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
    expect(document.getElementById("filterStatusAll")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("学習済カテゴリ（全問題が masteredIds に含まれる）にはlearnedクラスが付与される", async () => {
    // 全問題が masteredIds に含まれる場合に learned クラスが付与される
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
          entries: [],
        },
      ]),
    );
    // 間違いなし・全問題習得済み
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.classList.contains("learned")).toBe(true);
  });

  it("学習中（履歴あり・間違いあり）のカテゴリにはlearnedクラスが付与されない", async () => {
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
          correctCount: 3,
          entries: [],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify(["q1"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    expect(catItem?.classList.contains("learned")).toBe(false);
  });

  it("filter-learned フィルター適用時、learnedクラスを持つカテゴリが表示対象となる", async () => {
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
          entries: [],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    // ✅（learned）には全問題が masteredIds に含まれる必要がある
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブを選択してカテゴリを表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    document.getElementById("filterStatusLearned")?.click();

    const categoryList = document.getElementById("categoryList");
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');

    // filter-learned クラスが付与され、learned なカテゴリが表示対象
    expect(categoryList?.classList.contains("filter-learned")).toBe(true);
    expect(catItem?.classList.contains("learned")).toBe(true);
  });

  it("quizHistoryが空でもmasteredIdsに全問題が含まれる場合、learnedクラスが付与される", async () => {
    // クイズ未実施（履歴なし）でも、全問題を手動で学習済みにした場合に learned 扱いになること
    localStorage.setItem("quizHistory", JSON.stringify([]));
    localStorage.setItem("wrongQuestions", JSON.stringify([]));
    // mockQuestionFile は 5問（q1〜q5）
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');

    // 履歴なし・不正解なしでも masteredIds が全問分あれば learned クラスが付与される
    expect(catItem?.classList.contains("learned")).toBe(true);
    // 絵文字も✅になること
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("未学習フィルター時、グループヘッダーのバッジは常に空（トロフィー機能廃止）", async () => {
    setupFetchMockWithParent();
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
          totalCount: 4,
          correctCount: 4,
          entries: [],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 未学習フィルターを選択
    document.getElementById("filterStatusUnlearned")?.click();

    // バッジ要素は存在するが常に空（トロフィー表示機能は廃止済み）
    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const badge = phonicsHeader?.querySelector(".category-group-learned-badge");
    expect(badge?.textContent).toBe("");
  });

  it("すべて表示フィルターに戻してもグループヘッダーのバッジは空のまま", async () => {
    setupFetchMockWithParent();
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
          totalCount: 4,
          correctCount: 4,
          entries: [],
        },
      ]),
    );
    localStorage.setItem("wrongQuestions", JSON.stringify([]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // すべて表示に切り替える（バッジは常に空）
    document.getElementById("filterStatusAll")?.click();

    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const badge = phonicsHeader?.querySelector(".category-group-learned-badge");
    expect(badge?.textContent).toBe("");
  });
});
