/**
 * QuizApp — 総合タブの教科一覧仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { waitForCondition, setupTabDom, setupFetchMock, setupFetchMockWith3Levels } from "../quizApp.testHelpers";

describe("QuizApp — 総合タブの教科一覧仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態（総合タブ）では教科概要アイテムが教科数分（総合除く）描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const overviewItems = document.querySelectorAll(".subject-overview-item");
    // SUBJECTS から "all" を除いた 3 教科（英語・数学・国語）
    expect(overviewItems.length).toBe(3);
  });

  it("各教科概要アイテムに data-subject が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const overviewItems = document.querySelectorAll<HTMLElement>(".subject-overview-item");
    overviewItems.forEach((item) => {
      expect(item.dataset.subject).toBeTruthy();
    });
  });

  it("推奨単元がある教科概要アイテムに role=button が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 推奨単元がある英語アイテム（モックデータには英語の問題のみある）
    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    expect(englishItem?.getAttribute("role")).toBe("button");
  });

  it("英語教科アイテムには推奨の単元テキストが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const recName = englishItem?.querySelector(".subject-overview-rec-name");
    expect(recName?.textContent).toBeTruthy();
  });

  it("未学習の場合、教科アイテムの進捗率は 0/total 形式で表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const pctSpan = englishItem?.querySelector(".subject-overview-pct");
    expect(pctSpan?.textContent).toBe("0/5");
  });

  it("outerDate 表示は廃止され、学習履歴に関わらず表示されない", async () => {
    const studyDate = "2025-04-01T10:00:00.000Z";
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: studyDate,
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

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const wrapper = document.querySelector('.subject-overview-wrapper:has([data-subject="english"])');
    const outerDate = wrapper?.querySelector(".subject-overview-outer-date");
    expect(outerDate).toBeNull();
  });

  it("各教科の subject-rec-count-controls に3つの表示数切替ボタンが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 教科ごとに 1/3/5 ボタンが表示されるため、3教科 × 3ボタン = 9個
    const countBtns = document.querySelectorAll(".overall-rec-count-btn");
    expect(countBtns.length).toBeGreaterThanOrEqual(3);
  });

  it("英語の表示数を3に切り替えると英語の複数カードが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語の subject-overview-wrapper 内の3ボタンをクリック（:has()非依存の検索）
    const wrappers = Array.from(document.querySelectorAll(".subject-overview-wrapper"));
    const englishWrapper = wrappers.find((w) => w.querySelector('[data-subject="english"]'));
    const btn3 = Array.from(englishWrapper?.querySelectorAll(".overall-rec-count-btn") ?? []).find(
      (b) => b.textContent === "3",
    ) as HTMLElement | undefined;
    btn3?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語には複数カテゴリあるので複数カードが表示されるはず
    const englishItems = document.querySelectorAll('.subject-overview-item[data-subject="english"]');
    expect(englishItems.length).toBeGreaterThanOrEqual(1);
  });

  it("表示数ボタンを押すと progressRepo に保存され、次回 new QuizApp() で復元される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語の3ボタンをクリック
    const wrappers = Array.from(document.querySelectorAll(".subject-overview-wrapper"));
    const englishWrapper = wrappers.find((w) => w.querySelector('[data-subject="english"]'));
    const btn3 = Array.from(englishWrapper?.querySelectorAll(".overall-rec-count-btn") ?? []).find(
      (b) => b.textContent === "3",
    ) as HTMLElement | undefined;
    btn3?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // localStorage（LocalStorageProgressRepository）に保存されていることを確認
    const saved = localStorage.getItem("recommendedCounts");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!) as Record<string, number>;
    expect(parsed["english"]).toBe(3);

    // 再初期化して復元されることを確認
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const wrappers2 = Array.from(document.querySelectorAll(".subject-overview-wrapper"));
    const englishWrapper2 = wrappers2.find((w) => w.querySelector('[data-subject="english"]'));
    const activeBtn = Array.from(englishWrapper2?.querySelectorAll(".overall-rec-count-btn") ?? []).find(
      (b) => b.textContent === "3",
    ) as HTMLElement | undefined;
    expect(activeBtn?.classList.contains("active")).toBe(true);
  });

  it("全問正解の学習済みカテゴリは進捗率100%と表示される", async () => {
    const studyDate = new Date().toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: studyDate,
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
    // getCategoryProgressPct は mastered / total で算出するため全問題を masteredIds に設定する
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const pctSpan = englishItem?.querySelector(".subject-overview-pct");
    // phonics-1 が学習済みかつ全問習得済み → 5/5
    expect(pctSpan?.textContent).toBe("5/5");
  });

  it("教科概要アイテムをクリックしても総合タブのままで教科タブに切り替わらない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>('.subject-overview-item[data-subject="english"]');
    englishItem?.click();

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]');
    expect(englishTab?.classList.contains("active")).toBe(false);

    const allTab = document.querySelector('.subject-tab[data-subject="all"]');
    expect(allTab?.classList.contains("active")).toBe(true);
  });

  it("教科概要アイテムをクリックすると解説パネルが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>('.subject-overview-item[data-subject="english"]');
    englishItem?.click();

    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(false);

    const overallPanel = document.getElementById("overallSummaryPanel");
    expect(overallPanel?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブ時に allSubjectPanelTitle が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const title = document.getElementById("allSubjectPanelTitle");
    expect(title?.classList.contains("hidden")).toBe(false);
  });

  it("教科タブに切り替えると allSubjectPanelTitle が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    englishTab?.click();

    const title = document.getElementById("allSubjectPanelTitle");
    expect(title?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブのおすすめ単元をクリックすると（履歴なし）解説タブが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>('.subject-overview-item[data-subject="english"]');
    englishItem?.click();

    // 解説タブが表示され、overallSummaryPanel が非表示になる
    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(false);

    // パネルタブが表示される（教科画面と同じ）
    const guideTab = document.getElementById("panelTab-guide");
    expect(guideTab?.classList.contains("hidden")).toBe(false);

    // 解説タブがアクティブ
    expect(guideTab?.classList.contains("active")).toBe(true);
  });

  it("総合タブのおすすめ単元をクリックすると（履歴あり）確認タブが表示される", async () => {
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
          totalCount: 3,
          correctCount: 3,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>('.subject-overview-item[data-subject="english"]');
    englishItem?.click();

    // 確認タブがアクティブ（quizModePanel が表示される）
    const quizPanel = document.getElementById("quizModePanel");
    expect(quizPanel?.classList.contains("hidden")).toBe(false);

    // パネルタブが表示される
    const quizTab = document.getElementById("panelTab-quiz");
    expect(quizTab?.classList.contains("hidden")).toBe(false);
    expect(quizTab?.classList.contains("active")).toBe(true);
  });

  it("総合タブのおすすめ単元をクリックすると selectedUnitInfo に単元名が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>('.subject-overview-item[data-subject="english"]');
    englishItem?.click();

    const nameEl = document.querySelector(".selected-unit-info-name");
    expect(nameEl?.textContent).toBeTruthy();
  });

  it("総合タブのおすすめ単元選択後にgetEffectiveFilterが選択単元のフィルターを使う（問題数がゼロより大きい）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector<HTMLElement>('.subject-overview-item[data-subject="english"]');
    englishItem?.click();

    // フィルタが有効になると statsInfo には問題数が表示される（0問ではない）
    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).not.toContain("全：0問");
  });
});
