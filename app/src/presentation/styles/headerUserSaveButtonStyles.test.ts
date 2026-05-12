/**
 * `headerUserSaveButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { headerUserSaveButton } from "./headerUserSaveButtonStyles";

describe("headerUserSaveButton (CVA)", () => {
  it("header-user-save-btn セマンティッククラスを含む", () => {
    const cls = headerUserSaveButton();
    expect(cls).toContain("header-user-save-btn");
  });

  it("緑系の背景色クラスを含む", () => {
    const cls = headerUserSaveButton();
    expect(cls).toContain("bg-[#28a745]");
  });

  it("hover スタイルを含む", () => {
    const cls = headerUserSaveButton();
    expect(cls).toContain("hover:bg-[#218838]");
  });
});
