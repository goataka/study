import { describe, expect, it } from "vitest";
import {
  detectFileKeyFromFilename,
  formatExportFilename,
  formatPreviewText,
  truncateArray,
  validateImportPayload,
} from "./adminPanelLogic";

describe("truncateArray 関数", () => {
  it("件数が maxItems 以下ならそのまま返す（コピー）", () => {
    const arr = [1, 2, 3];
    const out = truncateArray(arr, 5);
    expect(out).toEqual([1, 2, 3]);
    expect(out).not.toBe(arr); // copy
  });
  it("件数が maxItems を超えたら切り詰めてサマリ文字列を末尾に付ける", () => {
    const arr = Array.from({ length: 60 }, (_, i) => i);
    const out = truncateArray(arr, 50);
    expect(out.length).toBe(51);
    expect(out[50]).toBe("... (10件省略、合計60件)");
  });
});

describe("detectFileKeyFromFilename 関数", () => {
  it("history を含むファイル名は history", () => {
    expect(detectFileKeyFromFilename("study-history-2024.json")).toBe("history");
  });
  it("mastered を含むなら mastered", () => {
    expect(detectFileKeyFromFilename("backup-mastered.json")).toBe("mastered");
  });
  it("streaks を含むなら streaks", () => {
    expect(detectFileKeyFromFilename("a-streaks-b.json")).toBe("streaks");
  });
  it("settings を含むなら settings", () => {
    expect(detectFileKeyFromFilename("settings-export.json")).toBe("settings");
  });
  it("どれも含まなければ null", () => {
    expect(detectFileKeyFromFilename("data.json")).toBeNull();
  });
  it("history が settings より優先される（先頭から探索）", () => {
    expect(detectFileKeyFromFilename("history-settings.json")).toBe("history");
  });
});

describe("validateImportPayload 関数", () => {
  it("history で配列ならOK", () => {
    expect(validateImportPayload("history", [], "履歴")).toBeNull();
  });
  it("history で非配列ならエラー", () => {
    expect(validateImportPayload("history", { x: 1 }, "履歴")).toContain("配列が必要");
  });
  it("mastered で配列ならOK", () => {
    expect(validateImportPayload("mastered", ["q1"], "学習済")).toBeNull();
  });
  it("mastered で非配列ならエラー", () => {
    expect(validateImportPayload("mastered", "x", "学習済")).toContain("配列が必要");
  });
  it("streaks でオブジェクトならOK", () => {
    expect(validateImportPayload("streaks", { q1: 5 }, "連続")).toBeNull();
  });
  it("streaks で配列ならエラー", () => {
    expect(validateImportPayload("streaks", [], "連続")).toContain("オブジェクトが必要");
  });
  it("streaks で null ならエラー", () => {
    expect(validateImportPayload("streaks", null, "連続")).toContain("オブジェクトが必要");
  });
});

describe("formatPreviewText 関数", () => {
  it("インデント整形した JSON を返す", () => {
    expect(formatPreviewText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it("maxChars を超えたら切り詰めて省略マークを付ける", () => {
    const big = Array.from({ length: 200 }, (_, i) => `item${i}`);
    const out = formatPreviewText(big, 100);
    expect(out.length).toBeLessThanOrEqual(110);
    expect(out.endsWith("\n...(省略)")).toBe(true);
  });
});

describe("formatExportFilename 関数", () => {
  it("study-data-YYYY-MM-DD.json 形式", () => {
    const filename = formatExportFilename(new Date("2024-03-15T12:00:00Z"));
    expect(filename).toBe("study-data-2024-03-15.json");
  });
});
