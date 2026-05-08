/**
 * QuizApp プレゼンテーション層 — 解説/インナーパネルタブ仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { waitForCondition, setupMinimalDom, setupTabDom, setupFetchMock } from "./quizApp.testHelpers";

describe("QuizApp — 解説パネルタブ仕様", () => {
  /** guideUrl ありの問題ファイル */
  const mockManifestForGuide = {
    version: "2.0.0",
    subjects: { english: { name: "英語" } },
    questionFiles: ["english/alphabet.json"],
  };

  const mockQuestionFileWithGuide = {
    subject: "english",
    subjectName: "英語",
    category: "alphabet",
    categoryName: "アルファベット",
    guideUrl: "../english/pronunciation/01-alphabet/guide",
    questions: Array.from({ length: 5 }, (_, i) => ({
      id: `qa${i + 1}`,
      question: `問題 ${i + 1}`,
      choices: ["ア", "イ", "ウ", "エ"],
      correct: 0,
      explanation: `解説 ${i + 1}`,
    })),
  };

  /** guideUrl なしの問題ファイル */
  const mockQuestionFileWithoutGuide = {
    subject: "english",
    subjectName: "英語",
    category: "phonics-1",
    categoryName: "フォニックス（1文字）",
    questions: Array.from({ length: 5 }, (_, i) => ({
      id: `qp${i + 1}`,
      question: `問題 ${i + 1}`,
      choices: ["ア", "イ", "ウ", "エ"],
      correct: 0,
      explanation: `解説 ${i + 1}`,
    })),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("問題タブが問題一覧タブと履歴タブの間に存在する", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = Array.from(document.querySelectorAll(".panel-tab"));
    const quizIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "quiz");
    const guideIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "guide");
    const historyIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "history");
    const questionsIdx = tabs.findIndex((t) => (t as HTMLElement).dataset.panel === "questions");
    expect(guideIdx).toBeGreaterThanOrEqual(0);
    expect(questionsIdx).toBeGreaterThanOrEqual(0);
    expect(quizIdx).toBeGreaterThanOrEqual(0);
    expect(historyIdx).toBeGreaterThanOrEqual(0);
    expect(questionsIdx).toBeGreaterThan(guideIdx);
    expect(quizIdx).toBeGreaterThan(questionsIdx);
    expect(historyIdx).toBeGreaterThan(quizIdx);
  });

  it("guideUrl ありのカテゴリで解説タブをクリックすると解説コンテナに URL がロードされる", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      if (urlStr.includes("01-alphabet/guide")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("<html><head></head><body><main><p>解説内容</p></main></body></html>"),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]') as HTMLElement;
    guideTab?.click();

    await waitForCondition(() => !!document.getElementById("guidePanelFrame")?.dataset.loadedUrl);
    const guideFrame = document.getElementById("guidePanelFrame");
    expect(guideFrame).not.toBeNull();
    expect(guideFrame?.dataset.loadedUrl).toContain("guide");
    expect(guideFrame?.classList.contains("hidden")).toBe(false);

    const noContent = document.getElementById("guideNoContent");
    expect(noContent?.classList.contains("hidden")).toBe(true);
  });

  it("guideUrl なしのカテゴリで解説タブをクリックすると「解説なし」メッセージが表示される", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithoutGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]') as HTMLElement;
    guideTab?.click();

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLIFrameElement;
    expect(guideFrame.classList.contains("hidden")).toBe(true);

    const noContent = document.getElementById("guideNoContent");
    expect(noContent?.classList.contains("hidden")).toBe(false);
  });

  it("「This site is open source」を含む div でもコンテンツ構造（h2 等）を含む場合は除去されない", async () => {
    setupTabDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      if (urlStr.includes("01-alphabet/guide")) {
        // コンテンツ構造を持つ div の中に "This site is open source" が存在するケース
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`<html><head></head><body>
            <div class="content-wrapper">
              <h2>解説タイトル</h2>
              <p>メイン解説テキスト This site is open source Improve this page</p>
              <ul><li>項目1</li></ul>
            </div>
            <p>This site is open source. Improve this page.</p>
          </body></html>`),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]') as HTMLElement;
    guideTab?.click();

    await waitForCondition(() => !!document.getElementById("guidePanelFrame")?.dataset.loadedUrl);
    const guideFrame = document.getElementById("guidePanelFrame");
    // コンテンツ構造（h2）を含む div は除去されないこと
    expect(guideFrame?.innerHTML).toContain("解説タイトル");
    // コンテンツ構造を持たない p タグは除去されること
    expect(guideFrame?.querySelector(".guide-content")?.innerHTML ?? "").not.toContain(
      "This site is open source. Improve this page.",
    );
  });

  it("クイズ画面に #guideLink が存在しない", async () => {
    setupMinimalDom();
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestForGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFileWithGuide) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const guideLink = document.getElementById("guideLink");
    expect(guideLink).toBeNull();
  });
});

