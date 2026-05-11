/**
 * `speakButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { speakButton } from "./speakButtonStyles";

describe("speakButton (CVA)", () => {
  it("hidden=false でセマンティッククラスを含む", () => {
    const cls = speakButton({ hidden: false });
    expect(cls).toContain("speak-btn");
    expect(cls).not.toContain("hidden");
  });

  it("hidden=true で hidden クラスを出力する", () => {
    const cls = speakButton({ hidden: true });
    expect(cls).toContain("speak-btn");
    expect(cls).toContain("hidden");
  });

  it("デフォルトは hidden=false", () => {
    const cls = speakButton();
    expect(cls).toContain("speak-btn");
    expect(cls).not.toContain("hidden");
  });
});
