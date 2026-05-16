/**
 * QuizApp プレゼンテーション層 — 進度タブ仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "../quizApp";
import { StubProgressRepository, setupTabDom, setupFetchMock } from "./testHelpers";

describe("QuizApp — 進度タブ仕様", () => {
  beforeEach(() => {
    setupTabDom();
    setupFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("進度タブをクリックすると教科リストが左パネルに描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const subjectList = document.querySelector(".progress-subject-list");
    expect(subjectList).not.toBeNull();

    const items = document.querySelectorAll(".progress-subject-list-item");
    expect(items.length).toBeGreaterThan(0);
  });

  it("進度タブの教科リスト項目に aria-pressed が設定されている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const items = document.querySelectorAll(".progress-subject-list-item");
    items.forEach((item) => {
      expect(item.hasAttribute("aria-pressed")).toBe(true);
    });
  });

  it("進度タブでアクティブな教科リスト項目の aria-pressed が true になっている", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const activeItem = document.querySelector(".progress-subject-list-item.active");
    expect(activeItem?.getAttribute("aria-pressed")).toBe("true");

    const inactiveItems = document.querySelectorAll(".progress-subject-list-item:not(.active)");
    inactiveItems.forEach((item) => {
      expect(item.getAttribute("aria-pressed")).toBe("false");
    });
  });

  it("進度タブをクリックすると進度詳細パネルが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const panel = document.getElementById("progressDetailPanel");
    expect(panel?.classList.contains("hidden")).toBe(false);
  });

  it("進度タブの詳細パネルに学年別・カテゴリ別タブが存在する", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const gradeTab = document.getElementById("progressDetailTab-grade");
    const catTab = document.getElementById("progressDetailTab-category");
    expect(gradeTab).not.toBeNull();
    expect(catTab).not.toBeNull();
  });

  it("進度タブ初期表示はマトリクスタブがアクティブで、並びは学年別→カテゴリ別→マトリクス", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const tabs = Array.from(document.querySelectorAll<HTMLElement>(".panel-tab[data-progress-detail-panel]"));
    expect(tabs.map((tab) => tab.dataset.progressDetailPanel)).toEqual(["grade", "category", "matrix"]);
    const activeTab = document.querySelector<HTMLElement>(".panel-tab[data-progress-detail-panel].active");
    expect(activeTab?.dataset.progressDetailPanel).toBe("matrix");
  });

  it("進度マトリクス左上の切り替えボタンに aria-pressed が付き、押下で状態が切り替わる", async () => {
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              subjects: { english: { name: "英語" } },
              questionFiles: ["english/matrix.json"],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: "english",
            subjectName: "英語",
            category: "matrix-cat",
            categoryName: "マトリクス単元",
            referenceGrade: "小学1年",
            questions: [{ id: "m1", question: "q", choices: ["a", "b", "c", "d"], correct: 0, explanation: "e" }],
          }),
      } as Response);
    });
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();
    const matrixTab = document.getElementById("progressDetailTab-matrix") as HTMLButtonElement | null;
    matrixTab?.click();

    const toggleBtn = document.querySelector(".progress-matrix-corner-toggle-btn") as HTMLButtonElement | null;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.getAttribute("aria-pressed")).toBe("false");

    toggleBtn?.click();
    const toggledBtn = document.querySelector(".progress-matrix-corner-toggle-btn") as HTMLButtonElement | null;
    expect(toggledBtn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("進度マトリクスのカテゴリ見出しにトップカテゴリ名が含まれる", async () => {
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              subjects: { english: { name: "英語" } },
              questionFiles: ["english/matrix-top-parent.json"],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: "english",
            subjectName: "英語",
            category: "matrix-top-parent-cat",
            categoryName: "比較単元",
            parentCategory: "intro",
            parentCategoryName: "入門",
            topCategory: "grammar",
            topCategoryName: "文法",
            referenceGrade: "小学1年",
            questions: [{ id: "mtp-1", question: "q", choices: ["a", "b", "c", "d"], correct: 0, explanation: "e" }],
          }),
      } as Response);
    });
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();
    const matrixTab = document.getElementById("progressDetailTab-matrix") as HTMLButtonElement | null;
    matrixTab?.click();

    const headers = Array.from(document.querySelectorAll(".progress-matrix-parent-header")).map(
      (el) => el.textContent ?? "",
    );
    expect(headers.some((text) => text.includes("文法 / 入門"))).toBe(true);
  });

  it("進度タブの詳細パネルにブロックグループが描画される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const content = document.getElementById("progressDetailContent");
    expect(content).not.toBeNull();
    // モックデータで単元が存在するため、少なくとも1つのグループが描画されること
    expect(content?.children.length).toBeGreaterThan(0);
  });

  it("進度詳細の学年別・カテゴリ別見出しは大きめフォントで表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();
    const categoryTab = document.getElementById("progressDetailTab-category") as HTMLButtonElement | null;
    categoryTab?.click();

    const groupName = document.querySelector(".progress-block-group-name");
    expect(groupName).not.toBeNull();
    expect(groupName?.className ?? "").toContain("text-lg");
  });

  it("進度詳細パネルのカテゴリ別タブをクリックするとビューが切り替わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const catTab = document.getElementById("progressDetailTab-category") as HTMLElement;
    catTab?.click();

    expect(catTab?.classList.contains("active")).toBe(true);
    const gradeTab = document.getElementById("progressDetailTab-grade");
    expect(gradeTab?.classList.contains("active")).toBe(false);
  });

  it("進度マトリクスの行列切り替えボタンは大きめフォントで表示される", async () => {
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              subjects: { english: { name: "英語" } },
              questionFiles: ["english/matrix-font.json"],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: "english",
            subjectName: "英語",
            category: "matrix-font-cat",
            categoryName: "マトリクス単元",
            referenceGrade: "小学1年",
            questions: [{ id: "mf-1", question: "q", choices: ["a", "b", "c", "d"], correct: 0, explanation: "e" }],
          }),
      } as Response);
    });
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();
    const matrixTab = document.getElementById("progressDetailTab-matrix") as HTMLButtonElement | null;
    matrixTab?.click();

    const toggleBtn = document.querySelector(".progress-matrix-corner-toggle-btn") as HTMLButtonElement | null;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.className ?? "").toContain("text-sm");
    expect(toggleBtn?.className ?? "").toContain("font-semibold");
  });

  it("他の教科タブに切り替えると進度詳細パネルが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    // 英語タブに切り替え
    const englishTab = document.querySelector('.subject-tab[data-subject="english"]') as HTMLElement;
    englishTab?.click();

    const panel = document.getElementById("progressDetailPanel");
    expect(panel?.classList.contains("hidden")).toBe(true);
  });

  it("進度タブの単元ブロックをクリックしても教科タブへ移動せず、単元詳細のみ表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const categoryTab = document.getElementById("progressDetailTab-category") as HTMLButtonElement | null;
    categoryTab?.click();

    const block = document.querySelector(".progress-block") as HTMLButtonElement | null;
    expect(block).not.toBeNull();
    block?.click();

    const activeProgressTab = document.querySelector('.subject-tab[data-subject="progress"].active');
    expect(activeProgressTab).not.toBeNull();
    const selectedInfo = document.getElementById("selectedUnitInfo");
    expect(selectedInfo?.classList.contains("hidden")).toBe(false);
    const panel = document.getElementById("progressDetailPanel");
    expect(panel?.classList.contains("hidden")).toBe(true);
  });

  it("進度タブのマトリクス単元ブロックをクリックしても教科タブへ移動せず、単元詳細のみ表示される", async () => {
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              subjects: { english: { name: "英語" } },
              questionFiles: ["english/matrix-click.json"],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: "english",
            subjectName: "英語",
            category: "matrix-click-cat",
            categoryName: "マトリクスクリック単元",
            parentCategory: "intro",
            parentCategoryName: "入門",
            topCategory: "grammar",
            topCategoryName: "文法",
            referenceGrade: "小学1年",
            questions: [{ id: "mc-1", question: "q", choices: ["a", "b", "c", "d"], correct: 0, explanation: "e" }],
          }),
      } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();
    const matrixTab = document.getElementById("progressDetailTab-matrix") as HTMLButtonElement | null;
    matrixTab?.click();

    const block = document.querySelector(".progress-block-sm") as HTMLButtonElement | null;
    expect(block).not.toBeNull();
    block?.click();

    const activeProgressTab = document.querySelector('.subject-tab[data-subject="progress"].active');
    expect(activeProgressTab).not.toBeNull();
    const selectedInfo = document.getElementById("selectedUnitInfo");
    expect(selectedInfo?.classList.contains("hidden")).toBe(false);
    const panel = document.getElementById("progressDetailPanel");
    expect(panel?.classList.contains("hidden")).toBe(true);
  });

  it("進度タブで「未学習」を選ぶと学習済み単元ブロックが非表示になる", async () => {
    const repo = new StubProgressRepository();
    repo.saveMasteredIds(["q1", "q2", "q3", "q4", "q5"]);

    new QuizApp(repo);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();

    const unlearnedBtn = document.getElementById("progressStatusUnlearnedBtn") as HTMLButtonElement | null;
    expect(unlearnedBtn).not.toBeNull();
    unlearnedBtn?.click();

    expect(unlearnedBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".progress-block, .progress-block-sm")).toBeNull();
  });

  it("進度タブで対象学年フィルターを選ぶと該当学年の単元のみ表示される", async () => {
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              subjects: { english: { name: "英語" } },
              questionFiles: ["english/elem.json", "english/middle.json"],
            }),
        } as Response);
      }
      if (urlStr.includes("elem.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subject: "english",
              subjectName: "英語",
              category: "elem-unit",
              categoryName: "小学単元",
              referenceGrade: "小学1年",
              questions: [{ id: "e1", question: "q", choices: ["a", "b", "c", "d"], correct: 0, explanation: "e" }],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: "english",
            subjectName: "英語",
            category: "middle-unit",
            categoryName: "中学単元",
            referenceGrade: "中学1年",
            questions: [{ id: "m1", question: "q", choices: ["a", "b", "c", "d"], correct: 0, explanation: "e" }],
          }),
      } as Response);
    });
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const progressTab = document.querySelector('.subject-tab[data-subject="progress"]') as HTMLElement;
    progressTab?.click();
    const gradeTab = document.getElementById("progressDetailTab-grade") as HTMLButtonElement | null;
    gradeTab?.click();

    const elemBtn = document.getElementById("progressGradeElemBtn") as HTMLButtonElement | null;
    elemBtn?.click();

    expect(elemBtn?.getAttribute("aria-pressed")).toBe("true");
    const groupNames = Array.from(document.querySelectorAll(".progress-block-group-name")).map(
      (el) => el.textContent ?? "",
    );
    expect(groupNames).toContain("小学1年");
    expect(groupNames).not.toContain("中学1年");
  });
});
