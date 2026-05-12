/**
 * `choiceLabel` / `choiceInput` / `choiceText` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { choiceLabel, choiceInput, choiceText } from "./choiceStyles";

describe("choiceLabel (CVA)", () => {
  it("choice-label クラスを含む", () => {
    const cls = choiceLabel();
    expect(cls).toContain("choice-label");
  });

  it("has-[input:disabled] スタイルを含む", () => {
    const cls = choiceLabel();
    expect(cls).toContain("has-[input:disabled]");
  });
});

describe("choiceInput (CVA)", () => {
  it("peer クラスを含む", () => {
    const cls = choiceInput();
    expect(cls).toContain("peer");
  });
});

describe("choiceText (CVA)", () => {
  it("choice-text クラスを含む", () => {
    const cls = choiceText();
    expect(cls).toContain("choice-text");
  });

  it("peer-checked スタイルを含む", () => {
    const cls = choiceText();
    expect(cls).toContain("peer-checked:");
  });
});
