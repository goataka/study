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
  OEM: { LSTM_ONLY: 1 },
  PSM: { SINGLE_LINE: "7" },
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: { text: "モック認識結果\n" },
    }),
    setParameters: vi.fn().mockResolvedValue(undefined),
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

    it("日本語文字間の余分なスペースが除去される", async () => {
      const { createWorker } = await import("tesseract.js");
      const createWorkerMock = createWorker as ReturnType<typeof vi.fn>;
      createWorkerMock.mockClear();

      const workerMock = {
        recognize: vi.fn().mockResolvedValue({ data: { text: "山 川 海\n" } }),
        setParameters: vi.fn().mockResolvedValue(undefined),
        terminate: vi.fn().mockResolvedValue(undefined),
      };
      createWorkerMock.mockResolvedValueOnce(workerMock);

      const canvas = document.createElement("canvas");
      const result = await service.recognize(canvas);
      // 日本語文字間のスペースが除去されて "山川海" になる
      expect(result).toBe("山川海");
    });
  });

  describe("initialize メソッド", () => {
    it("OEM.LSTM_ONLY を指定してワーカーを初期化する", async () => {
      const service = new OcrService();
      const { createWorker, OEM } = await import("tesseract.js");
      (createWorker as ReturnType<typeof vi.fn>).mockClear();
      await service.initialize();
      expect(createWorker).toHaveBeenCalledTimes(1);
      expect(createWorker).toHaveBeenCalledWith(["jpn", "eng"], OEM.LSTM_ONLY);
      await service.destroy();
    });

    it("初期化後に PSM.SINGLE_LINE パラメータが設定される", async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      (createWorker as ReturnType<typeof vi.fn>).mockClear();
      const service = new OcrService();
      await service.initialize();
      const worker = await (createWorker as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(worker.setParameters).toHaveBeenCalledWith({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      await service.destroy();
    });
  });

  describe("preprocessCanvas メソッド", () => {
    it("パディング付きの白背景キャンバスが生成される", () => {
      const padding = 20;

      // getContext をスタブして描画呼び出しを記録する
      const fillRectCalls: Parameters<CanvasRenderingContext2D["fillRect"]>[] = [];
      const drawImageCalls: unknown[][] = [];
      const ctxStub = {
        fillRect: vi.fn((...args: Parameters<CanvasRenderingContext2D["fillRect"]>) => { fillRectCalls.push(args); }),
        drawImage: vi.fn((...args: unknown[]) => { drawImageCalls.push(args); }),
        fillStyle: "",
      } as unknown as CanvasRenderingContext2D;

      class TestableOcrService extends OcrService {
        override getCanvasContext(_canvas: HTMLCanvasElement) { return ctxStub; }
      }

      const service = new TestableOcrService();
      const source = document.createElement("canvas");
      // minSize(300) 以上の値で縦横比を確認する
      source.width = 400;
      source.height = 320;

      const result = (service as unknown as { preprocessCanvas: (c: HTMLCanvasElement) => HTMLCanvasElement }).preprocessCanvas(source);

      // destWidth=max(400,300)=400, destHeight=max(320,300)=320, + padding*2
      expect(result.width).toBe(400 + padding * 2);
      expect(result.height).toBe(320 + padding * 2);

      // 白背景の fillRect が呼ばれていること
      expect(fillRectCalls[0]).toEqual([0, 0, 440, 360]);

      // drawImage が padding オフセット・元サイズで呼ばれていること（縦横比保持）
      expect(drawImageCalls[0]).toEqual([source, padding, padding, 400, 320]);
    });

    it("元キャンバスが minSize 未満の場合は最低300pxが確保される", () => {
      const padding = 20;
      const minSize = 300;

      const ctxStub = {
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        fillStyle: "",
      } as unknown as CanvasRenderingContext2D;

      class TestableOcrService extends OcrService {
        override getCanvasContext(_canvas: HTMLCanvasElement) { return ctxStub; }
      }

      const service = new TestableOcrService();
      const source = document.createElement("canvas");
      source.width = 100;
      source.height = 50;

      const result = (service as unknown as { preprocessCanvas: (c: HTMLCanvasElement) => HTMLCanvasElement }).preprocessCanvas(source);

      // destWidth = max(100, 300) = 300, destHeight = max(50, 300) = 300
      expect(result.width).toBe(minSize + padding * 2);
      expect(result.height).toBe(minSize + padding * 2);

      // drawImage は元の srcWidth/srcHeight で呼ばれる（縦横比保持）
      const drawImageCalls = (ctxStub.drawImage as ReturnType<typeof vi.fn>).mock.calls;
      expect(drawImageCalls[0]).toEqual([source, padding, padding, 100, 50]);
    });

    it("getContext が null を返す場合は元のキャンバスをそのまま返す", () => {
      class TestableOcrService extends OcrService {
        override getCanvasContext(_canvas: HTMLCanvasElement) { return null; }
      }

      const service = new TestableOcrService();
      const source = document.createElement("canvas");
      source.width = 200;
      source.height = 100;

      const result = (service as unknown as { preprocessCanvas: (c: HTMLCanvasElement) => HTMLCanvasElement }).preprocessCanvas(source);

      expect(result).toBe(source);
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
