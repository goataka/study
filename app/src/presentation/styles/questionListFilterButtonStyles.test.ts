/**
 * `questionListFilterButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { questionListFilterButton } from "./questionListFilterButtonStyles";

describe("questionListFilterButton (CVA)", () => {
  it("セマンティッククラスを含む", () => {
    const cls = questionListFilterButton();
    expect(cls).toContain("question-list-filter-btn");
  });

  it("active クラスなしの通常状態のクラスを出力する", () => {
    const cls = questionListFilterButton();
    expect(cls).toContain("cursor-pointer");
    expect(cls).toContain("rounded-xl");
  });
});
