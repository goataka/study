/**
 * KanjiCanvasController — 仕様テスト
 *
 * 注: 実際の漢字認識は KanjiCanvas グローバル（vendor）に依存するため、
 *     ここでは利用可否判定と DOM 連携の最小限の動作確認のみ行う。
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KanjiCanvasController } from "./kanjiCanvasController";

describe("KanjiCanvasController", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="kanjiCanvas" width="200" height="200"></canvas>
      <div id="kanjiCandidateList"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete (globalThis as unknown as { KanjiCanvas?: unknown }).KanjiCanvas;
  });

  describe("isAvailable", () => {
    it("KanjiCanvas グローバルが未定義のとき false を返す", () => {
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      expect(ctrl.isAvailable()).toBe(false);
    });

    it("KanjiCanvas グローバルが存在するとき true を返す", () => {
      (globalThis as unknown as { KanjiCanvas: unknown }).KanjiCanvas = { dummy: true };
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      expect(ctrl.isAvailable()).toBe(true);
    });
  });

  describe("applyToggleBtnState", () => {
    it("expanded=true で ▲・展開済みラベルを設定する", () => {
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      const btn = document.createElement("button");
      ctrl.applyToggleBtnState(btn, true);
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      expect(btn.textContent).toBe("▲");
      expect(btn.title).toBe("入力エリアを折りたたむ");
    });

    it("expanded=false で ▼・展開ラベルを設定する", () => {
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      const btn = document.createElement("button");
      ctrl.applyToggleBtnState(btn, false);
      expect(btn.getAttribute("aria-expanded")).toBe("false");
      expect(btn.textContent).toBe("▼");
      expect(btn.title).toBe("入力エリアを展開する");
    });
  });

  describe("erase / deleteLast — KanjiCanvas 未読込時", () => {
    it("isAvailable=false でも例外を投げず、候補リストをクリアする", () => {
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      const candidateList = document.getElementById("kanjiCandidateList")!;
      candidateList.innerHTML = '<button class="kanji-candidate-btn">あ</button>';
      ctrl.erase();
      expect(candidateList.innerHTML).toBe("");
    });

    it("初期化前に deleteLast を呼んでも何もしない", () => {
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      expect(() => ctrl.deleteLast()).not.toThrow();
    });
  });

  describe("updateCandidates — 候補フィルタ", () => {
    it("ひらがな問題の場合はひらがな以外を除外する", () => {
      const onSelectCandidate = vi.fn();
      (globalThis as unknown as { KanjiCanvas: unknown }).KanjiCanvas = {
        recognize: () => "あ A 漢 い",
      };
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => "あい",
        onSelectCandidate,
      });
      ctrl.updateCandidates();
      const buttons = document.querySelectorAll(".kanji-candidate-btn");
      const texts = Array.from(buttons).map((b) => b.textContent);
      expect(texts).toEqual(["あ", "い"]);
    });

    it("英語問題（ラテン文字）の場合はラテン文字以外を除外する", () => {
      const onSelectCandidate = vi.fn();
      (globalThis as unknown as { KanjiCanvas: unknown }).KanjiCanvas = {
        recognize: () => "A あ B 漢",
      };
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => "AB",
        onSelectCandidate,
      });
      ctrl.updateCandidates();
      const buttons = document.querySelectorAll(".kanji-candidate-btn");
      const texts = Array.from(buttons).map((b) => b.textContent);
      expect(texts).toEqual(["A", "B"]);
    });

    it("正解情報がないときはフィルタせず最大5候補まで表示する", () => {
      (globalThis as unknown as { KanjiCanvas: unknown }).KanjiCanvas = {
        recognize: () => "一 二 三 四 五 六 七",
      };
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      ctrl.updateCandidates();
      expect(document.querySelectorAll(".kanji-candidate-btn").length).toBe(5);
    });

    it("認識結果が空の場合は候補リストをクリアする", () => {
      (globalThis as unknown as { KanjiCanvas: unknown }).KanjiCanvas = {
        recognize: () => "",
      };
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate: () => {},
      });
      const candidateList = document.getElementById("kanjiCandidateList")!;
      candidateList.innerHTML = '<button class="kanji-candidate-btn">既存</button>';
      ctrl.updateCandidates();
      expect(candidateList.innerHTML).toBe("");
    });

    it("候補ボタンクリックで onSelectCandidate コールバックが呼ばれる", () => {
      const onSelectCandidate = vi.fn();
      const erase = vi.fn();
      (globalThis as unknown as { KanjiCanvas: unknown }).KanjiCanvas = {
        recognize: () => "あ",
        erase,
      };
      const ctrl = new KanjiCanvasController({
        getCorrectAnswer: () => undefined,
        onSelectCandidate,
      });
      ctrl.updateCandidates();
      const btn = document.querySelector<HTMLButtonElement>(".kanji-candidate-btn");
      btn?.click();
      expect(onSelectCandidate).toHaveBeenCalledWith("あ");
    });
  });
});
