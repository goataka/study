import type { Question, QuizSession } from "../../application/quizUseCase";

type Listener = () => void;

interface QuizFeedbackSnapshot {
  visible: boolean;
  isCorrect: boolean;
  resultText: string;
  explanation: string;
}

export interface QuizSessionSnapshot {
  question: Question | null;
  questionNumberText: string;
  topicName: string;
  progressPercent: number;
  answerFeedback: QuizFeedbackSnapshot;
  prevDisabled: boolean;
  nextDisabled: boolean;
  nextHidden: boolean;
  submitDisabled: boolean;
  submitHidden: boolean;
  showKanjiInput: boolean;
  showSpeakButton: boolean;
}

const initialSnapshot: QuizSessionSnapshot = {
  question: null,
  questionNumberText: "",
  topicName: "",
  progressPercent: 0,
  answerFeedback: {
    visible: false,
    isCorrect: false,
    resultText: "",
    explanation: "",
  },
  prevDisabled: true,
  nextDisabled: true,
  nextHidden: false,
  submitDisabled: true,
  submitHidden: true,
  showKanjiInput: false,
  showSpeakButton: false,
};

let snapshot = initialSnapshot;
const listeners = new Set<Listener>();

export function subscribeQuizSessionStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQuizSessionSnapshot(): QuizSessionSnapshot {
  return snapshot;
}

export function clearQuizSessionStore(): void {
  snapshot = initialSnapshot;
  listeners.forEach((listener) => listener());
}

export function syncQuizSessionStore(session: QuizSession, options: { kanjiAvailable: boolean }): void {
  const question = session.currentQuestion;
  const idx = session.currentIndex;
  const total = session.totalCount;
  const userAnswer = session.getAnswer(idx);
  const isAnswered = userAnswer !== undefined;
  const isCorrect = isAnswered && userAnswer === question.correct;
  const isTextInput = question.questionType === "text-input";
  const userAnswerText = isTextInput ? session.getTextAnswer(idx) : undefined;
  const correctAnswer = question.choices[question.correct] ?? "";
  const resultText = isAnswered
    ? isCorrect
      ? "✅ 正解です！"
      : isTextInput
        ? userAnswerText
          ? `❌ 不正解です。あなたの解答「${userAnswerText}」→ 正解は「${correctAnswer}」`
          : `❌ 不正解です。正解は「${correctAnswer}」`
        : `❌ 不正解です。正解は「${correctAnswer}」です。`
    : "";
  const isLast = idx === total - 1;
  const showKanjiInput = isTextInput && !isAnswered && options.kanjiAvailable;
  const isSpeechAvailable =
    typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";

  snapshot = {
    question,
    questionNumberText: `問題 ${idx + 1} / ${total}`,
    topicName: `No. ${idx + 1}`,
    progressPercent: ((idx + 1) / total) * 100,
    answerFeedback: {
      visible: isAnswered,
      isCorrect,
      resultText,
      explanation: question.explanation,
    },
    prevDisabled: idx === 0,
    nextDisabled: !isLast && !isAnswered,
    nextHidden: isLast,
    submitDisabled: isLast ? !session.canSubmit() : true,
    submitHidden: !isLast,
    showKanjiInput,
    showSpeakButton: question.subject === "english" && isSpeechAvailable,
  };

  listeners.forEach((listener) => listener());
}