describe("QuizApp — パネルインナータブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("パネルに「確認」と「解説」と「履歴」と「問題一覧」のインナータブが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]');
    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]');
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]');
    const questionsTab = document.querySelector('.panel-tab[data-panel="questions"]');
    expect(quizTab).not.toBeNull();
    expect(quizTab?.textContent).toContain("確認");
    expect(guideTab).not.toBeNull();
    expect(guideTab?.textContent).toContain("解説");
    expect(historyTab).not.toBeNull();
    expect(historyTab?.textContent).toContain("履歴");
    expect(questionsTab).not.toBeNull();
    expect(questionsTab?.textContent).toContain("問題");
  });

  it("「履歴」インナータブをクリックするとhistoryContentが表示されquizModePanelが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    expect(historyTab?.classList.contains("active")).toBe(true);
    expect(historyTab?.getAttribute("aria-selected")).toBe("true");

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(false);

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(true);

    // subjectContentは常に表示される
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("hidden")).toBe(false);
  });

  it("履歴がないとき「履歴」タブをクリックすると空メッセージが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const historyList = document.getElementById("historyList");
    expect(historyList?.querySelector(".history-empty")).not.toBeNull();
  });

  it("履歴は新しい実施日時の順に表示される", async () => {
    const records = [
      {
        id: "old",
        date: "2026-01-01T00:00:00.000Z",
        subject: "english",
        subjectName: "英語",
        category: "phonics-1",
        categoryName: "古い単元",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "new",
        date: "2026-01-02T00:00:00.000Z",
        subject: "english",
        subjectName: "英語",
        category: "phonics-2",
        categoryName: "新しい単元",
        mode: "random",
        totalCount: 5,
        correctCount: 4,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const subjects = document.querySelectorAll(".history-subject");
    expect(subjects[0]?.textContent).toContain("新しい単元");
  });

  it("「確認」インナータブをクリックするとquizModePanelが再び表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 履歴タブを開く
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    // 確認タブに戻る
    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]') as HTMLElement;
    quizTab?.click();

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(false);

    const historyContent = document.getElementById("historyContent");
    expect(historyContent?.classList.contains("hidden")).toBe(true);
  });

  it("教科タブを選択すると選択した教科の記録のみ表示される", async () => {
    // 英語と数学の両方の記録をlocalStorageに追加
    const records = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "math",
        subjectName: "数学",
        category: "all",
        categoryName: "数学 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 4,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリック（デフォルトで英語が選択されているが明示的にクリック）
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // 英語の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("数学タブを選択すると数学の記録のみ表示される", async () => {
    // 英語と数学の両方の記録をlocalStorageに追加
    const records = [
      {
        id: "r1",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 3,
        entries: [],
      },
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "math",
        subjectName: "数学",
        category: "all",
        categoryName: "数学 全体",
        mode: "random",
        totalCount: 5,
        correctCount: 4,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 数学タブをクリック
    const mathTab = document.querySelector('.subject-tab[data-subject="math"]') as HTMLElement;
    mathTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // 数学の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("単元を選択するとその単元の記録のみ表示される", async () => {
    // 同じ教科で異なる単元の記録を用意
    const records = [
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
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 10,
        correctCount: 7,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリ一覧を表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 カテゴリアイテムをクリック（renderCategoryList で生成される）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // phonics-1 の記録のみ表示される
    expect(items?.length).toBe(1);
  });

  it("単元選択後に履歴タブを開いてもその単元の記録のみ表示される", async () => {
    // 同じ教科で異なる単元の記録を用意
    const records = [
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
      {
        id: "r2",
        date: new Date().toISOString(),
        subject: "english",
        subjectName: "英語",
        category: "all",
        categoryName: "英語 全体",
        mode: "random",
        totalCount: 10,
        correctCount: 7,
        entries: [],
      },
    ];
    localStorage.setItem("quizHistory", JSON.stringify(records));

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリ一覧を表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 カテゴリアイテムをクリック
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    // 履歴タブをクリック
    const historyTab = document.querySelector('.panel-tab[data-panel="history"]') as HTMLElement;
    historyTab?.click();

    const historyList = document.getElementById("historyList");
    const items = historyList?.querySelectorAll(".history-item");
    // phonics-1 の記録のみ表示される
    expect(items?.length).toBe(1);
  });
});

describe("QuizApp — 単元選択時の初期パネルタブ自動選択仕様", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/"); // URL を確実にリセット
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/"); // URL をリセット
  });

  it("単元をクリックしてもパネルタブは変わらない（前回タブを引き継ぐ）", async () => {
    // 総合タブではなく英語タブから開始し、かつ selectFirstUnlearnedCategory をスキップする
    // ことで autoSwitchedToHistory=false の状態を作る
    // （?category=all とすることで selectFirstUnlearnedCategory が URL category を検出してスキップ）
    window.history.pushState({}, "", "?subject=english&category=all");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 初期タブを確認する（履歴なし・単元未選択のため quiz タブが有効なはず）
    const initialActiveTab = document.querySelector(".panel-tab.active");
    const initialTabName = initialActiveTab?.getAttribute("data-panel") ?? "";

    // phonics-1 をクリック（履歴なし、総合タブからの自動復帰なし）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    // 前回のタブが引き継がれること（解説タブに戻さない）
    const activeTab = document.querySelector(".panel-tab.active");
    expect(activeTab?.getAttribute("data-panel")).toBe(initialTabName);
  });

  it("解答履歴がある単元をクリックすると確認タブが表示される", async () => {
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

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリ一覧を表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // phonics-1 をクリック（履歴あり）
    const categoryItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    categoryItem?.click();

    const quizTab = document.querySelector('.panel-tab[data-panel="quiz"]');
    expect(quizTab?.classList.contains("active")).toBe(true);
    expect(quizTab?.getAttribute("aria-selected")).toBe("true");

    const quizModePanel = document.getElementById("quizModePanel");
    expect(quizModePanel?.classList.contains("hidden")).toBe(false);

    const guideContent = document.getElementById("guideContent");
    expect(guideContent?.classList.contains("hidden")).toBe(true);
  });
});
