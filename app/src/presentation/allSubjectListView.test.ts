/**
 * allSubjectListView の仕様テスト
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import {
  groupRecommendedByCategory,
  buildSubjectOverviewHeaderRow,
  buildSubjectOverviewEmptyItem,
  buildCategoryGroupHeader,
  buildRecommendedUnitCard,
  type CategoryLookup,
  type RecommendedItem,
} from "./allSubjectListView";

describe("groupRecommendedByCategory", () => {
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
    expect(groups[1].parentCatId).toBe("parA");
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

describe("buildSubjectOverviewHeaderRow", () => {
  it("教科アイコン・名称・目標数ボタンを描画し、選択中ボタンに active クラスを付与する", () => {
    const row = buildSubjectOverviewHeaderRow({ id: "english", name: "英語", icon: "🔤" }, 3, () => {});
    expect(row.querySelector(".subject-overview-icon")?.textContent).toBe("🔤");
    expect(row.querySelector(".subject-overview-name")?.textContent).toBe("英語");
    const buttons = row.querySelectorAll<HTMLButtonElement>(".overall-rec-count-btn");
    expect(buttons).toHaveLength(3);
    expect(buttons[0].textContent).toBe("1");
    expect(buttons[1].classList.contains("active")).toBe(true);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("ボタンクリック時に onCountChange が押された数値を渡して呼ばれる", () => {
    const onChange = vi.fn();
    const row = buildSubjectOverviewHeaderRow({ id: "x", name: "X", icon: "X" }, 1, onChange);
    const btns = row.querySelectorAll<HTMLButtonElement>(".overall-rec-count-btn");
    btns[2].dispatchEvent(new MouseEvent("click")); // 5
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe("buildSubjectOverviewEmptyItem", () => {
  it("「単元なし」と data-subject 属性を持つ要素を返す", () => {
    const item = buildSubjectOverviewEmptyItem("english");
    expect(item.textContent).toBe("単元なし");
    expect(item.dataset.subject).toBe("english");
  });
});

describe("buildCategoryGroupHeader", () => {
  it("parentCatId が空のとき null を返す", () => {
    const header = buildCategoryGroupHeader({
      topCatId: "",
      topCatName: "",
      parentCatId: "",
      parentCatName: "",
      items: [],
    });
    expect(header).toBeNull();
  });

  it("topCatId が parentCatId と異なるときはパンくず表示する", () => {
    const header = buildCategoryGroupHeader({
      topCatId: "top",
      topCatName: "Top",
      parentCatId: "par",
      parentCatName: "Parent",
      items: [],
    });
    expect(header?.textContent).toBe("Top › Parent");
  });

  it("topCatId と parentCatId が等しいときは parent のみ表示する", () => {
    const header = buildCategoryGroupHeader({
      topCatId: "same",
      topCatName: "Same",
      parentCatId: "same",
      parentCatName: "SameParent",
      items: [],
    });
    expect(header?.textContent).toBe("SameParent");
  });
});

describe("buildRecommendedUnitCard", () => {
  const item: RecommendedItem = { id: "u1", name: "単元1", isLearned: false, referenceGrade: "小3" };

  it("全て習得済みの場合 ✅ を表示する", () => {
    const el = buildRecommendedUnitCard(
      "math",
      item,
      { mastered: 5, total: 5, inProgressCount: 0, isStudying: false },
      () => {},
    );
    expect(el.querySelector(".subject-overview-status")?.textContent).toBe("✅");
  });

  it("学習中の場合 🔄 を表示する", () => {
    const el = buildRecommendedUnitCard(
      "math",
      item,
      { mastered: 1, total: 5, inProgressCount: 0, isStudying: true },
      () => {},
    );
    expect(el.querySelector(".subject-overview-status")?.textContent).toBe("🔄");
  });

  it("未学習の場合 ⬜ を表示する", () => {
    const el = buildRecommendedUnitCard(
      "math",
      item,
      { mastered: 0, total: 5, inProgressCount: 0, isStudying: false },
      () => {},
    );
    expect(el.querySelector(".subject-overview-status")?.textContent).toBe("⬜");
  });

  it("クリック・Enter キーで onActivate が呼ばれる", () => {
    const onActivate = vi.fn();
    const el = buildRecommendedUnitCard(
      "math",
      item,
      { mastered: 0, total: 5, inProgressCount: 0, isStudying: false },
      onActivate,
    );
    el.dispatchEvent(new MouseEvent("click"));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("inProgressCount > 0 のとき進捗を 'm(p)/t' 形式で表示する", () => {
    const el = buildRecommendedUnitCard(
      "math",
      item,
      { mastered: 2, total: 10, inProgressCount: 3, isStudying: true },
      () => {},
    );
    expect(el.querySelector(".subject-overview-pct")?.textContent).toBe("2(3)/10");
  });

  it("total が 0 の場合は進捗テキストを表示しない", () => {
    const el = buildRecommendedUnitCard(
      "math",
      { ...item, referenceGrade: undefined },
      { mastered: 0, total: 0, inProgressCount: 0, isStudying: false },
      () => {},
    );
    expect(el.querySelector(".subject-overview-pct")).toBeNull();
  });
});
