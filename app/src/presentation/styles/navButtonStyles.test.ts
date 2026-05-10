/**
 * `navButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { navButton } from "./navButtonStyles";

describe("navButton (CVA)", () => {
  it("variant='nav' で nav-btn セマンティッククラスを含む", () => {
    const tokens = navButton({ variant: "nav" }).split(/\s+/);
    expect(tokens).toContain("nav-btn");
    expect(tokens).not.toContain("submit-btn");
  });

  it("variant='submit' で submit-btn セマンティッククラスを含む", () => {
    const tokens = navButton({ variant: "submit" }).split(/\s+/);
    expect(tokens).toContain("submit-btn");
    expect(tokens).not.toContain("nav-btn");
  });

  it("常に flex-1 を含む（ナビ列での均等配分）", () => {
    expect(navButton({ variant: "nav" }).split(/\s+/)).toContain("flex-1");
    expect(navButton({ variant: "submit" }).split(/\s+/)).toContain("flex-1");
  });
});
