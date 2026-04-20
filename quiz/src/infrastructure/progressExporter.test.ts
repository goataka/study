/**
 * ProgressExporter のテスト
 */

import { describe, it, expect } from "vitest";
import { ProgressExporter } from "./progressExporter";
import type { ProgressData } from "./progressExporter";

describe("ProgressExporter", () => {
  describe("serialize", () => {
    it("空の配列を正しくシリアライズできる", () => {
      const json = ProgressExporter.serialize([]);
      const data = JSON.parse(json) as ProgressData;

      expect(data.version).toBe("1.0.0");
      expect(data.wrongQuestionIds).toEqual([]);
      expect(data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("問題IDのリストを正しくシリアライズできる", () => {
      const wrongIds = ["phonics-1-a", "add-2", "sub-5"];
      const json = ProgressExporter.serialize(wrongIds);
      const data = JSON.parse(json) as ProgressData;

      expect(data.version).toBe("1.0.0");
      expect(data.wrongQuestionIds).toEqual(wrongIds);
      expect(data.exportedAt).toBeTruthy();
    });

    it("exportedAtが現在時刻のISO文字列である", () => {
      const before = new Date();
      const json = ProgressExporter.serialize(["test-1"]);
      const after = new Date();
      const data = JSON.parse(json) as ProgressData;

      const exportedDate = new Date(data.exportedAt);
      expect(exportedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(exportedDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("JSONフォーマットが整形されている（インデント付き）", () => {
      const json = ProgressExporter.serialize(["test-1"]);
      expect(json).toContain("\n");
      expect(json).toContain("  ");
    });
  });
});
