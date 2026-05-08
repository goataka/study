/**
 * QuizApp プレゼンテーション層 — 仕様テスト
 *
 * UI コントローラーとしての QuizApp の仕様を記述します。
 * DOM 操作を伴うためjsdom環境で実行します。
 * フルワークフローのE2Eテストは e2e/features/quiz.feature で管理します。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import {
  kanjiCanvasMock,
  waitForCondition,
  setupMinimalDom,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWithParent,
  setupFetchMockWith3Levels,
  mockManifest,
  mockQuestionFile,
  mockManifestWithParent,
  mockGrammarFile,
  mockPhonicsFile,
  mockManifestWith3Levels,
  mockTensesFile,
  mockAssimilationFile,
} from "./quizApp.testHelpers";

// ─── テスト ──────────────────────────────────────────────────────────────────

describe("QuizApp — 初期化仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("DOM が揃っていればエラーなしでインスタンス化できる", () => {
    expect(() => new QuizApp()).not.toThrow();
  });

  it("初期状態では「間違えた問題」ボタンが無効化されている", () => {
    new QuizApp();
    const retryBtn = document.getElementById("startRetryBtn") as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();
    // 初期値は disabled（問題ロード前）
    expect(retryBtn.disabled).toBe(true);
  });
});

describe("QuizApp — URLフラグメント連動仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("URLフラグメントで単元と表示パネルを指定して初期表示できる", async () => {
    window.history.replaceState({}, "", "/#subject=english&category=phonics-1&panel=guide");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeSubject = document.querySelector('.subject-tab.active[data-subject="english"]');
    const activeCategory = document.querySelector('.category-item.active[data-category="phonics-1"]');
    const activePanel = document.querySelector('.panel-tab.active[data-panel="guide"]');
    expect(activeSubject).not.toBeNull();
    expect(activeCategory).not.toBeNull();
    expect(activePanel).not.toBeNull();
  });

  it("URLフラグメントのpanelが不正値でも既定の表示タブを維持する", async () => {
    window.history.replaceState({}, "", "/#subject=english&category=all&panel=invalid");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activePanel = document.querySelector(".panel-tab.active");
    expect(activePanel?.getAttribute("data-panel")).toBe("quiz");
  });
});

describe("QuizApp — 問題ロード後の仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("問題のロードが完了したら statsInfo に問題数が表示される", async () => {
    new QuizApp();
    // init() は非同期なので Promiseのキューが流れるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：5問");
  });
});

describe("QuizApp — 教科タブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("問題ロード後にタブに教科（おすすめ・進度・英語・数学・国語・管理）が6件描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab[data-subject]");
    expect(tabs.length).toBe(6);
  });

  it("問題ロード後に英語タブに role=tab が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab");
    tabs.forEach((tab) => {
      expect(tab.getAttribute("role")).toBe("tab");
    });
  });

  it("初期状態では「おすすめ」タブがアクティブになっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const allTab = document.querySelector('.subject-tab[data-subject="all"]');
    expect(allTab?.classList.contains("active")).toBe(true);
    expect(allTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("英語タブをクリックすると statsInfo が英語の問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：5問");
  });

  it("英語タブをクリックするとアクティブタブが切り替わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    expect(englishTab?.classList.contains("active")).toBe(true);
    expect(englishTab?.getAttribute("aria-selected")).toBe("true");

    const mathTab = document.querySelector('.subject-tab[data-subject="math"]');
    expect(mathTab).not.toBeNull();
    expect(mathTab!.classList.contains("active")).toBe(false);
    expect(mathTab!.getAttribute("aria-selected")).toBe("false");
  });

  it("英語タブをクリックするとカテゴリリストが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // mockQuestionFile は phonics-1 のみなのでカテゴリアイテムが描画されるはず
    const categoryItems = document.querySelectorAll(".category-item[data-category]");
    expect(categoryItems.length).toBeGreaterThan(0);
  });

  it("カテゴリアイテムをクリックすると statsInfo がそのカテゴリの問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリックしてカテゴリを表示
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：5問");
  });

  it("カテゴリアイテムに role=button と tabindex=0 が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const items = document.querySelectorAll(".category-item");
    items.forEach((item) => {
      expect(item.getAttribute("role")).toBe("button");
      expect(item.getAttribute("tabindex")).toBe("0");
    });
  });

  it("教科タブに .tab-stats 要素が描画されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabs = document.querySelectorAll(".subject-tab");
    tabs.forEach((tab) => {
      expect(tab.querySelector(".tab-stats")).toBeNull();
    });
  });
});

describe("QuizApp — 回答フィードバック仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** クイズを開始して問題が描画されるまで待つ */
  async function startQuiz(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    startBtn.click();
  }

  it("未回答の問題ではフィードバック領域が非表示になっている", async () => {
    await startQuiz();
    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(true);
  });

  it("回答を選択するとフィードバック領域が表示される", async () => {
    await startQuiz();
    const firstRadio = document.querySelector<HTMLInputElement>('input[name="answer"]');
    firstRadio?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(false);
  });

  it("正解を選択すると correct クラスが付与される", async () => {
    await startQuiz();
    // 正解の選択肢テキスト「ア」を持つラベル内のラジオボタンをクリックする
    // （選択肢はシャッフルされるため、テキストで特定する）
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const correctLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent === "ア");
    correctLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("correct")).toBe(true);
    expect(feedback?.classList.contains("incorrect")).toBe(false);
  });

  it("不正解を選択すると incorrect クラスが付与される", async () => {
    await startQuiz();
    // 不正解の選択肢テキスト（「ア」以外）を持つラベル内のラジオボタンをクリックする
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const wrongLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent !== "ア");
    wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("incorrect")).toBe(true);
    expect(feedback?.classList.contains("correct")).toBe(false);
  });

  it("回答後に次の問題へ移動するとフィードバックが非表示になる", async () => {
    await startQuiz();
    // 1問目に回答
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="answer"]');
    radios[0]?.click();

    // 次へ移動
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    nextBtn.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(true);
  });

  it("回答済みの問題に戻るとフィードバックが再表示される", async () => {
    await startQuiz();
    // 1問目に回答
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="answer"]');
    radios[0]?.click();

    // 次へ移動
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    nextBtn.click();

    // 前へ戻る
    const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
    prevBtn.click();

    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(false);
  });

  it("フィードバックのテキストはtextContentで設定されXSSリスクがない", async () => {
    // HTMLタグを含む選択肢が正解の場合でも安全に描画されることを確認する
    const xssPayload = "<img src=x onerror=alert(1)>";
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockManifest),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockQuestionFile,
            questions: mockQuestionFile.questions.map((q) => ({
              ...q,
              choices: [xssPayload, "イ", "ウ", "エ"],
              correct: 0, // xssPayload が正解
            })),
          }),
      } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // xssPayload 以外のラジオボタンをクリックして不正解フィードバックを表示させる
    const labels = document.querySelectorAll<HTMLLabelElement>(".choice-label");
    const wrongLabel = Array.from(labels).find((l) => l.querySelector(".choice-text")?.textContent !== xssPayload);
    wrongLabel?.querySelector<HTMLInputElement>("input[type=radio]")?.click();

    const resultDiv = document.getElementById("feedbackResult");
    // textContent にはプレーンテキストとして格納される（HTMLとして解析されない）
    expect(resultDiv?.textContent).toContain(xssPayload);
    // img 要素が DOM に生成されていないことを確認
    expect(resultDiv?.querySelector("img")).toBeNull();
  });
});

