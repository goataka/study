/**
 * `panelTab` / `panelTabs` 共通スタイルの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { panelTab, panelTabs } from "./panelTabStyles";

describe("panelTab", () => {
  it("セマンティッククラス `panel-tab` を含む（テスト・font-size 切替用）", () => {
    expect(panelTab().split(/\s+/)).toContain("panel-tab");
  });

  it("active 用 arbitrary variant を含む", () => {
    expect(panelTab()).toMatch(/\[&\.active\]:/);
  });
});

describe("panelTabs", () => {
  it("セマンティッククラス `panel-tabs` を含む", () => {
    expect(panelTabs().split(/\s+/)).toContain("panel-tabs");
  });

  it("flex レイアウトを宣言する", () => {
    expect(panelTabs().split(/\s+/)).toContain("flex");
  });
});
