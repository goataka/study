/**
 * NotesCanvas のユニットテスト
 *
 * Note: Canvas操作はDOM環境が必要なため、E2Eテストで検証する。
 * ここでは基本的なインターフェース確認のみ行う。
 */

import { describe, it, expect } from "vitest";
import { NotesCanvas } from "./notesCanvas";

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
});

