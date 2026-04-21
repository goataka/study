/**
 * NotesCanvas のユニットテスト
 *
 * 注: Canvas操作はDOM環境が必要なため、E2Eテストで検証する。
 * ここでは基本的なインターフェース確認と、jsdomスタブを使った状態操作の検証を行う。
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotesCanvas } from "./notesCanvas";

// canvas/getContext/toDataURL のスタブを作成するヘルパー
function createCanvasStub() {
  const clearRectMock = vi.fn();
  const drawImageMock = vi.fn();

  const ctxStub = {
    lineCap: "",
    lineJoin: "",
    strokeStyle: "",
    lineWidth: 0,
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: clearRectMock,
    drawImage: drawImageMock,
  };

  const canvasStub = {
    getContext: vi.fn().mockReturnValue(ctxStub),
    getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 300, height: 150 }),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,abc123"),
    width: 300,
    height: 150,
    addEventListener: vi.fn(),
  };

  return { canvasStub, ctxStub, clearRectMock, drawImageMock };
}

describe("NotesCanvas", () => {
  describe("インスタンス生成", () => {
    it("NotesCanvasクラスをインスタンス化できる", () => {
      const notesCanvas = new NotesCanvas();
      expect(notesCanvas).toBeInstanceOf(NotesCanvas);
    });
  });

  describe("公開メソッドの存在確認", () => {
    it("必要なメソッドがすべて存在する", () => {
      const notesCanvas = new NotesCanvas();

      expect(typeof notesCanvas.initialize).toBe("function");
      expect(typeof notesCanvas.setPenSize).toBe("function");
      expect(typeof notesCanvas.setPenColor).toBe("function");
      expect(typeof notesCanvas.clear).toBe("function");
      expect(typeof notesCanvas.save).toBe("function");
      expect(typeof notesCanvas.restore).toBe("function");
      expect(typeof notesCanvas.destroy).toBe("function");
    });
  });

  describe("パラメータの型確認", () => {
    it("setPenSizeは数値を受け取る", () => {
      const notesCanvas = new NotesCanvas();
      expect(() => notesCanvas.setPenSize(4)).not.toThrow();
    });

    it("setPenColorは文字列を受け取る", () => {
      const notesCanvas = new NotesCanvas();
      expect(() => notesCanvas.setPenColor("#000000")).not.toThrow();
    });
  });

  describe("canvas未初期化時の安全な振る舞い", () => {
    it("clearはcanvasが未設定でも例外を投げない", () => {
      const notesCanvas = new NotesCanvas();
      expect(() => notesCanvas.clear()).not.toThrow();
    });

    it("saveはcanvasが未設定のときnullを返す", () => {
      const notesCanvas = new NotesCanvas();
      expect(notesCanvas.save()).toBeNull();
    });

    it("restoreはcanvasが未設定でも例外を投げない", () => {
      const notesCanvas = new NotesCanvas();
      expect(() => notesCanvas.restore({ dataUrl: "data:image/png;base64,abc" })).not.toThrow();
    });

    it("destroyはcanvasが未設定でも例外を投げない", () => {
      const notesCanvas = new NotesCanvas();
      expect(() => notesCanvas.destroy()).not.toThrow();
    });
  });

  describe("canvasスタブを使った状態操作の検証", () => {
    let notesCanvas: NotesCanvas;
    let clearRectMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const stubs = createCanvasStub();
      clearRectMock = stubs.clearRectMock;
      const canvasStub = stubs.canvasStub;

      // jsdom に canvas 要素を追加してスタブを差し込む
      const el = document.createElement("canvas");
      el.id = "testCanvas";
      el.getContext = canvasStub.getContext as unknown as typeof el.getContext;
      el.getBoundingClientRect = canvasStub.getBoundingClientRect;
      el.toDataURL = canvasStub.toDataURL;
      document.body.appendChild(el);

      notesCanvas = new NotesCanvas();
      notesCanvas.initialize("testCanvas");
    });

    it("clearはclearRectを呼び出す", () => {
      notesCanvas.clear();
      expect(clearRectMock).toHaveBeenCalled();
    });

    it("saveはdataUrlを含むオブジェクトを返す", () => {
      const state = notesCanvas.save();
      expect(state).not.toBeNull();
      expect(typeof state?.dataUrl).toBe("string");
      expect(state?.dataUrl.length).toBeGreaterThan(0);
    });

    it("restoreは例外を投げない", () => {
      expect(() => notesCanvas.restore({ dataUrl: "data:image/png;base64,abc" })).not.toThrow();
    });

    it("destroyの後はsaveがnullを返す", () => {
      notesCanvas.destroy();
      expect(notesCanvas.save()).toBeNull();
    });
  });
});

