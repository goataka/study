/**
 * KanjiCanvas グローバルオブジェクトの型定義。
 * kanji-canvas.min.js と ref-patterns.js をロードすることで window.KanjiCanvas が提供される。
 */

interface KanjiCanvasStatic {
  /**
   * 指定したIDのcanvas要素をKanjiCanvasとして初期化する。
   * マウス・タッチ両対応のイベントリスナーを設定する。
   */
  init(canvasId: string): void;

  /**
   * キャンバスの全ストロークを消去する。
   */
  erase(canvasId: string): void;

  /**
   * 最後に描いたストロークを取り消す。
   */
  deleteLast(canvasId: string): void;

  /**
   * 描かれたストロークを認識して候補漢字を返す。
   * canvas要素に data-candidate-list 属性がある場合は、その要素の innerHTML に候補を設定する。
   * @returns 候補漢字をスペース区切りで並べた文字列（最大10文字）
   */
  recognize(canvasId: string): string;
}

declare const KanjiCanvas: KanjiCanvasStatic;
