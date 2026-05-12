import type { Question } from "../../application/quizUseCase";

export function canSpeakEnglishQuestion(question: Question): boolean {
  return (
    question.subject === "english" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakEnglishQuestionText(questionText: string): void {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(questionText.trim());
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch {
    // 読み上げ非対応環境では何もしない
  }
}
