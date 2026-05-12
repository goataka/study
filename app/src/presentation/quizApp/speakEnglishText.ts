import type { Question } from "../../application/quizUseCase";

const QUOTED_SPEECH_PATTERNS = [/「([^」]+)」/, /`([^`]+)`/] as const;
const TRAILING_HINT_PATTERN = /\s*\([^)]*\)\s*$/;

export function extractSpeechText(questionText: string): string {
  const trimmed = questionText.trim();
  for (const pattern of QUOTED_SPEECH_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return trimmed.replace(TRAILING_HINT_PATTERN, "").trim();
}

export function canSpeakEnglishQuestion(question: Question): boolean {
  return (
    question.subject === "english" &&
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakEnglishQuestionText(questionText: string): void {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(extractSpeechText(questionText));
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch {
    // 読み上げ非対応環境では何もしない
  }
}
