// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { formatTodayText } from "./NotesPanel";

describe("formatTodayText", () => {
  it("月日をゼロ埋めし、曜日を含む形式で返す", () => {
    expect(formatTodayText(new Date(2026, 0, 3))).toBe("2026/01/03（土）");
  });

  it("曜日マッピングが日曜から土曜まで正しい", () => {
    const expected = ["日", "月", "火", "水", "木", "金", "土"];
    for (let i = 0; i < 7; i += 1) {
      expect(formatTodayText(new Date(2026, 0, 4 + i))).toBe(
        `2026/01/${String(4 + i).padStart(2, "0")}（${expected[i]}）`,
      );
    }
  });
});
