/**
 * QuizApp — 総合タブの教科一覧仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import {
  StubProgressRepository,
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
} from "../testHelpers";

describe("QuizApp — 総合タブの教科一覧仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態（総合タブ）では教科概要アイテムが1件以上描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const overviewItems = document.querySelectorAll(".subject-overview-item");
    // グローバルおすすめリストとして少なくとも1件の単元が表示される
    expect(overviewItems.length).toBeGreaterThanOrEqual(1);
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

  it("おすすめ単元カードに教科名ラベルが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const subjectLabel = englishItem?.querySelector(".subject-overview-subject");
    expect(subjectLabel?.textContent).toBe("英語");
  });

  it("未学習の場合、教科アイテムの進捗率は表示されない（学習後のみ表示）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishItem = document.querySelector('.subject-overview-item[data-subject="english"]');
    const pctSpan = englishItem?.querySelector(".subject-overview-pct");
    // mastered=0 かつ inProgress=0 の場合は進捗テキストを表示しない
    expect(pctSpan).toBeNull();
  });

  it("グローバル目標数ボタンが表示される（3/5/8/13/21）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // グローバル目標数の 5 つのボタン（3/5/8/13/21）が表示される
    const countBtns = document.querySelectorAll(".overall-rec-count-btn");
    expect(countBtns.length).toBeGreaterThanOrEqual(5);
  });

  it("目標数ボタンで切り替えると英語の表示カードが更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 目標数を 3 に切り替え
    const btn3 = Array.from(document.querySelectorAll(".overall-rec-count-btn")).find((b) => b.textContent === "3") as
      | HTMLElement
      | undefined;
    btn3?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語には複数カテゴリあるので英語アイテムが表示されるはず
    const englishItems = document.querySelectorAll('.subject-overview-item[data-subject="english"]');
    expect(englishItems.length).toBeGreaterThanOrEqual(1);
  });

  it("目標数ボタンを押すと progressRepo に保存され、次回 new QuizApp() で復元される", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // グローバル目標数の5ボタンをクリック（現在のデフォルトは5なので、8をクリックしてみる）
    const countBtns = Array.from(document.querySelectorAll(".overall-rec-count-btn"));
    const btn8 = countBtns.find((b) => b.textContent === "8") as HTMLElement | undefined;
    btn8?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // progressRepo に globalRecommendedCount として保存されていることを確認
    const saved = repo.loadGlobalRecommendedCount();
    expect(saved).toBe(8);

    // 再初期化して復元されることを確認（同じ repo を渡す）
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const countBtns2 = Array.from(document.querySelectorAll(".overall-rec-count-btn"));
    const activeBtn8 = countBtns2.find((b) => b.textContent === "8") as HTMLElement | undefined;
    expect(activeBtn8?.classList.contains("active")).toBe(true);
  });

  it("全問正解の学習済みカテゴリは進捗率100%と表示される", async () => {
    const studyDate = new Date().toISOString();
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);
    // getCategoryProgressPct は mastered / total で算出するため全問題を masteredIds に設定する
    repo.saveMasteredIds(["q1", "q2", "q3", "q4", "q5"]);

    new QuizApp(repo);
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
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
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
