/**
 * `resultItem` / `resultIcon` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { resultIcon, resultItem } from "./resultItemStyles";

describe("resultItem スタイル（CVA）", () => {
  it("result='correct' で result-item correct セマンティッククラスを出力する", () => {
    const tokens = resultItem({ result: "correct" }).split(/\s+/);
    expect(tokens).toContain("result-item");
    expect(tokens).toContain("correct");
    expect(tokens).not.toContain("incorrect");
  });

  it("result='incorrect' で result-item incorrect セマンティッククラスを出力する", () => {
    const tokens = resultItem({ result: "incorrect" }).split(/\s+/);
    expect(tokens).toContain("result-item");
    expect(tokens).toContain("incorrect");
    expect(tokens).not.toContain("correct");
  });
});

describe("resultIcon スタイル（CVA）", () => {
  it("result='correct' で result-icon クラスを含み正解色を出力する", () => {
    const cls = resultIcon({ result: "correct" });
    expect(cls.split(/\s+/)).toContain("result-icon");
    expect(cls).toContain("text-[#38ef7d]");
  });

  it("result='incorrect' で不正解色を出力する", () => {
    const cls = resultIcon({ result: "incorrect" });
    expect(cls.split(/\s+/)).toContain("result-icon");
    expect(cls).toContain("text-[#f45c43]");
  });
});
