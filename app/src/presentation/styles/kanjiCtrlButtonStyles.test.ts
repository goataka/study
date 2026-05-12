/**
 * `kanjiCtrlButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { kanjiCtrlButton } from "./kanjiCtrlButtonStyles";

describe("kanjiCtrlButton (CVA)", () => {
  it("操作ボタンのスタイルクラスを出力する", () => {
    const cls = kanjiCtrlButton();
    expect(cls).toContain("cursor-pointer");
    expect(cls).toContain("rounded");
    expect(cls).toContain("border");
  });

  it("hover スタイルを含む", () => {
    const cls = kanjiCtrlButton();
    expect(cls).toContain("hover:bg-[#f3f4f6]");
  });
});
