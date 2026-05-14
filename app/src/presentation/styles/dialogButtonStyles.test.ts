/**
 * `dialogButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { dialogButton } from "./dialogButtonStyles";

describe("dialogButton スタイル（CVA）", () => {
  it("confirm バリアントでは緑系のスタイルを出力する", () => {
    const cls = dialogButton({ variant: "confirm" });
    expect(cls).toContain("bg-[#28a745]");
    expect(cls).toContain("text-white");
  });

  it("cancel バリアントでは白地グレー文字のスタイルを出力する", () => {
    const cls = dialogButton({ variant: "cancel" });
    expect(cls).toContain("bg-white");
    expect(cls).toContain("text-[#586069]");
  });

  it("デフォルトは confirm バリアント", () => {
    const cls = dialogButton();
    expect(cls).toContain("bg-[#28a745]");
  });
});
