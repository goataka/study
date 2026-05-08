/**
 * QuizApp プレゼンテーション層 — カテゴリリスト（学習状態フィルター/絵文字/学習済み/問題一覧）仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { setupTabDom, setupFetchMock, setupFetchMockWithParent, mockQuestionFile } from "./quizApp.testHelpers";

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

describe("QuizApp — カテゴリ学習状態絵文字仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態（未学習）では ⬜ が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("⬜");
  });

  it("学習済（全問題が masteredIds に含まれる）のカテゴリは ✅ が表示される", async () => {
    // 履歴に phonics-1 を登録（学習済）+ 全問題を masteredIds に設定
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
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("学習中（履歴あり・間違いあり）のカテゴリは 🔄 が表示される", async () => {
    // 履歴に phonics-1 を登録
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
    // 間違いあり（phonics-1 の問題IDを登録）
    localStorage.setItem("wrongQuestions", JSON.stringify(["q1"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]');
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("🔄");
  });
});

describe("QuizApp — 学習済みにするボタン仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時（総合タブ表示中）は「学習済みにする」ボタンが無効になっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(true);
  });

  it("特定カテゴリを選択すると「学習済みにする」ボタンが有効になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    expect(markLearnedBtn.disabled).toBe(false);
  });

  it("「学習済みにする」ボタンをクリックするとカテゴリが ✅ になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 学習済みになるので ✅ が表示される
    const statusEl = catItem?.querySelector(".category-status");
    expect(statusEl?.textContent).toBe("✅");
  });

  it("学習済みのカテゴリを選択するとボタンが「↩ 未学習に戻す」になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 学習済みになったのでボタンが「未学習に戻す」に変わる
    expect(markLearnedBtn.textContent).toBe("↩ 未学習に戻す");
  });

  it("「↩ 未学習に戻す」ボタンをクリックするとカテゴリが 🔄 に戻る", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const markLearnedBtn = document.getElementById("markLearnedBtn") as HTMLButtonElement;
    // 学習済みにする
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("✅");

    // 未学習に戻す
    markLearnedBtn.click();
    document.getElementById("confirmDialogOk")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(catItem?.querySelector(".category-status")?.textContent).toBe("🔄");
    expect(markLearnedBtn.textContent).toBe("✅ 学習済みにする");
  });
});

describe("QuizApp — 問題一覧タブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("「問題一覧」タブをクリックするとquestionListContentが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    expect(questionsTab?.classList.contains("active")).toBe(true);
    expect(questionsTab?.getAttribute("aria-selected")).toBe("true");
    expect(questionsTab?.getAttribute("tabindex")).toBe("0");

    const questionListContent = document.getElementById("questionListContent");
    expect(questionListContent?.classList.contains("hidden")).toBe(false);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(true);
  });

  it("「問題一覧」タブをクリックすると現在の単元の問題が一覧表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const items = document.querySelectorAll(".question-list-item");
    expect(items.length).toBe(5); // mockQuestionFile に5問あるため
  });

  it("問題一覧には問題・正解・ヒントが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const correctEls = document.querySelectorAll(".question-list-correct");
    expect(correctEls.length).toBe(5); // 5問それぞれに正解が1つある

    const hintEls = document.querySelectorAll(".question-list-hint");
    expect(hintEls.length).toBe(5); // 5問それぞれにヒントが1つある
  });

  it("問題一覧に第N問の表記がない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const numberEls = document.querySelectorAll(".question-list-number");
    expect(numberEls.length).toBe(0); // 第N問の要素が存在しないこと
  });

  it("問題一覧の正解はヒント内（question-list-hint）に表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const rows = document.querySelectorAll(".question-list-row");
    expect(rows.length).toBe(5); // 5問それぞれに1行ある

    rows.forEach((row) => {
      expect(row.querySelector(".question-list-text")).not.toBeNull();
      // 正解は行ではなくヒント内に移動した
      expect(row.querySelector(".question-list-correct")).toBeNull();
      expect(row.querySelector(".question-list-hint-btn")).not.toBeNull();
    });

    // 正解は hint 内に存在する
    const hints = document.querySelectorAll(".question-list-hint");
    hints.forEach((hint) => {
      expect(hint.querySelector(".question-list-correct")).not.toBeNull();
    });
  });

  it("ヒントはデフォルトで非表示で、💡ボタンを押すと表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const firstHint = document.querySelector(".question-list-hint") as HTMLElement;
    expect(firstHint.classList.contains("hidden")).toBe(true); // 初期状態では非表示

    const firstHintBtn = document.querySelector(".question-list-hint-btn") as HTMLElement;
    firstHintBtn.click();
    expect(firstHint.classList.contains("hidden")).toBe(false); // ボタン押下で表示

    firstHintBtn.click();
    expect(firstHint.classList.contains("hidden")).toBe(true); // もう一度押すと非表示に戻る
  });

  it("「確認」タブに戻るとquizModePanelが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]') as HTMLElement;
    quizTab?.click();

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(false);

    const questionListContent = document.getElementById("questionListContent");
    expect(questionListContent?.classList.contains("hidden")).toBe(true);
  });

  it("「学習済み」フィルターボタンをクリックすると学習済み問題のみ表示される", async () => {
    // 問題を習得済みにしてから確認
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q3"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    // 学習済みフィルターをクリック
    const learnedBtn = document.getElementById("questionListFilterLearned") as HTMLElement;
    learnedBtn?.click();

    const items = document.querySelectorAll(".question-list-item");
    // q1, q3 のみが学習済みなので2件
    expect(items.length).toBe(2);
    // アクティブボタンが切り替わること
    expect(learnedBtn?.classList.contains("active")).toBe(true);
    expect(document.getElementById("questionListFilterAll")?.classList.contains("active")).toBe(false);
  });

  it("「未学習」フィルターボタンをクリックすると未学習問題のみ表示される", async () => {
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q3"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    const unlearnedBtn = document.getElementById("questionListFilterUnlearned") as HTMLElement;
    unlearnedBtn?.click();

    const items = document.querySelectorAll(".question-list-item");
    // q2, q4, q5 が未学習なので3件
    expect(items.length).toBe(3);
    expect(unlearnedBtn?.classList.contains("active")).toBe(true);
  });

  it("「すべて」フィルターボタンをクリックすると全問題が再表示される", async () => {
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q3"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]') as HTMLElement;
    questionsTab?.click();

    // まず学習済みで絞り込む
    document.getElementById("questionListFilterLearned")?.click();
    expect(document.querySelectorAll(".question-list-item").length).toBe(2);

    // すべてに戻す
    const allBtn = document.getElementById("questionListFilterAll") as HTMLElement;
    allBtn?.click();
    expect(document.querySelectorAll(".question-list-item").length).toBe(5);
    expect(allBtn?.classList.contains("active")).toBe(true);
  });
});
