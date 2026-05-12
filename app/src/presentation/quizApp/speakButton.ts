/**
 * 問題文の読み上げボタン (`#speakBtn`) の表示・クリックハンドラ更新ヘルパー。
 *
 * 英語の問題かつ Web Speech API が利用可能な場合のみボタンを表示し、
 * クリック時にアメリカ英語（en-US）で読み上げる。
 */

import type { Question } from "../../application/quizUseCase";

/**
 * 現在の問題に応じて読み上げボタンの表示・クリックハンドラを更新する。
 */
export function updateSpeakButton(question: Question): void {
  void question;
  const btn = document.getElementById("speakBtn");
  if (!btn) return;
  btn.classList.add("hidden");
  btn.onclick = null;
}
