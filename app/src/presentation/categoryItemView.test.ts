/**
 * categoryItemView の仕様テスト
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { buildCategoryItem } from "./categoryItemView";

describe("buildCategoryItem", () => {
  it("subject / category / parent / top の dataset 属性を正しく設定する", () => {
    const el = buildCategoryItem({
      subject: "english",
      categoryId: "cat1",
      categoryName: "カテゴリ1",
      parentCatId: "par1",
      topCatId: "top1",
      showReferenceGrade: false,
    });
    expect(el.dataset.subject).toBe("english");
    expect(el.dataset.category).toBe("cat1");
    expect(el.dataset.parentCategory).toBe("par1");
    expect(el.dataset.topCategory).toBe("top1");
    expect(el.getAttribute("role")).toBe("button");
  });

  it("初期ステータスアイコンとしてプレースホルダー ⬜ を表示する", () => {
    const el = buildCategoryItem({
      subject: "math",
      categoryId: "c",
      categoryName: "C",
      showReferenceGrade: false,
    });
    expect(el.querySelector(".category-status")?.textContent).toBe("⬜");
  });

  it("hierarchy が指定されたとき topName › parentName を category-hierarchy に表示する", () => {
    const el = buildCategoryItem({
      subject: "math",
      categoryId: "c",
      categoryName: "C",
      hierarchy: { topName: "Top", parentName: "Parent" },
      showReferenceGrade: false,
    });
    expect(el.querySelector(".category-hierarchy")?.textContent).toBe("Top › Parent");
  });

  it("showReferenceGrade=true のとき学年バッジを表示する", () => {
    const el = buildCategoryItem({
      subject: "math",
      categoryId: "c",
      categoryName: "C",
      referenceGrade: "小4",
      showReferenceGrade: true,
    });
    expect(el.querySelector(".category-grade")?.textContent).toBe("小4");
  });

  it("showReferenceGrade=false のときは学年バッジを表示しない", () => {
    const el = buildCategoryItem({
      subject: "math",
      categoryId: "c",
      categoryName: "C",
      referenceGrade: "小4",
      showReferenceGrade: false,
    });
    expect(el.querySelector(".category-grade")).toBeNull();
  });

  it("description / example が指定されたときは右列を生成し category-item-has-info クラスを付与する", () => {
    const el = buildCategoryItem({
      subject: "math",
      categoryId: "c",
      categoryName: "C",
      description: "説明文",
      example: "例: `1+1`",
      showReferenceGrade: false,
    });
    expect(el.classList.contains("category-item-has-info")).toBe(true);
    expect(el.querySelector(".category-item-description")?.textContent).toBe("説明文");
    expect(el.querySelector(".category-example")).not.toBeNull();
  });

  it("description / example が両方とも未指定のときは右列を生成しない", () => {
    const el = buildCategoryItem({
      subject: "math",
      categoryId: "c",
      categoryName: "C",
      showReferenceGrade: false,
    });
    expect(el.classList.contains("category-item-has-info")).toBe(false);
    expect(el.querySelector(".category-item-right")).toBeNull();
  });
});
