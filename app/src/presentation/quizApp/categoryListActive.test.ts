// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateCategoryListActive, showPanelTab } from "./categoryListActive";

function setupCategoryList(): void {
  document.body.innerHTML = `
    <ul id="categoryList">
      <li class="category-grade-group" data-grade="小学1年">
        <button class="category-grade-group-toggle" aria-expanded="true"></button>
        <header class="category-grade-group-header" data-grade="小学1年">学1年</header>
        <ul>
          <li class="category-top-group-header" data-top-category="topA">topA</li>
          <li class="category-group-header" data-parent-category="parentA">parentA</li>
          <li class="category-item"
              data-subject="math" data-category="add01"
              data-parent-category="parentA" data-top-category="topA">add01</li>
          <li class="category-item"
              data-subject="math" data-category="add02"
              data-parent-category="parentA" data-top-category="topA">add02</li>
        </ul>
      </li>
      <li class="category-grade-group collapsed" data-grade="小学2年">
        <button class="category-grade-group-toggle" aria-expanded="false"></button>
        <header class="category-grade-group-header" data-grade="小学2年">小学2年</header>
        <ul>
          <li class="category-item"
              data-subject="math" data-category="sub01"
              data-parent-category="parentB" data-top-category="topB">sub01</li>
        </ul>
      </li>
    </ul>
  `;
}