describe("QuizApp — 読み上げボタン仕様", () => {
  let speechSynthesisMock: {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();

    speechSynthesisMock = {
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: speechSynthesisMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function startQuiz(): Promise<void> {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();
  }

  it("英語の問題では読み上げボタンが表示される", async () => {
    await startQuiz();
    const btn = document.getElementById("speakBtn");
    expect(btn?.classList.contains("hidden")).toBe(false);
  });

  it("読み上げボタンをクリックすると speechSynthesis.speak が呼ばれる", async () => {
    await startQuiz();
    const btn = document.getElementById("speakBtn") as HTMLButtonElement;
    btn.click();
    expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1);
    const utterance = speechSynthesisMock.speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.lang).toBe("en-US");
  });

  it("読み上げボタンをクリックすると cancel → speak の順で呼ばれる", async () => {
    const callOrder: string[] = [];
    speechSynthesisMock.cancel.mockImplementation(() => callOrder.push("cancel"));
    speechSynthesisMock.speak.mockImplementation(() => callOrder.push("speak"));

    await startQuiz();
    const btn = document.getElementById("speakBtn") as HTMLButtonElement;
    btn.click();

    expect(callOrder).toEqual(["cancel", "speak"]);
  });

  it("speechSynthesis が利用できない場合は読み上げボタンが非表示になる", async () => {
    Object.defineProperty(window, "speechSynthesis", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    await startQuiz();
    const btn = document.getElementById("speakBtn");
    expect(btn?.classList.contains("hidden")).toBe(true);
  });
});

describe("QuizApp — 親カテゴリタブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMockWithParent();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("英語タブをクリックすると親カテゴリのグループヘッダーが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const groupHeaders = document.querySelectorAll(".category-group-header");
    expect(groupHeaders.length).toBe(2); // grammar, phonics
  });

  it("英語タブをクリックすると子カテゴリアイテムが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar の tenses-past + phonics の phonics-1
    const catItems = document.querySelectorAll(".category-item[data-category]");
    expect(catItems.length).toBeGreaterThanOrEqual(2);
  });

  it("文法カテゴリアイテムをクリックすると statsInfo がその配下全問題数に更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarCatItem = document.querySelector('.category-item[data-category="tenses-past"]') as HTMLElement;
    grammarCatItem?.click();

    const statsInfo = document.getElementById("statsInfo");
    expect(statsInfo?.textContent).toContain("全：3問");
  });

  it("グループヘッダーをクリックするとグループが折りたたまれる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);
  });

  it("折りたたまれたグループヘッダーを再度クリックすると展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click(); // 折りたたむ
    grammarHeader?.click(); // 展開する

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("グループヘッダーに aria-expanded 属性が設定される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("true");

    grammarHeader?.click();
    expect(grammarHeader?.getAttribute("aria-expanded")).toBe("false");
  });

  it("折りたたまれたグループに属するカテゴリを選択するとグループが自動展開される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar グループを折りたたむ
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();
    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);

    // ここではユーザーの可視要素への操作を再現するのではなく、
    // selectFirstUnlearnedCategory 相当の「プログラム的なカテゴリ選択」を模擬する。
    // そのため、折りたたまれたグループ内の category-item に対して
    // click ハンドラーを直接発火させ、自動展開されることを確認する。
    const grammarCatItem = grammarGroup?.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    grammarCatItem?.click();

    // グループが自動展開されていること
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
  });

  it("カテゴリグループヘッダーに解説ボタンが表示される", async () => {
    // grammar グループに parentCategoryGuideUrl を追加したモックデータ
    const grammarFileWithParentGuide = {
      ...mockGrammarFile,
      parentCategoryGuideUrl: "../english/grammar/guide",
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestWithParent) } as Response);
      }
      if (urlStr.includes("grammar.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFileWithParentGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    const guideBtn = grammarHeader?.querySelector(".category-group-guide-btn");
    expect(guideBtn).not.toBeNull();
    expect(guideBtn?.textContent).toContain("📖");

    const phonicsHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="phonics"]');
    const phonicsGuideBtn = phonicsHeader?.querySelector(".category-group-guide-btn");
    expect(phonicsGuideBtn).not.toBeNull();
  });

  it("parentCategoryGuideUrl がないグループヘッダーにも要約解説ボタンが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    const guideBtn = grammarHeader?.querySelector(".category-group-guide-btn");
    expect(guideBtn).not.toBeNull();
  });

  it("カテゴリグループの解説ボタンを押すと折りたたまずに解説タブへ切り替わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarGroup = document.querySelector<HTMLElement>('.category-group[data-parent-category="grammar"]');
    const guideBtn = grammarGroup?.querySelector<HTMLElement>(".category-group-guide-btn");
    guideBtn?.click();

    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);
    expect(document.querySelector('.panel-tab[data-panel="guide"]')?.classList.contains("active")).toBe(true);
    expect(document.querySelector(".generated-guide-page")).not.toBeNull();
  });

  it("親カテゴリヘッダーをクリックすると解説パネルが表示される", async () => {
    const grammarFileWithParentGuide = {
      ...mockGrammarFile,
      parentCategoryGuideUrl: "../english/grammar/guide",
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestWithParent) } as Response);
      }
      if (urlStr.includes("grammar.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFileWithParentGuide) } as Response);
      }
      if (urlStr.includes("grammar/guide")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("<html><head></head><body><main><p>文法解説</p></main></body></html>"),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    // 解説タブがアクティブになること
    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]');
    expect(guideTab?.classList.contains("active")).toBe(true);

    // 解説コンテナに解説 URL がロードされること
    await waitForCondition(() => !!document.getElementById("guidePanelFrame")?.dataset.loadedUrl);
    const guideFrame = document.getElementById("guidePanelFrame");
    expect(guideFrame?.dataset.loadedUrl).toContain("grammar");
    expect(guideFrame?.classList.contains("hidden")).toBe(false);
  });

  it("親カテゴリヘッダーをクリックするとグループの折りたたみ状態が変化する", async () => {
    const grammarFileWithParentGuide = {
      ...mockGrammarFile,
      parentCategoryGuideUrl: "../english/grammar/guide",
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifestWithParent) } as Response);
      }
      if (urlStr.includes("grammar.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFileWithParentGuide) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarGroup = document.querySelector('.category-group[data-parent-category="grammar"]');
    expect(grammarGroup?.classList.contains("collapsed")).toBe(false);

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    // ヘッダークリックで折りたたまれること（選択と同時に）
    expect(grammarGroup?.classList.contains("collapsed")).toBe(true);
  });
});
