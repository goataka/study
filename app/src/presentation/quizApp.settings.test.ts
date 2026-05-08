/**
 * QuizApp プレゼンテーション層 — 設定/フォントサイズ/単元情報パネル/モバイル戻るボタン仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import {
  setupMinimalDom,
  setupTabDom,
  setupFetchMock,
  setupFetchMockWithParent,
  setupFetchMockWith3Levels,
  mockManifest,
  mockQuestionFile,
} from "./quizApp.testHelpers";

describe("QuizApp — カテゴリ/サブカテゴリ選択と表示制御仕様", () => {
  beforeEach(() => {
    setupTabDom();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("親カテゴリヘッダーをクリックすると確認・問題一覧・履歴タブが非表示になる", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/grammar.json", "english/phonics.json"],
    };
    const grammarFile = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-past",
      categoryName: "過去形",
      parentCategory: "grammar",
      parentCategoryName: "文法",
      parentCategoryGuideUrl: "../english/grammar/guide",
      questions: [{ id: "g1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    const phonicsFile = {
      subject: "english",
      subjectName: "英語",
      category: "phonics-1",
      categoryName: "フォニックス",
      parentCategory: "phonics",
      parentCategoryName: "発音",
      questions: [{ id: "p1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      if (u.includes("grammar.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(phonicsFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // grammar親カテゴリヘッダーをクリック
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();

    // 確認・問題一覧・履歴タブが非表示になること
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("panelTab-questions")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("panelTab-history")?.classList.contains("hidden")).toBe(true);

    // 解説タブは非表示にならないこと
    expect(document.getElementById("panelTab-guide")?.classList.contains("hidden")).toBe(false);
  });

  it("単元をクリックすると確認・問題一覧・履歴タブが再表示される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/grammar.json"],
    };
    const grammarFile = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-past",
      categoryName: "過去形",
      parentCategory: "grammar",
      parentCategoryName: "文法",
      parentCategoryGuideUrl: "../english/grammar/guide",
      questions: [{ id: "g1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    // 親カテゴリを選択してタブを非表示にする
    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');
    grammarHeader?.click();
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(true);

    // 単元をクリックするとタブが再表示される
    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();
    expect(document.getElementById("panelTab-quiz")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("panelTab-history")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("panelTab-questions")?.classList.contains("hidden")).toBe(false);
  });

  it("親カテゴリヘッダーのアクティブ状態が設定される", async () => {
    const manifest = {
      version: "2.0.0",
      subjects: { english: { name: "英語" } },
      questionFiles: ["english/grammar.json"],
    };
    const grammarFile = {
      subject: "english",
      subjectName: "英語",
      category: "tenses-past",
      categoryName: "過去形",
      parentCategory: "grammar",
      parentCategoryName: "文法",
      parentCategoryGuideUrl: "../english/grammar/guide",
      questions: [{ id: "g1", question: "問題", choices: ["A", "B", "C", "D"], correct: 0, explanation: "解説" }],
    };
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(grammarFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const grammarHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="grammar"]');

    // 初期状態はアクティブでない
    expect(grammarHeader?.classList.contains("active")).toBe(false);

    // クリックするとアクティブになる
    grammarHeader?.click();
    expect(grammarHeader?.classList.contains("active")).toBe(true);

    // 再クリックで非選択（トグル）
    grammarHeader?.click();
    expect(grammarHeader?.classList.contains("active")).toBe(false);
  });
});

describe("QuizApp — フォントサイズ切替仕様", () => {
  beforeEach(() => {
    setupMinimalDom();
    setupFetchMock();
    localStorage.clear();
    // body クラスを初期化する
    document.body.classList.remove("font-size-medium", "font-size-large");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期化時にlocalStorageに保存値がなければ bodyにフォントサイズクラスが付かない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("localStorageに medium が保存されていれば初期化時に body.font-size-medium が付く", async () => {
    localStorage.setItem("fontSizeLevel", "medium");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("localStorageに large が保存されていれば初期化時に body.font-size-large が付く", async () => {
    localStorage.setItem("fontSizeLevel", "large");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("初期化時にlocalStorageへの書き戻しが発生しない（localStorageに保存値がない場合）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(localStorage.getItem("fontSizeLevel")).toBeNull();
  });

  it("初期化時にlocalStorageへの書き戻しが発生しない（medium が保存されている場合）", async () => {
    localStorage.setItem("fontSizeLevel", "medium");
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 初期復元で書き戻しが起きていないことを確認（値は変わらず medium のまま）
    expect(localStorage.getItem("fontSizeLevel")).toBe("medium");
  });

  it("「中」ボタンをクリックするとbody.font-size-mediumが付く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("「大」ボタンをクリックするとbody.font-size-largeが付く", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(document.body.classList.contains("font-size-large")).toBe(true);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
  });

  it("「小」ボタンをクリックするとフォントサイズクラスが除去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // まず大きいサイズに変更
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    // 小に戻す
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!.click();
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);
  });

  it("「中」ボタンクリック後にaria-pressed属性が正しく更新される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    mediumBtn.click();
    expect(mediumBtn.getAttribute("aria-pressed")).toBe("true");
    expect(smallBtn.getAttribute("aria-pressed")).toBe("false");
    expect(largeBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("「中」ボタンクリック後にlocalStorageに medium が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')!;
    mediumBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("medium");
  });

  it("「大」ボタンクリック後にlocalStorageに large が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("large");
  });

  it("「小」ボタンクリック後にlocalStorageに small が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const smallBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="small"]')!;
    smallBtn.click();
    expect(localStorage.getItem("fontSizeLevel")).toBe("small");
  });

  it("フォントサイズ変更時にlocalStorageに値が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const largeBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')!;
    largeBtn.click();

    expect(localStorage.getItem("fontSizeLevel")).toBe("large");
  });
});

describe("QuizApp — 選択中の単元情報パネル仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では selectedUnitInfo は非表示", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);
  });

  it("単元を選択すると selectedUnitInfo が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(false);
  });

  it("単元選択時に selectedUnitInfo に単元名が表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const nameEl = document.querySelector(".selected-unit-info-name");
    expect(nameEl?.textContent).toBe("フォニックス（1文字）");
  });

  it("selectedUnitInfo の閉じるボタンをクリックすると選択が解除されパネルが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const closeBtn = document.querySelector<HTMLButtonElement>(".selected-unit-close-btn");
    closeBtn?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);

    // カテゴリ選択も解除されること
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("同じ教科タブを再クリックすると selectedUnitInfo が非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    // 同じ教科タブを再クリックすると category="all" にリセットされる
    englishTab?.click();

    const info = document.getElementById("selectedUnitInfo");
    expect(info?.classList.contains("hidden")).toBe(true);
  });

  it("親カテゴリのみの単元選択時にカテゴリパスバッジが表示される", async () => {
    setupTabDom();
    setupFetchMockWithParent();
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).not.toBeNull();
    expect(catLabel?.textContent).toBe("発音");
  });

  it("トップカテゴリ＋親カテゴリの単元選択時にカテゴリパスバッジが `Top › Parent` 形式で表示される", async () => {
    setupTabDom();
    setupFetchMockWith3Levels();
    localStorage.clear();

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="tenses-past"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).not.toBeNull();
    expect(catLabel?.textContent).toBe("文法 › 動詞");
  });

  it("カテゴリ階層のない単元選択時にはカテゴリパスバッジが表示されない", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const catItem = document.querySelector<HTMLElement>('.category-item[data-category="phonics-1"]');
    catItem?.click();

    const catLabel = document.querySelector(".selected-unit-info-category");
    expect(catLabel).toBeNull();
  });
});

describe("QuizApp — 学習済みフィルター（含める/含めない）仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では「含めない」が選択されており全問習得済み時にスタートできない", async () => {
    // 全問を習得済みにする
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // 「含めない」がデフォルトで選択されていることを確認
    const excludeRadio = document.querySelector<HTMLInputElement>('input[name="quizLearned"][value="exclude"]');
    expect(excludeRadio?.checked).toBe(true);

    // 確認ダイアログが表示される（全問習得済みのため）
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    startBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 確認ダイアログが表示されていること（キャンセルする）
    const confirmDialog = document.getElementById("confirmDialog");
    expect(confirmDialog?.classList.contains("hidden")).toBe(false);
    // キャンセルしてスタート画面に留まることを確認
    document.getElementById("confirmDialogCancel")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // ダイアログが閉じてスタート画面のまま（クイズ画面に遷移しない）
    expect(confirmDialog?.classList.contains("hidden")).toBe(true);
    const startScreen = document.getElementById("startScreen");
    expect(startScreen?.classList.contains("hidden")).toBe(false);
  });

  it("「含める」を選択すると学習済み問題も含めてスタートできる", async () => {
    // 全問を習得済みにする
    localStorage.setItem("masteredIds", JSON.stringify(["q1", "q2", "q3", "q4", "q5"]));
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();
    const catItem = document.querySelector('.category-item[data-category="phonics-1"]') as HTMLElement;
    catItem?.click();

    // 「含める」に変更する
    const includeRadio = document.querySelector<HTMLInputElement>('input[name="quizLearned"][value="include"]');
    includeRadio!.checked = true;
    includeRadio?.dispatchEvent(new Event("change", { bubbles: true }));

    // スタートボタンをクリック（ダイアログなしでスタートするはず）
    const startBtn = document.getElementById("startRandomBtn") as HTMLButtonElement;
    startBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // クイズ画面に遷移していること
    const quizScreen = document.getElementById("quizScreen");
    expect(quizScreen?.classList.contains("hidden")).toBe(false);
  });
});

describe("QuizApp — クイズ設定永続化仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("保存済みクイズ設定（問題数）が初期化時に DOM に反映される", async () => {
    localStorage.setItem(
      "quizSettings",
      JSON.stringify({ questionCount: 20, quizOrder: "random", includeMastered: false }),
    );
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radio20 = document.querySelector<HTMLInputElement>('input[name="questionCount"][value="20"]');
    const radio10 = document.querySelector<HTMLInputElement>('input[name="questionCount"][value="10"]');
    expect(radio20?.checked).toBe(true);
    expect(radio10?.checked).toBe(false);
  });

  it("保存済みクイズ設定（並び順）が初期化時に DOM に反映される", async () => {
    localStorage.setItem(
      "quizSettings",
      JSON.stringify({ questionCount: 10, quizOrder: "straight", includeMastered: false }),
    );
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radioStraight = document.querySelector<HTMLInputElement>('input[name="quizOrder"][value="straight"]');
    expect(radioStraight?.checked).toBe(true);
  });

  it("保存済みクイズ設定（学習済み含む）が初期化時に DOM に反映される", async () => {
    localStorage.setItem(
      "quizSettings",
      JSON.stringify({ questionCount: 10, quizOrder: "random", includeMastered: true }),
    );
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const includeRadio = document.querySelector<HTMLInputElement>('input[name="quizLearned"][value="include"]');
    expect(includeRadio?.checked).toBe(true);
  });

  it("問題数ラジオを変更すると localStorage に設定が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radio5 = document.querySelector<HTMLInputElement>('input[name="questionCount"][value="5"]');
    radio5!.checked = true;
    radio5?.dispatchEvent(new Event("change", { bubbles: true }));

    const saved = JSON.parse(localStorage.getItem("quizSettings") ?? "{}");
    expect(saved.questionCount).toBe(5);
  });

  it("並び順ラジオを変更すると localStorage に設定が保存される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const radioStraight = document.querySelector<HTMLInputElement>('input[name="quizOrder"][value="straight"]');
    radioStraight!.checked = true;
    radioStraight?.dispatchEvent(new Event("change", { bubbles: true }));

    const saved = JSON.parse(localStorage.getItem("quizSettings") ?? "{}");
    expect(saved.quizOrder).toBe("straight");
  });
});

// ─── スマホ用ナビゲーション仕様 ──────────────────────────────────────────────

describe("QuizApp — スマホ用単元一覧戻るボタン仕様", () => {
  beforeEach(() => {
    setupTabDom();
    // スマホ用ボタンを DOM に追加
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <button id="mobileBackBtn" class="mobile-back-btn">← 単元一覧</button>
      <button id="adminMenuBtn" class="admin-menu-header-btn">⚙️</button>
    `,
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("通常タブで単元選択後に戻るボタンを押すと category-only クラスが付く", async () => {
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 英語タブをクリック
    const tabs = document.querySelectorAll<HTMLButtonElement>(".subject-tab");
    const englishTab = Array.from(tabs).find((t) => t.dataset.subject === "english");
    englishTab?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // カテゴリアイテムをクリック
    const items = document.querySelectorAll<HTMLElement>(".category-item");
    if (items.length > 0) items[0].click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // subjectContent が category-only でないことを確認（単元選択済み）
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(false);

    // 戻るボタンをクリック
    const backBtn = document.getElementById("mobileBackBtn");
    backBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // category-only クラスが付いて単元未選択状態になる
    expect(subjectContent?.classList.contains("category-only")).toBe(true);
  });

  it("メニューボタンをクリックすると管理タブが選択される", async () => {
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("index.json"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // メニューボタンをクリック
    const menuBtn = document.getElementById("adminMenuBtn");
    menuBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 管理タブがアクティブになる
    const adminTab = document.querySelector<HTMLButtonElement>('.subject-tab[data-subject="admin"]');
    expect(adminTab?.classList.contains("active")).toBe(true);

    // 管理コンテンツパネルが表示される（category-only は不使用、右パネルに管理コンテンツを表示）
    const subjectContent = document.getElementById("subjectContent");
    expect(subjectContent?.classList.contains("category-only")).toBe(false);
    const adminContent = document.getElementById("adminContent");
    expect(adminContent?.classList.contains("hidden")).toBe(false);
  });
});
