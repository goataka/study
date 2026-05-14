/**
 * `scoreCircle` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { scoreCircle } from "./scoreCircleStyles";

describe("scoreCircle スタイル（CVA）", () => {
  it("result='pass' で pass クラスを出力する", () => {
    const tokens = scoreCircle({ result: "pass" }).split(/\s+/);
    expect(tokens).toContain("score-circle");
    expect(tokens).toContain("pass");
    expect(tokens).not.toContain("fail");
    expect(tokens).not.toContain("perfect");
  });

  it("result='fail' で fail クラスを出力する", () => {
    const tokens = scoreCircle({ result: "fail" }).split(/\s+/);
    expect(tokens).toContain("fail");
    expect(tokens).not.toContain("pass");
    expect(tokens).not.toContain("perfect");
  });

  it("result='perfect' で perfect クラスを出力する", () => {
    const tokens = scoreCircle({ result: "perfect" }).split(/\s+/);
    expect(tokens).toContain("perfect");
    expect(tokens).not.toContain("pass");
    expect(tokens).not.toContain("fail");
  });

  it("常に score-circle セマンティッククラスを含む（テスト・レスポンシブ用）", () => {
    for (const result of ["pass", "fail", "perfect"] as const) {
      expect(scoreCircle({ result }).split(/\s+/)).toContain("score-circle");
    }
  });
});
