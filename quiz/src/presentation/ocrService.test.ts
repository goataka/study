/**
 * OcrService のユニットテスト
 *
 * 注: Tesseract.js の実際のOCR処理はブラウザ環境が必要なため、E2Eテストで検証する。
 * ここでは基本的なインターフェース確認と、モックを使った動作検証を行う。
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OcrService } from "./ocrService";

// tesseract.js のモック
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: { text: "モック認識結果\n" },
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("OcrService", () => {
  describe("インスタンス生成", () => {
    it("OcrServiceクラスをインスタンス化できる", () => {
      const service = new OcrService();
      expect(service).toBeInstanceOf(OcrService);
    });
  });

  describe("公開メソッドの存在確認", () => {
    it("必要なメソッドがすべて存在する", () => {
      const service = new OcrService();
      expect(typeof service.initialize).toBe("function");
      expect(typeof service.recognize).toBe("function");
      expect(typeof service.destroy).toBe("function");
    });
  });

  describe("recognize メソッド", () => {
    let service: OcrService;

    beforeEach(() => {
      service = new OcrService();
    });

    afterEach(async () => {
      await service.destroy();
    });

    it("キャンバス要素を受け取ってOCR結果（文字列）を返す", async () => {
      const canvas = document.createElement("canvas");
      const result = await service.recognize(canvas);
      expect(typeof result).toBe("string");
    });

    it("OCR結果の前後の空白がトリムされて返される", async () => {
      const canvas = document.createElement("canvas");
      const result = await service.recognize(canvas);
      // モックは "モック認識結果\n" を返すので、trimされて "モック認識結果" になる
      expect(result).toBe("モック認識結果");
    });

    it("複数回呼び出しても同じワーカーを再利用する", async () => {
      const { createWorker } = await import("tesseract.js");
      const createWorkerMock = createWorker as ReturnType<typeof vi.fn>;
      createWorkerMock.mockClear();

      const canvas = document.createElement("canvas");

      await service.recognize(canvas);
      await service.recognize(canvas);

      // createWorker は初回のみ呼ばれる
      expect(createWorkerMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("destroy メソッド", () => {
    it("未初期化状態でdestroyしても例外を投げない", async () => {
      const service = new OcrService();
      await expect(service.destroy()).resolves.not.toThrow();
    });

    it("初期化後にdestroyするとワーカーが終了される", async () => {
      const { createWorker } = await import("tesseract.js");
      const service = new OcrService();
      const canvas = document.createElement("canvas");

      await service.recognize(canvas);
      const worker = await (createWorker as ReturnType<typeof vi.fn>).mock.results[0].value;
      await service.destroy();

      expect(worker.terminate).toHaveBeenCalled();
    });
  });
});
