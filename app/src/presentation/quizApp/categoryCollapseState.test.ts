// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyParentCategoryCollapsedState,
  applyTopCategoryCollapsedState,
  applyCategoryStatusFilter,
} from "./categoryCollapseState";

describe("categoryCollapseState", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="categoryList">
        <li class="category-top-group" data-top-category="topA">
          <button class="category-top-group-toggle" aria-expanded="true"></button>
          <ul class="category-group" data-parent-category="parentA">
            <button class="category-group-toggle" aria-expanded="true"></button>
          </ul>
        </li>
      </ul>
      <button id="filterStatusAll" class="active" aria-pressed="true"></button>
      <button id="filterStatusUnlearned" aria-pressed="false"></button>
      <button id="filterStatusStudying" aria-pressed="false"></button>
      <button id="filterStatusLearned" aria-pressed="false"></button>
    `;
  });

  describe("applyParentCategoryCollapsedState", () => {
    it("折りたたみ true で collapsed クラスを付与し aria-expanded を false にする", () => {
      applyParentCategoryCollapsedState("parentA", true);
      const group = document.querySelector<HTMLElement>('.category-group[data-parent-category="parentA"]');
      expect(group?.classList.contains("collapsed")).toBe(true);
      expect(group?.querySelector(".category-group-toggle")?.getAttribute("aria-expanded")).toBe("false");
    });

    it("折りたたみ false で collapsed クラスを除去し aria-expanded を true にする", () => {
      applyParentCategoryCollapsedState("parentA", true);
      applyParentCategoryCollapsedState("parentA", false);
      const group = document.querySelector<HTMLElement>('.category-group[data-parent-category="parentA"]');
      expect(group?.classList.contains("collapsed")).toBe(false);
      expect(group?.querySelector(".category-group-toggle")?.getAttribute("aria-expanded")).toBe("true");
    });

    it("該当 DOM が無い場合は安全に何もしない", () => {
      expect(() => applyParentCategoryCollapsedState("missing", true)).not.toThrow();
    });

    it("#categoryList が無い場合は安全に何もしない", () => {
      document.body.innerHTML = "";
      expect(() => applyParentCategoryCollapsedState("parentA", true)).not.toThrow();
    });
  });

  describe("applyTopCategoryCollapsedState", () => {
    it("折りたたみ状態を DOM とトグルボタンに反映する", () => {
      applyTopCategoryCollapsedState("topA", true);
      const group = document.querySelector<HTMLElement>('.category-top-group[data-top-category="topA"]');
      expect(group?.classList.contains("collapsed")).toBe(true);
      expect(group?.querySelector(".category-top-group-toggle")?.getAttribute("aria-expanded")).toBe("false");

      applyTopCategoryCollapsedState("topA", false);
      expect(group?.classList.contains("collapsed")).toBe(false);
      expect(group?.querySelector(".category-top-group-toggle")?.getAttribute("aria-expanded")).toBe("true");
    });

    it("該当トップカテゴリが無い場合は安全に何もしない", () => {
      expect(() => applyTopCategoryCollapsedState("missing", true)).not.toThrow();
    });
  });

  describe("applyCategoryStatusFilter", () => {
    it("'all' のときフィルタクラスは付与されず all ボタンだけが active になる", () => {
      applyCategoryStatusFilter("all");
      const list = document.getElementById("categoryList");
      expect(list?.classList.contains("filter-unlearned")).toBe(false);
      expect(list?.classList.contains("filter-studying")).toBe(false);
      expect(list?.classList.contains("filter-learned")).toBe(false);

      expect(document.getElementById("filterStatusAll")?.classList.contains("active")).toBe(true);
      expect(document.getElementById("filterStatusUnlearned")?.classList.contains("active")).toBe(false);
    });

    it("'unlearned' で filter-unlearned クラスが付与され該当ボタンが active になる", () => {
      applyCategoryStatusFilter("unlearned");
      const list = document.getElementById("categoryList");
      expect(list?.classList.contains("filter-unlearned")).toBe(true);

      expect(document.getElementById("filterStatusUnlearned")?.classList.contains("active")).toBe(true);
      expect(document.getElementById("filterStatusUnlearned")?.getAttribute("aria-pressed")).toBe("true");
      expect(document.getElementById("filterStatusAll")?.classList.contains("active")).toBe(false);
      expect(document.getElementById("filterStatusAll")?.getAttribute("aria-pressed")).toBe("false");
    });

    it("フィルタ切替時に他のフィルタクラスは確実に除去される", () => {
      applyCategoryStatusFilter("studying");
      applyCategoryStatusFilter("learned");
      const list = document.getElementById("categoryList");
      expect(list?.classList.contains("filter-studying")).toBe(false);
      expect(list?.classList.contains("filter-learned")).toBe(true);
    });

    it("#categoryList が無くてもボタン状態は更新される", () => {
      document.getElementById("categoryList")?.remove();
      expect(() => applyCategoryStatusFilter("learned")).not.toThrow();
      expect(document.getElementById("filterStatusLearned")?.classList.contains("active")).toBe(true);
    });
  });
});
