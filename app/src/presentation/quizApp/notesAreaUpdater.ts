/**
 * 問題のタイプ・回答状態に応じてメモエリア（手書きキャンバス／KanjiCanvas 入力）を切り替えるヘルパー。
 */

import type { Question } from "../../domain/question";
import type { KanjiCanvasController } from "../kanjiCanvasController";

/**
 * メモエリアを問題タイプに応じて更新する。
 *
 * - text-input かつ未回答かつ KanjiCanvas 利用可能 → KanjiCanvas 入力エリアを表示
 * - それ以外                                       → KanjiCanvas を非表示にしてノートキャンバスを表示
 */
export function updateNotesAreaForQuestion(
  question: Question | null,
  isAnswered: boolean,
  kanjiCanvasController: KanjiCanvasController,
): void {
  const notesTitle = document.getElementById("notesTitle");
  const kanjiInputArea = document.getElementById("kanjiInputArea");
  const notesCanvas = document.getElementById("notesCanvas");
  const notesControls = document.querySelector<HTMLElement>(".notes-controls");

  const isTextInput = question?.questionType === "text-input";
  // KanjiCanvas が読み込まれていない場合はフォールバックとして通常ノートキャンバスを表示する
  const showKanji = isTextInput && !isAnswered && kanjiCanvasController.isAvailable();

  if (notesTitle) {
    notesTitle.textContent = showKanji ? "✏️ 1文字ずつ書いて漢字を入力できます" : "タッチペンで書けます";
  }
  if (kanjiInputArea) {
    kanjiInputArea.classList.toggle("hidden", !showKanji);
  }
  // KanjiCanvas表示時はトグルボタンを展開状態にリセットする
  if (showKanji) {
    const kanjiInputBody = document.getElementById("kanjiInputBody");
    const kanjiToggleBtn = document.getElementById("kanjiToggleBtn");
    if (kanjiInputBody) kanjiInputBody.classList.remove("hidden");
    if (kanjiToggleBtn) kanjiCanvasController.applyToggleBtnState(kanjiToggleBtn, true);
  }
  // KanjiCanvas使用時はノートキャンバスと通常コントロールを非表示
  if (notesCanvas) {
    notesCanvas.classList.toggle("hidden", showKanji);
  }
  if (notesControls) {
    notesControls.classList.toggle("hidden", showKanji);
  }

  if (showKanji) {
    kanjiCanvasController.initialize();
    kanjiCanvasController.erase();
    // 初期化時はストロークがないため候補は表示しない
  }
}