describe("updateCategoryListActive", () => {
  beforeEach(() => {
    setupCategoryList();
  });

  it("selectionLevel='unit' で filter に一致するカテゴリアイテムだけが active になる", () => {
    updateCategoryListActive({
      filter: { subject: "math", category: "add01" },
      selectionLevel: "unit",
      selectedTopCategoryId: null,
      selectedGradeGroup: null,
      collapsedGradeGroups: new Set(),
      expandParentCategory: vi.fn(),
      expandTopCategory: vi.fn(),
    });

    const items = document.querySelectorAll<HTMLElement>(".category-item");
    expect(items[0].classList.contains("active")).toBe(true);
    expect(items[1].classList.contains("active")).toBe(false);
    expect(items[2].classList.contains("active")).toBe(false);
  });

  it("selectionLevel='unit' でアクティブなアイテムの親/トップカテゴリ展開ハンドラを呼ぶ", () => {
    const expandParentCategory = vi.fn();
    const expandTopCategory = vi.fn();

    updateCategoryListActive({
      filter: { subject: "math", category: "add01" },
      selectionLevel: "unit",
      selectedTopCategoryId: null,
      selectedGradeGroup: null,
      collapsedGradeGroups: new Set(),
      expandParentCategory,
      expandTopCategory,
    });

    expect(expandParentCategory).toHaveBeenCalledWith("parentA");
    expect(expandTopCategory).toHaveBeenCalledWith("topA");
  });

  it("アクティブなアイテムが折りたたみ済みの学年グループ配下にある場合、自動展開する", () => {
    const collapsed = new Set(["小学2年"]);

    updateCategoryListActive({
      filter: { subject: "math", category: "sub01" },
      selectionLevel: "unit",
      selectedTopCategoryId: null,
      selectedGradeGroup: null,
      collapsedGradeGroups: collapsed,
      expandParentCategory: vi.fn(),
      expandTopCategory: vi.fn(),
    });

    expect(collapsed.has("小学2年")).toBe(false);
    const group = document.querySelector<HTMLElement>('.category-grade-group[data-grade="小学2年"]');
    expect(group?.classList.contains("collapsed")).toBe(false);
    const toggle = group?.querySelector<HTMLElement>(".category-grade-group-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });

  it("selectionLevel='parentCategory' では親カテゴリヘッダーだけが active になる", () => {
    updateCategoryListActive({
      filter: { subject: "math", category: "all", parentCategory: "parentA" },
      selectionLevel: "parentCategory",
      selectedTopCategoryId: null,
      selectedGradeGroup: null,
      collapsedGradeGroups: new Set(),
      expandParentCategory: vi.fn(),
      expandTopCategory: vi.fn(),
    });

    const parentHeader = document.querySelector<HTMLElement>('.category-group-header[data-parent-category="parentA"]');
    expect(parentHeader?.classList.contains("active")).toBe(true);
    document.querySelectorAll<HTMLElement>(".category-item").forEach((el) => {
      expect(el.classList.contains("active")).toBe(false);
    });
  });

  it("selectionLevel='topCategory' では選択中のトップカテゴリヘッダーだけが active になる", () => {
    updateCategoryListActive({
      filter: { subject: "math", category: "all" },
      selectionLevel: "topCategory",
      selectedTopCategoryId: "topA",
      selectedGradeGroup: null,
      collapsedGradeGroups: new Set(),
      expandParentCategory: vi.fn(),
      expandTopCategory: vi.fn(),
    });

    const topHeader = document.querySelector<HTMLElement>('.category-top-group-header[data-top-category="topA"]');
    expect(topHeader?.classList.contains("active")).toBe(true);
  });

  it("selectedGradeGroup が設定されていれば対応する学年グループヘッダーが active になる", () => {
    updateCategoryListActive({
      filter: { subject: "math", category: "all" },
      selectionLevel: "none",
      selectedTopCategoryId: null,
      selectedGradeGroup: "小学1年",
      collapsedGradeGroups: new Set(),
      expandParentCategory: vi.fn(),
      expandTopCategory: vi.fn(),
    });

    const headers = document.querySelectorAll<HTMLElement>(".category-grade-group-header[data-grade]");
    expect(headers[0].classList.contains("active")).toBe(true);
    expect(headers[1].classList.contains("active")).toBe(false);
  });

  it("#categoryList が存在しない場合は安全に何もしない", () => {
    document.body.innerHTML = "";
    expect(() =>
      updateCategoryListActive({
        filter: { subject: "math", category: "add01" },
        selectionLevel: "unit",
        selectedTopCategoryId: null,
        selectedGradeGroup: null,
        collapsedGradeGroups: new Set(),
        expandParentCategory: vi.fn(),
        expandTopCategory: vi.fn(),
      }),
    ).not.toThrow();
  });
});

describe("showPanelTab", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="quizModePanel"></div>
      <div id="guideContent"></div>
      <div id="historyContent"></div>
      <div id="questionListContent"></div>
      <button class="panel-tab" data-panel="quiz" tabindex="-1" aria-selected="false"></button>
      <button class="panel-tab" data-panel="guide" tabindex="-1" aria-selected="false"></button>
      <button class="panel-tab" data-panel="history" tabindex="-1" aria-selected="false"></button>
      <button class="panel-tab" data-panel="questions" tabindex="-1" aria-selected="false"></button>
    `;
  });

  it("選択したタブのコンテンツだけが表示される", () => {
    showPanelTab("guide");

    expect(document.getElementById("quizModePanel")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("guideContent")?.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("historyContent")?.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("questionListContent")?.classList.contains("hidden")).toBe(true);
  });

  it("選択したタブだけが active になり tabindex/aria-selected が更新される", () => {
    showPanelTab("history");

    const tabs = document.querySelectorAll<HTMLElement>(".panel-tab[data-panel]");
    tabs.forEach((tab) => {
      const isHistory = tab.dataset.panel === "history";
      expect(tab.classList.contains("active")).toBe(isHistory);
      expect(tab.getAttribute("aria-selected")).toBe(String(isHistory));
      expect(tab.getAttribute("tabindex")).toBe(isHistory ? "0" : "-1");
    });
  });

  it("既に表示されているコンテンツ要素が無い場合でも安全に動作する", () => {
    document.body.innerHTML = `<button class="panel-tab" data-panel="quiz"></button>`;
    expect(() => showPanelTab("quiz")).not.toThrow();
  });
});
