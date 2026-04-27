/**
 * OcrService — Tesseract.js を使ったOCR（光学文字認識）サービス。
 * キャンバスの手書き文字を認識するために使用する。
 */

import { createWorker, PSM, OEM, type Worker } from "tesseract.js";

export class OcrService {
  private worker: Worker | null = null;

  // ─── ワーカー初期化 ────────────────────────────────────────────────────────

  /**
   * OCR ワーカーを初期化する。初回呼び出し時のみ初期化を行う。
   * 日本語と英語の両方を認識対象とし、手書き入力向けの設定を適用する。
   */
  async initialize(): Promise<void> {
    if (this.worker) return;
    this.worker = await createWorker(["jpn", "eng"], OEM.LSTM_ONLY);
    // 1行のテキストとして認識する設定（手書き入力に最適）
    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
  }

  // ─── 画像前処理 ────────────────────────────────────────────────────────────

  /**
   * 前処理用のキャンバス要素を生成する。
   * テストではこのメソッドをスタブして、生成キャンバスを差し替えられるようにする。
   */
  protected createCanvasElement(): HTMLCanvasElement {
    return document.createElement("canvas");
  }

  /**
   * キャンバスから 2D コンテキストを取得する。
   * テストではこのメソッドをスタブして、描画呼び出しを検証しやすくする。
   */
  protected getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    return canvas.getContext("2d");
  }

  /**
   * 認識精度向上のためにキャンバスを前処理する。
   * - 白背景を追加（Tesseractは白背景に黒文字が最も得意）
   * - 最低300pxのサイズを確保（小さすぎる画像は認識率が低い）
   * - 余白を追加（文字が端で切れるのを防ぐ）
   * 元画像は縦横比を保ったまま描画する（非等倍スケールによる文字歪みを防ぐ）。
   */
  protected preprocessCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
    const padding = 20;
    const minSize = 300;

    const srcWidth = source.width || minSize;
    const srcHeight = source.height || minSize;
    const destWidth = Math.max(srcWidth, minSize);
    const destHeight = Math.max(srcHeight, minSize);

    const offscreen = this.createCanvasElement();
    offscreen.width = destWidth + padding * 2;
    offscreen.height = destHeight + padding * 2;

    const ctx = this.getCanvasContext(offscreen);
    if (!ctx) return source;

    // 白背景で埋める（透明キャンバスはTesseractの認識率が低い）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // 元のキャンバスを縦横比を保ったままパディング付きで描画
    ctx.drawImage(source, padding, padding, srcWidth, srcHeight);

    return offscreen;
  }

  // ─── テキスト後処理 ────────────────────────────────────────────────────────

  /**
   * OCR結果のテキストをクリーンアップする。
   * - 前後の空白・改行を除去
   * - 日本語文字（ひらがな・カタカナ・漢字）間の余分なスペースを除去
   *   （Tesseractは日本語文字間にスペースを挿入しがち）
   */
  private cleanRecognizedText(text: string): string {
    return text
      .trim()
      .replace(/\n+/g, " ")
      .replace(/(?<=[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF])\s+(?=[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF])/g, "")
      .replace(/\s+/g, " ")
      .trim();
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
    const processed = this.preprocessCanvas(canvas);
    const { data } = await this.worker!.recognize(processed);
    return this.cleanRecognizedText(data.text);
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
