/**
 * カテゴリ操作系ボタンの CVA レシピ仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { categoryViewToggleButton, gradeFilterButton, statusFilterButton } from "./categoryControlButtonStyles";

describe("statusFilterButton スタイル（CVA）", () => {
  it("category-status-filter-btn クラスを含む", () => {
    const cls = statusFilterButton();
    expect(cls).toContain("category-status-filter-btn");
  });
});

describe("gradeFilterButton スタイル（CVA）", () => {
  it("grade-filter-btn クラスを含む", () => {
    const cls = gradeFilterButton();
    expect(cls).toContain("grade-filter-btn");
  });

  it("aria-pressed=true 用のスタイルを含む", () => {
    const cls = gradeFilterButton();
    expect(cls).toContain("[&[aria-pressed='true']]:bg-[#0366d6]");
  });
});

describe("categoryViewToggleButton スタイル（CVA）", () => {
  it("category-view-toggle クラスを含む", () => {
    const cls = categoryViewToggleButton();
    expect(cls).toContain("category-view-toggle");
  });
});
