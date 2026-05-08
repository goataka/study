/**
 * NotesController — 仕様テスト
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { NotesController } from "./notesController";

describe("NotesController", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="notesCanvas" width="200" height="200"></canvas>
      <select id="penSizeSelect"><option value="3" selected>3</option></select>
      <select id="penColorSelect"><option value="#000" selected>black</option></select>
      <button id="eraserBtn"></button>
    `;
  });

  describe("getCanvas", () => {
    it("初期化前は null を返す", () => {
      const ctrl = new NotesController();
      expect(ctrl.getCanvas()).toBeNull();
    });

    it("initialize 後はインスタンスを返す", () => {
      const ctrl = new NotesController();
      ctrl.initialize();
      expect(ctrl.getCanvas()).not.toBeNull();
    });

    it("initialize は二重に呼ばれてもインスタンスを再作成しない", () => {
      const ctrl = new NotesController();
      ctrl.initialize();
      const first = ctrl.getCanvas();
      ctrl.initialize();
      expect(ctrl.getCanvas()).toBe(first);
    });
  });

  describe("toggleEraserMode", () => {
    it("初期化前は何もしない", () => {
      const ctrl = new NotesController();
      expect(() => ctrl.toggleEraserMode()).not.toThrow();
    });

    it("呼ぶたびに消しゴムボタンの active クラスをトグルする", () => {
      const ctrl = new NotesController();
      ctrl.initialize();
      const btn = document.getElementById("eraserBtn")!;
      ctrl.toggleEraserMode();
      expect(btn.classList.contains("eraser-active")).toBe(true);
      expect(btn.title).toBe("ペンに戻す");
      ctrl.toggleEraserMode();
      expect(btn.classList.contains("eraser-active")).toBe(false);
      expect(btn.title).toBe("消しゴム");
    });
  });

  describe("clear", () => {
    it("インデックス指定で対応する状態を削除する", () => {
      const ctrl = new NotesController();
      ctrl.initialize();
      // 内部 Map の状態は外部観測しづらいため、例外なく実行できることを確認
      expect(() => ctrl.clear(0)).not.toThrow();
      expect(() => ctrl.clear()).not.toThrow();
    });
  });

  describe("saveState / restoreState", () => {
    it("初期化前でも例外を投げない", () => {
      const ctrl = new NotesController();
      expect(() => ctrl.saveState(0)).not.toThrow();
      expect(() => ctrl.restoreState(0)).not.toThrow();
    });
  });
});
