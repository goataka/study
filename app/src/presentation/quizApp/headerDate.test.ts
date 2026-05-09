// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { updateHeaderTodayDate } from "./headerDate";

describe("updateHeaderTodayDate", () => {
  beforeEach(() => {
    document.body.innerHTML = `<span id="headerTodayDate"></span>`;
  });

  it("YYYY/MM/DD（曜日）形式で表示する（金曜日）", () => {
    // 2026-05-08 は金曜日
    updateHeaderTodayDate(new Date(2026, 4, 8));
    expect(document.getElementById("headerTodayDate")?.textContent).toBe("2026/05/08（金）");
  });

  it("月・日が 1 桁のときゼロ埋めする", () => {
    // 2026-01-03 は土曜日
    updateHeaderTodayDate(new Date(2026, 0, 3));
    expect(document.getElementById("headerTodayDate")?.textContent).toBe("2026/01/03（土）");
  });

  it("曜日マッピングが日曜〜土曜まで正しい", () => {
    // 2026-01-04(日) から 7 日連続を検証
    const expected = ["日", "月", "火", "水", "木", "金", "土"];
    for (let i = 0; i < 7; i += 1) {
      updateHeaderTodayDate(new Date(2026, 0, 4 + i));
      const text = document.getElementById("headerTodayDate")?.textContent ?? "";
      expect(text.endsWith(`（${expected[i]}）`)).toBe(true);
    }
  });

  it("#headerTodayDate が存在しない場合は安全に何もしない", () => {
    document.body.innerHTML = "";
    expect(() => updateHeaderTodayDate(new Date(2026, 4, 8))).not.toThrow();
  });
});
