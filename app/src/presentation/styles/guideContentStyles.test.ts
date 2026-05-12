/**
 * `guideContent` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { guideContent } from "./guideContentStyles";

describe("guideContent (CVA)", () => {
  it("guide-content セマンティッククラスを含む", () => {
    const cls = guideContent();
    expect(cls).toContain("guide-content");
  });

  it("Tailwind ユーティリティを含む", () => {
    const cls = guideContent();
    expect(cls).toContain("px-4");
    expect(cls).toContain("py-3");
    expect(cls).toContain("text-[14px]");
    expect(cls).toContain("leading-relaxed");
    expect(cls).toContain("text-[#24292e]");
  });
});
