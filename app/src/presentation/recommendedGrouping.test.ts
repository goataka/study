/**
 * recommendedGrouping の仕様テスト
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { groupRecommendedByCategory, type CategoryLookup, type RecommendedItem } from "./recommendedGrouping";

describe("groupRecommendedByCategory 関数", () => {
  const lookup: CategoryLookup = {
    getTopCategoryForUnit: (_subject, categoryId) => {
      if (categoryId.startsWith("a-")) return { id: "topA", name: "TopA" };
      if (categoryId.startsWith("b-")) return { id: "topB", name: "TopB" };
      return undefined;
    },
    getParentCategoryForUnit: (_subject, categoryId) => {
      if (categoryId.startsWith("a-")) return { id: "parA", name: "ParentA" };
      if (categoryId.startsWith("b-")) return { id: "parB", name: "ParentB" };
      return undefined;
    },
  };

  it("親カテゴリが同じ単元を 1 つのグループにまとめる", () => {
    const items: RecommendedItem[] = [
      { id: "a-1", name: "A1", isLearned: false },
      { id: "b-1", name: "B1", isLearned: false },
      { id: "a-2", name: "A2", isLearned: true },
    ];
    const groups = groupRecommendedByCategory("english", items, lookup);
    expect(groups).toHaveLength(2);
    const topA = groups.find((g) => g.parentCatId === "parA");
    expect(topA?.items.map((i) => i.id)).toEqual(["a-1", "a-2"]);
  });

  it("未学習を含むグループを先頭に並べる", () => {
    const items: RecommendedItem[] = [
      { id: "a-1", name: "A1", isLearned: true }, // 全部学習済み
      { id: "b-1", name: "B1", isLearned: false }, // 未学習を含む
    ];
    const groups = groupRecommendedByCategory("english", items, lookup);
    expect(groups[0].parentCatId).toBe("parB");
  });

  it("各グループ内では未学習単元を先頭に並べる", () => {
    const items: RecommendedItem[] = [
      { id: "a-1", name: "A1", isLearned: true },
      { id: "a-2", name: "A2", isLearned: false },
    ];
    const groups = groupRecommendedByCategory("english", items, lookup);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a-2", "a-1"]);
  });
});
