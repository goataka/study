/**
 * QuizApp — 総合タブのサマリパネル仕様
 */

// @vitest-environment jsdom

import { QuizApp } from "../../quizApp";
import {
  waitForCondition,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWith3Levels,
  StubProgressRepository,
} from "../testHelpers";

describe("QuizApp — 総合タブのサマリパネル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
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
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
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
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = document.getElementById("todayActivityContent");
    expect(container?.textContent).toContain("8/10 (80%)");
  });

  it("todayActivityContent では category=all の当日記録も学習履歴として表示される", async () => {
    const today = new Date().toISOString();
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
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
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
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

  it("学習状況パネルに学習数（完了/目標）が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const count = document.getElementById("learningStatusCount");
    expect(count?.textContent).toContain("学習数");
    expect(count?.textContent).toContain("/5");
  });

  it("学習状況パネルで星表示が開始ボタンより前に描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stars = document.getElementById("learningStatusStars");
    const startBtn = document.getElementById("learningStatusStartBtn");
    expect(stars).not.toBeNull();
    expect(startBtn).not.toBeNull();
    expect(stars?.compareDocumentPosition(startBtn as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("開始するを押すと（未学習）解説タブが開く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("learningStatusStartBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideContent = document.getElementById("guideContent");
    const guideTab = document.getElementById("panelTab-guide");
    expect(guideContent?.classList.contains("hidden")).toBe(false);
    expect(guideTab?.classList.contains("active")).toBe(true);
  });

  it("開始するを押すと（学習済み）確認タブが開く", async () => {
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
        totalCount: 10,
        correctCount: 8,
        entries: [],
      },
    ]);
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("learningStatusStartBtn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizPanel = document.getElementById("quizModePanel");
    const quizTab = document.getElementById("panelTab-quiz");
    expect(quizPanel?.classList.contains("hidden")).toBe(false);
    expect(quizTab?.classList.contains("active")).toBe(true);
  });

  it("学習状況パネルにおすすめ先頭単元タイトルが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const firstTitle = document.getElementById("learningStatusFirstTitle");
    expect(firstTitle?.textContent).toContain("次のおすすめ：");
  });

  it("学習状況パネルに今日やった単元リストが表示される", async () => {
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
        totalCount: 10,
        correctCount: 8,
        entries: [],
      },
    ]);
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const todayList = document.getElementById("learningStatusTodayUnitsList");
    expect(todayList?.textContent).toContain("フォニックス（1文字）");
  });

  it("今日やった単元リストは manual 記録を含めない", async () => {
    const repo = new StubProgressRepository();
    const today = new Date().toISOString();
    repo.saveHistory([
      {
        id: "r1",
        date: today,
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "フォニックス（1文字）",
        mode: "manual",
        totalCount: 10,
        correctCount: 10,
        entries: [],
      },
      {
        id: "r2",
        date: today,
        subject: "english",
        subjectName: "英語",
        category: "phonics-2",
        categoryName: "フォニックス（2文字）",
        mode: "random",
        totalCount: 10,
        correctCount: 8,
        entries: [],
      },
    ]);
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const todayList = document.getElementById("learningStatusTodayUnitsList");
    expect(todayList?.textContent).not.toContain("フォニックス（1文字）");
    expect(todayList?.textContent).toContain("フォニックス（2文字）");
  });

  it("学習状況パネルの次のおすすめは右一覧の先頭おすすめ単元と一致する", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const firstTitle = document.getElementById("learningStatusFirstTitle");
    const firstRecommendedName = document.querySelector(".subject-overview-rec-name");
    expect(firstTitle?.textContent).toContain(firstRecommendedName?.textContent ?? "");
  });

  it("総合タブの学習状況サマリは履歴だけでなく進捗データで反映される", async () => {
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
        totalCount: 10,
        correctCount: 4,
        entries: [],
      },
    ]);
    repo.saveQuestionStats({ q1: { total: 1, correct: 1 } });

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const status = document.getElementById("overallSubjectStatusSummary");
    expect(status?.textContent).toContain("英語: 1/1単元");
  });

  it("進捗データがない履歴のみの単元は学習状況サマリで未学習として扱われる", async () => {
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
        totalCount: 10,
        correctCount: 4,
        entries: [],
      },
    ]);

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const status = document.getElementById("overallSubjectStatusSummary");
    expect(status?.textContent).toContain("英語: 0/1単元");
  });

  it("シェアテキストに教科・トップカテゴリ・親カテゴリ・単元名がパス形式で含まれる", async () => {
    setupFetchMockWith3Levels();

    const today = new Date().toISOString();
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
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
    const repo = new StubProgressRepository();
    repo.saveShareUrl("https://twitter.com");

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // URLをクリアして保存
    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "";
    document.getElementById("saveShareUrlBtn")?.click();

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("保存した共有URLが progressRepo に保存される", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "https://example.com/share";
    document.getElementById("saveShareUrlBtn")?.click();

    expect(repo.loadShareUrl()).toBe("https://example.com/share");
  });

  it("localhost に共有URLが保存されていれば初期表示時に openShareUrlBtn が表示される", async () => {
    const repo = new StubProgressRepository();
    repo.saveShareUrl("https://twitter.com");

    new QuizApp(repo);
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

  it("javascript: スキームの URL は progressRepo に保存されない", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const urlInput = document.getElementById("shareUrlInput") as HTMLInputElement;
    urlInput.value = "javascript:alert(1)";
    document.getElementById("saveShareUrlBtn")?.click();

    expect(repo.loadShareUrl()).toBe("");
  });

  it("localStorage に javascript: の URL が保存されていても初期表示時に openShareUrlBtn が非表示のままになる", async () => {
    const repo = new StubProgressRepository();
    repo.saveShareUrl("javascript:alert(1)");

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const openBtn = document.getElementById("openShareUrlBtn");
    expect(openBtn?.classList.contains("hidden")).toBe(true);
  });

  it("shareUrlDisplayBtn をクリックすると編集エリアが開き入力フィールドに現在のURLが設定される", async () => {
    const repo = new StubProgressRepository();
    repo.saveShareUrl("https://twitter.com");

    new QuizApp(repo);
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
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com/enter";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(repo.loadShareUrl()).toBe("https://example.com/enter");
  });

  it("共有URLのURLInputでEscapeキーを押すと保存せずに編集エリアが閉じ aria-expanded が false になる", async () => {
    const repo = new StubProgressRepository();
    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("shareUrlDisplayBtn")?.click();
    const input = document.getElementById("shareUrlInput") as HTMLInputElement;
    input.value = "https://example.com/escape";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    const displayBtn = document.getElementById("shareUrlDisplayBtn");
    expect(document.getElementById("shareUrlEditArea")?.classList.contains("hidden")).toBe(true);
    expect(displayBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(repo.loadShareUrl()).toBe("");
  });

  it("openShareUrlBtn をクリックすると window.open が正しい引数で呼ばれる", async () => {
    const repo = new StubProgressRepository();
    repo.saveShareUrl("https://twitter.com");

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    new QuizApp(repo);
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

  it("category='all' の当日記録は学習数（⭐）にカウントされない", async () => {
    const today = new Date().toISOString();
    const repo = new StubProgressRepository();
    repo.saveHistory([
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
    ]);

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const label = document.getElementById("overallActivityDateLabel");
    // category="all" は集計用カテゴリなので学習数にはカウントしない
    expect(label?.textContent).toBe("学習数：");
  });

  it("存在しないカテゴリ（total===0）の当日記録は学習数（⭐）にカウントされない", async () => {
    const today = new Date().toISOString();
    const repo = new StubProgressRepository();
    repo.saveHistory([
      {
        id: "r1",
        date: today,
        subject: "english",
        subjectName: "英語",
        category: "nonexistent-category",
        categoryName: "存在しないカテゴリ",
        mode: "random",
        totalCount: 10,
        correctCount: 9,
        entries: [],
      },
    ]);

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const label = document.getElementById("overallActivityDateLabel");
    // 問題数 0 のカテゴリ（削除済み等）は学習数にカウントしない
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
