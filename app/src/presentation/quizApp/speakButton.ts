/**
 * 問題文の読み上げボタン (`#speakBtn`) の表示・クリックハンドラ更新ヘルパー。
 *
 * 現仕様では問題画面の読み上げボタンは常に非表示とし、
 * 読み上げ導線は問題一覧・解答一覧側に集約する。
 */

import type { Question } from "../../application/quizUseCase";

/**
 * 互換性のために残している更新フック。
 * 常に `#speakBtn` を hidden にし、onclick を解除する。
 */
export function updateSpeakButton(_question?: Question): void {
  const btn = document.getElementById("speakBtn");
  if (!btn) return;
  btn.classList.add("hidden");
  btn.onclick = null;
}
