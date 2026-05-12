/**
 * `subjectTab` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { subjectTab } from "./subjectTabStyles";

describe("subjectTab (CVA)", () => {
  it("subject-tab セマンティッククラスを含む", () => {
    const cls = subjectTab();
    expect(cls).toContain("subject-tab");
  });

  it("active=true で active クラスを出力する", () => {
    const tokens = subjectTab({ active: true }).split(/\s+/);
    expect(tokens).toContain("active");
  });

  it("active=false で active クラスを出力しない", () => {
    const tokens = subjectTab({ active: false }).split(/\s+/);
    expect(tokens).not.toContain("active");
  });

  it("デフォルトは active=false", () => {
    const tokens = subjectTab().split(/\s+/);
    expect(tokens).not.toContain("active");
  });
});
