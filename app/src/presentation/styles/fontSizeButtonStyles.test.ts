/**
 * `fontSizeButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { fontSizeButton } from "./fontSizeButtonStyles";

describe("fontSizeButton スタイル（CVA）", () => {
  it("セマンティッククラスを含む", () => {
    const cls = fontSizeButton({ size: "small" });
    expect(cls).toContain("font-size-btn");
  });

  it("size='small' で small テキストサイズクラスを出力する", () => {
    const cls = fontSizeButton({ size: "small" });
    expect(cls).toContain("text-[11px]");
    expect(cls).not.toContain("text-[15px]");
    expect(cls).not.toContain("text-[19px]");
  });

  it("size='medium' で medium テキストサイズクラスを出力する", () => {
    const cls = fontSizeButton({ size: "medium" });
    expect(cls).toContain("text-[15px]");
    expect(cls).not.toContain("text-[11px]");
  });

  it("size='large' で large テキストサイズクラスを出力する", () => {
    const cls = fontSizeButton({ size: "large" });
    expect(cls).toContain("text-[19px]");
  });

  it("active=true で active クラスを出力する", () => {
    const tokens = fontSizeButton({ size: "medium", active: true }).split(/\s+/);
    expect(tokens).toContain("active");
  });

  it("active=false で active クラスを出力しない", () => {
    const tokens = fontSizeButton({ size: "medium", active: false }).split(/\s+/);
    expect(tokens).not.toContain("active");
  });
});
