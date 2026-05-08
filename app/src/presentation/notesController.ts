/**
 * presentation/notesController — 手書きメモエリアの状態管理。
 *
 * `quizApp.ts` から手書きメモまわりの責務を切り出した薄いコントローラー。
 * - `NotesCanvas` インスタンスのライフサイクル管理（初期化／取得）
 * - 問題ごとのメモ状態（DrawingState）の保持・復元
 * - 消しゴムモードの切替と関連 UI 更新
 *
 * クリーンアーキテクチャ上の位置付け: presentation 層内のサブコントローラー。
 * `NotesCanvas`（同層・低レベル DOM ラッパー）に依存し、QuizApp は本コントローラーへ移譲する。
 */

import { NotesCanvas, type DrawingState } from "./notesCanvas";

export class NotesController {
  private notesCanvas: NotesCanvas | null = null;
  private notesStates: Map<number, DrawingState> = new Map();

  /** メモキャンバスを初期化する（初回のみ）。デフォルトのペンサイズ・色を DOM から復元する。 */
  initialize(): void {
    if (!this.notesCanvas) {
      this.notesCanvas = new NotesCanvas();
      this.notesCanvas.initialize("notesCanvas");

      // デフォルト設定を適用
      const penSizeSelect = document.getElementById("penSizeSelect") as HTMLSelectElement | null;
      const penColorSelect = document.getElementById("penColorSelect") as HTMLSelectElement | null;

      if (penSizeSelect) {
        this.notesCanvas.setPenSize(parseInt(penSizeSelect.value));
      }
      if (penColorSelect) {
        this.notesCanvas.setPenColor(penColorSelect.value);
      }
    }
  }

  /** メモキャンバスのインスタンスを返す（未初期化なら null）。 */
  getCanvas(): NotesCanvas | null {
    return this.notesCanvas;
  }

  /** 指定した問題インデックスの現在のメモ状態を保存する。 */
  saveState(questionIndex: number): void {
    const state = this.notesCanvas?.save();
    if (state) {
      this.notesStates.set(questionIndex, state);
    }
  }

  /** 指定した問題インデックスのメモ状態を復元する。なければクリアする。 */
  restoreState(questionIndex: number): void {
    const state = this.notesStates.get(questionIndex);
    if (state) {
      this.notesCanvas?.restore(state);
    } else {
      this.notesCanvas?.clear();
    }
  }

  /**
   * 指定した問題インデックスのメモ状態を削除し、キャンバスをクリアする。
   * インデックス未指定の場合はキャンバスのクリアのみ行う。
   */
  clear(questionIndex?: number): void {
    if (questionIndex !== undefined) {
      this.notesStates.delete(questionIndex);
    }
    this.notesCanvas?.clear();
  }

  /** 全ての問題のメモ状態を削除する。 */
  clearAllStates(): void {
    this.notesStates.clear();
  }

  /** 消しゴムモードをトグルし、対応するボタン UI を更新する。 */
  toggleEraserMode(): void {
    if (!this.notesCanvas) return;
    const isEraser = !this.notesCanvas.isEraserMode;
    this.notesCanvas.setEraserMode(isEraser);
    const eraserBtn = document.getElementById("eraserBtn");
    if (eraserBtn) {
      eraserBtn.classList.toggle("eraser-active", isEraser);
      eraserBtn.title = isEraser ? "ペンに戻す" : "消しゴム";
    }
  }
}
