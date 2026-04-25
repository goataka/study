/**
 * OcrService — Tesseract.js を使ったOCR（光学文字認識）サービス。
 * キャンバスの手書き文字を認識するために使用する。
 */

import { createWorker, type Worker } from "tesseract.js";

export class OcrService {
  private worker: Worker | null = null;

  // ─── ワーカー初期化 ────────────────────────────────────────────────────────

  /**
   * OCR ワーカーを初期化する。初回呼び出し時のみ初期化を行う。
   * 日本語と英語の両方を認識対象とする。
   */
  async initialize(): Promise<void> {
    if (this.worker) return;
    this.worker = await createWorker(["jpn", "eng"]);
  }

  // ─── OCR実行 ──────────────────────────────────────────────────────────────

  /**
   * キャンバス要素から手書き文字を認識する。
   * @param canvas OCR対象のキャンバス要素
   * @returns 認識された文字列（空の場合は空文字）
   */
  async recognize(canvas: HTMLCanvasElement): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }
    const { data } = await this.worker!.recognize(canvas);
    return data.text.trim();
  }

  // ─── クリーンアップ ────────────────────────────────────────────────────────

  /**
   * OCR ワーカーを終了する。
   */
  async destroy(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
