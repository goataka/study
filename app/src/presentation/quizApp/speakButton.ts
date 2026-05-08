/**
 * 問題文の読み上げボタン (`#speakBtn`) の表示・クリックハンドラ更新ヘルパー。
 *
 * 英語の問題かつ Web Speech API が利用可能な場合のみボタンを表示し、
 * クリック時にアメリカ英語（en-US）で読み上げる。
 */

import type { Question } from "../../domain/question";

const TRAILING_HINT_PATTERN = /\s*\([^)]*\)\s*$/;

function extractSpeechText(questionText: string): string {
  const trimmed = questionText.trim();
  const quotedText = trimmed.match(/「([^」]+)」/);
  if (quotedText?.[1]) return quotedText[1];

  const backtickText = trimmed.match(/`([^`]+)`/);
  if (backtickText?.[1]) return backtickText[1];

  return trimmed.replace(TRAILING_HINT_PATTERN, "").trim();
}

/**
 * 現在の問題に応じて読み上げボタンの表示・クリックハンドラを更新する。
 */
export function updateSpeakButton(question: Question): void {
  const btn = document.getElementById("speakBtn");
  if (!btn) return;

  const isSpeechAvailable =
    typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";

  if (question.subject === "english" && isSpeechAvailable) {
    btn.classList.remove("hidden");
    btn.onclick = () => {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(extractSpeechText(question.question));
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
      } catch {
        // 読み上げがサポートされていない環境ではスキップする
      }
    };
  } else {
    btn.classList.add("hidden");
    btn.onclick = null;
  }
}
