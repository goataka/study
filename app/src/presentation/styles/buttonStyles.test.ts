/**
 * `button` CVA レシピの仕様テスト。
 *
 * 旧クラス名（`primary-btn` / `secondary-btn` / `tertiary-btn`）を
 * 出力に含むこと、`hidden=true` で `hidden` ユーティリティが付くこと、
 * デフォルトで variant="primary" / hidden=false が選ばれることを確認する。
 */

import { describe, expect, it } from "vitest";
import { button } from "./buttonStyles";

describe("button (CVA)", () => {
  it("デフォルトは primary バリアントで primary-btn クラスを出力する", () => {
    const cls = button();
    const tokens = cls.split(/\s+/);
    expect(tokens).toContain("primary-btn");
    expect(tokens).not.toContain("secondary-btn");
    expect(tokens).not.toContain("tertiary-btn");
    expect(tokens).not.toContain("hidden");
  });

  it("variant='secondary' で secondary-btn クラスを出力する", () => {
    const cls = button({ variant: "secondary" });
    expect(cls).toContain("secondary-btn");
    expect(cls).not.toContain("primary-btn");
  });

  it("variant='tertiary' で tertiary-btn クラスを出力する", () => {
    const cls = button({ variant: "tertiary" });
    expect(cls).toContain("tertiary-btn");
    expect(cls).not.toContain("primary-btn");
  });

  it("hidden=true で hidden ユーティリティを付与する", () => {
    const cls = button({ variant: "secondary", hidden: true });
    expect(cls).toContain("secondary-btn");
    expect(cls.split(/\s+/)).toContain("hidden");
  });

  it("disabled の opacity・cursor は base に含まれる", () => {
    const cls = button();
    expect(cls).toContain("disabled:opacity-50");
    expect(cls).toContain("disabled:cursor-not-allowed");
  });

  it("primary の hover で持ち上がる効果（translate-y）が含まれる", () => {
    const cls = button({ variant: "primary" });
    expect(cls).toContain("hover:not-disabled:-translate-y-0.5");
  });
});
