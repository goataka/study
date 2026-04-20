/**
 * ProgressImporter のテスト
 */

import { describe, it, expect } from "vitest";
import { ProgressImporter } from "./progressImporter";

describe("ProgressImporter", () => {
  describe("parse", () => {
    it("正しいJSON形式のデータをパースできる", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        exportedAt: "2026-04-20T10:00:00.000Z",
        wrongQuestionIds: ["phonics-1-a", "add-2"],
      });

      const wrongIds = ProgressImporter.parse(json);
      expect(wrongIds).toEqual(["phonics-1-a", "add-2"]);
    });

    it("空の問題IDリストをパースできる", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        exportedAt: "2026-04-20T10:00:00.000Z",
        wrongQuestionIds: [],
      });

      const wrongIds = ProgressImporter.parse(json);
      expect(wrongIds).toEqual([]);
    });

    it("不正なJSON文字列の場合はエラーをスローする", () => {
      const invalidJson = "{ invalid json }";
      expect(() => ProgressImporter.parse(invalidJson)).toThrow("JSONの解析に失敗しました");
    });

    it("versionフィールドがない場合はエラーをスローする", () => {
      const json = JSON.stringify({
        exportedAt: "2026-04-20T10:00:00.000Z",
        wrongQuestionIds: [],
      });

      expect(() => ProgressImporter.parse(json)).toThrow("バージョン情報が見つかりません");
    });

    it("exportedAtフィールドがない場合はエラーをスローする", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        wrongQuestionIds: [],
      });

      expect(() => ProgressImporter.parse(json)).toThrow("エクスポート日時が見つかりません");
    });

    it("wrongQuestionIdsフィールドがない場合はエラーをスローする", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        exportedAt: "2026-04-20T10:00:00.000Z",
      });

      expect(() => ProgressImporter.parse(json)).toThrow("問題IDのリストが見つかりません");
    });

    it("wrongQuestionIdsが配列でない場合はエラーをスローする", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        exportedAt: "2026-04-20T10:00:00.000Z",
        wrongQuestionIds: "not-an-array",
      });

      expect(() => ProgressImporter.parse(json)).toThrow("問題IDのリストが見つかりません");
    });

    it("wrongQuestionIdsの要素が文字列でない場合はエラーをスローする", () => {
      const json = JSON.stringify({
        version: "1.0.0",
        exportedAt: "2026-04-20T10:00:00.000Z",
        wrongQuestionIds: ["valid-id", 123, "another-valid-id"],
      });

      expect(() => ProgressImporter.parse(json)).toThrow("問題ID[1]が不正です");
    });

    it("データがnullの場合はエラーをスローする", () => {
      const json = "null";
      expect(() => ProgressImporter.parse(json)).toThrow("データが不正です");
    });

    it("データがプリミティブ型の場合はエラーをスローする", () => {
      const json = '"string"';
      expect(() => ProgressImporter.parse(json)).toThrow("データが不正です");
    });
  });
});
