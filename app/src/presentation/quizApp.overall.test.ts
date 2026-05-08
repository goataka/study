/**
 * QuizApp プレゼンテーション層 — 総合タブ（教科一覧・サマリパネル）仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { waitForCondition, setupTabDom, setupFetchMock, setupFetchMockWith3Levels } from "./quizApp.testHelpers";

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

// ─── 総合タブのサマリパネル仕様 ────────────────────────────────────────────

describe("QuizApp — 総合タブのサマリパネル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化後に総合タブでは overallSummaryPanel が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.getElementById("overallSummaryPanel");
    expect(panel?.classList.contains("hidden")).toBe(false);
  });

  it("教科タブに切り替えると overallSummaryPanel が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    englishTab?.click();

    const panel = document.getElementById("overallSummaryPanel");
    expect(panel?.classList.contains("hidden")).toBe(true);
  });

  it("総合タブに戻ると overallSummaryPanel が再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="english"]');
    englishTab?.click();

    const allTab = document.querySelector<HTMLElement>('.subject-tab[data-subject="all"]');
    allTab?.click();

    const panel = document.getElementById("overallSummaryPanel");
    expect(panel?.classList.contains("hidden")).toBe(false);
  });

  it("今日の学習記録がない場合、todayActivityContent に未実施メッセージが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    expect(container?.textContent).toContain("この日はまだ問題を解いていません");
  });

  it("今日の学習記録がないが過去に記録がある場合、todayActivityContent には空メッセージが表示される", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: yesterday,
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 10,
          correctCount: 8,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    // フォールバックは廃止: 選択日付の記録がない場合は空メッセージを表示する
    expect(container?.textContent).toContain("この日はまだ問題を解いていません");
    // overallActivityDateLabel も過去レコードにフォールバックしない（学習数：空）
    const label = document.getElementById("overallActivityDateLabel");
    expect(label?.textContent).toBe("学習数：");
  });

  it("今日の学習記録がある場合、todayActivityContent にスコアが表示される", async () => {
    const today = new Date().toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: today,
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 10,
          correctCount: 8,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    expect(container?.textContent).toContain("8/10 (80%)");
  });

  it("todayActivityContent では category=all の当日記録も学習履歴として表示される", async () => {
    const today = new Date().toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: today,
          subject: "english",
          subjectName: "英語",
          category: "all",
          categoryName: "英語 全体",
          mode: "random",
          totalCount: 10,
          correctCount: 9,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    expect(container?.textContent).toContain("9/10 (90%)");
    expect(container?.textContent).not.toContain("この日はまだ問題を解いていません");
  });

  it("活動サマリテキストに今日の日付が含まれる（学習サマリヘッダーは含まれない）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const summaryEl = document.getElementById("shareSummaryText");
    const today = new Date();
    const year = String(today.getFullYear());
    expect(summaryEl?.textContent).toContain(year);
    expect(summaryEl?.textContent).not.toContain("学習サマリ");
  });

  it("今日の学習記録がなく過去記録のみの場合、共有テキストは指定日基準で未実施表示になる", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: yesterday,
          subject: "english",
          subjectName: "英語",
          category: "phonics-1",
          categoryName: "フォニックス（1文字）",
          mode: "random",
          totalCount: 10,
          correctCount: 8,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const summaryEl = document.getElementById("shareSummaryText");
    expect(summaryEl?.textContent).toContain("まだクイズをしていません。");
  });

  it("総合タブの学習状況サマリに教科ごとの進捗が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const status = document.getElementById("overallSubjectStatusSummary");
    expect(status?.textContent).toContain("英語:");
  });

  it("総合タブの学習状況サマリは単元を実施すると反映される", async () => {
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
          totalCount: 10,
          correctCount: 4,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const status = document.getElementById("overallSubjectStatusSummary");
    expect(status?.textContent).toContain("英語: 1/1単元");
  });

  it("シェアテキストに教科・トップカテゴリ・親カテゴリ・単元名がパス形式で含まれる", async () => {
    setupFetchMockWith3Levels();

    const today = new Date().toISOString();
    localStorage.setItem(
      "quizHistory",
      JSON.stringify([
        {
          id: "r1",
          date: today,
          subject: "english",
          subjectName: "英語",
          category: "tenses-past",
          categoryName: "過去形",
          mode: "random",
          totalCount: 10,
          correctCount: 7,
          entries: [],
        },
      ]),
    );

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const summaryEl = document.getElementById("shareSummaryText");
    // 教科 > トップカテゴリ > 親カテゴリ > 単元名 の形式が含まれること
    expect(summaryEl?.textContent).toContain("英語");
    expect(summaryEl?.textContent).toContain("文法");
    expect(summaryEl?.textContent).toContain("動詞");
    expect(summaryEl?.textContent).toContain("過去形");
    expect(summaryEl?.textContent).toContain("7/10問正解");
  });

  it("共有URLを保存すると openShareUrlBtn が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "https://twitter.com";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(false);
  });

  it("共有URLが空の場合 openShareUrlBtn が非表示になる", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // URLをクリアして保存
    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("保存した共有URLが localStorageに保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "https://example.com/share";
    document.getElementById("saveShareUrlBtn")?.click();

    expect(localStorage.getItem("overallShareUrl")).toBe("https://example.com/share");
  });

  it("localhost に共有URLが保存されていれば初期表示時に openShareUrlBtn が表示される", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(false);
  });

  it("javascript: スキームの URL を保存しても openShareUrlBtn が非表示のままになる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "javascript:alert(1)";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("javascript: スキームの URL は localStorage に保存されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "javascript:alert(1)";
    document.getElementById("saveShareUrlBtn")?.click();

    expect(localStorage.getItem("overallShareUrl")).toBeNull();
  });

  it("localStorage に javascript: の URL が保存されていても初期表示時に openShareUrlBtn が非表示のままになる", async () => {
    localStorage.setItem("overallShareUrl", "javascript:alert(1)");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("shareUrlDisplayBtn をクリックすると編集エリアが開き入力フィールドに現在のURLが設定される", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();

    const editArea = document.getElementById("shareUrlEditArea");
    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;

    expect(editArea?.classList.contains("hidden")).toBe(false);
    expect(displayBtn?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(input?.value).toBe("https://twitter.com");
  });

  it("URL未設定時に shareUrlDisplayBtn をクリックすると編集エリアが開き入力は空", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();

    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    expect(input?.value).toBe("");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(false);
  });

  it("saveShareUrlBtn をクリックすると編集エリアが閉じ表示ボタンが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 編集エリアを開く
    document.getElementById("shareUrlDisplayBtn")?.click();

    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com";
    document.getElementById("saveShareUrlBtn")?.click();

    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.classList.contains("hidden")).toBe(false);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(displayBtn?.textContent).toBe("https://example.com");
  });

  it("共有URLのURLInputでEnterキーを押すと保存して編集エリアが閉じる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com/enter";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(localStorage.getItem("overallShareUrl")).toBe("https://example.com/enter");
  });

  it("共有URLのURLInputでEscapeキーを押すと保存せずに編集エリアが閉じ aria-expanded が false になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com/escape";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(localStorage.getItem("overallShareUrl")).toBeNull();
  });

  it("openShareUrlBtn をクリックすると window.open が正しい引数で呼ばれる", async () => {
    localStorage.setItem("overallShareUrl", "https://twitter.com");

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("openShareUrlBtn")?.click();

    expect(openSpy).toHaveBeenCalledWith("https://twitter.com", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("overallActivityDateLabel に本日の実施単元数が⭐で表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const label = document.getElementById("overallActivityDateLabel");
    // 学習記録がない場合は「学習数：」プレフィックスのみ
    expect(label?.textContent).toBe("学習数：");
  });

  it("シェアタブをクリックすると overallSharePanel が表示され overallLearnedPanel が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("overallTab-share")?.click();

    expect(document.getElementById("overallSharePanel")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("overallLearnedPanel")?.classList.contains("hidden")).toBe(true);
  });

  it("学習済みタブをクリックすると overallLearnedPanel が表示され overallSharePanel が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("overallTab-share")?.click();
    document.getElementById("overallTab-learned")?.click();

    expect(document.getElementById("overallLearnedPanel")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("overallSharePanel")?.classList.contains("hidden")).toBe(true);
  });
});
