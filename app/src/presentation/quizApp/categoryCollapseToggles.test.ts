// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import {
  toggleParentCategory,
  expandParentCategory,
  toggleTopCategory,
  expandTopCategory,
} from "./categoryCollapseToggles";

describe("categoryCollapseToggles 関数", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-parent-category-id="p1"></div>
      <div data-parent-cat-id="p1" class="parent-category-children"></div>
      <div data-top-category-id="t1"></div>
      <div data-top-category-children-id="t1"></div>
    `;
  });

  describe("toggleParentCategory 関数", () => {
    it("折りたたみと展開を交互に切り替える", () => {
      const collapsed = new Set<string>();
      toggleParentCategory(collapsed, "p1");
      expect(collapsed.has("p1")).toBe(true);
      toggleParentCategory(collapsed, "p1");
      expect(collapsed.has("p1")).toBe(false);
    });
  });

  describe("expandParentCategory 関数", () => {
    it("折りたたまれていないときは何もしない", () => {
      const collapsed = new Set<string>();
      expandParentCategory(collapsed, "p1");
      expect(collapsed.size).toBe(0);
    });
    it("折りたたまれていれば展開する", () => {
      const collapsed = new Set<string>(["p1"]);
      expandParentCategory(collapsed, "p1");
      expect(collapsed.has("p1")).toBe(false);
    });
  });

  describe("toggleTopCategory / expandTopCategory 関数", () => {
    it("toggleTopCategory は状態を交互に切り替える", () => {
      const collapsed = new Set<string>();
      toggleTopCategory(collapsed, "t1");
      expect(collapsed.has("t1")).toBe(true);
      toggleTopCategory(collapsed, "t1");
      expect(collapsed.has("t1")).toBe(false);
    });
    it("expandTopCategory は折りたたまれている時のみ展開する", () => {
      const collapsed = new Set<string>(["t1"]);
      expandTopCategory(collapsed, "t1");
      expect(collapsed.has("t1")).toBe(false);
      // 既に展開済みなので何もしない
      expandTopCategory(collapsed, "t1");
      expect(collapsed.has("t1")).toBe(false);
    });
  });
});
