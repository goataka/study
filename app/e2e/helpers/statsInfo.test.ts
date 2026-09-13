import { describe, expect, it } from "vitest";
import { STATS_INFO_PATTERN } from "./statsInfo";

describe("STATS_INFO_PATTERN", () => {
  it("0問・通常数値・カンマ区切り数値の全件数表示に一致する", () => {
    expect(STATS_INFO_PATTERN.test("学習中：0問 / 学習済：0問 / 全：0問")).toBe(true);
    expect(STATS_INFO_PATTERN.test("学習中：1問 / 学習済：2問 / 全：3993問")).toBe(true);
    expect(STATS_INFO_PATTERN.test("学習中：1問 / 学習済：2問 / 全：3,993問")).toBe(true);
  });

  it("全件数表示がない文字列には一致しない", () => {
    expect(STATS_INFO_PATTERN.test("読み込み中...")).toBe(false);
  });
});
