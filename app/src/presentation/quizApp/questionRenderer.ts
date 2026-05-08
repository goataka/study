/**
 * クイズ画面の問題表示更新ヘルパー。
 *
 * 問題番号・トピック表示・進捗バー・問題文・選択肢・フィードバック・ナビゲーションボタンを
 * 一括で更新する純粋な DOM 操作関数。
 */

import type { Question } from "../../domain/question";
import type { QuizSession } from "../../domain/quizSession";
import type { KanjiCanvasController } from "../kanjiCanvasController";
import { setText } from "../uiHelpers";
import { renderMultipleChoice, renderTextInput } from "./choicesRenderer";
import { updateSpeakButton } from "./speakButton";
import { showAnswerFeedback, hideAnswerFeedback } from "./answerFeedback";
import { updateNavigationButtons } from "./navigationButtons";
import { updateNotesAreaForQuestion } from "./notesAreaUpdater";

/** 問題描画時のコールバック群。 */
export interface RenderQuestionCallbacks {
  onAnswered: (q: Question, idx: number, text?: string) => void;
  onTextAnswered: (q: Question) => void;
}

/**
 * 現在のセッションの問題を画面に描画する。
 */
export function renderQuestion(
  session: QuizSession,
  kanjiCanvasController: KanjiCanvasController,
  callbacks: RenderQuestionCallbacks,
): void {
  const question = session.currentQuestion;
  const total = session.totalCount;
  const idx = session.currentIndex;

  setText("questionNumber", `問題 ${idx + 1} / ${total}`);
  const topicParts: string[] = [];
  if (question.topCategoryName) topicParts.push(question.topCategoryName);
  if (question.parentCategoryName) topicParts.push(question.parentCategoryName);
  topicParts.push(question.categoryName ?? question.category);
  setText("topicName", topicParts.join(" › "));

  const progress = ((idx + 1) / total) * 100;
  const progressFill = document.getElementById("progressFill") as HTMLElement | null;
  if (progressFill) progressFill.style.width = `${progress}%`;

  setText("questionText", question.question);
  updateSpeakButton(question);
  renderChoicesByType(question, session, callbacks);

  // メモエリアをタッチペン入力モード用に更新
  const isAnswered = session.getAnswer(session.currentIndex) !== undefined;
  updateNotesAreaForQuestion(question, isAnswered, kanjiCanvasController);

  // 既に回答済みの場合はフィードバックを表示、未回答の場合は非表示
  const userAnswer = session.getAnswer(session.currentIndex);
  if (userAnswer !== undefined) {
    const userAnswerText =
      question.questionType === "text-input" ? session.getTextAnswer(session.currentIndex) : undefined;
    showAnswerFeedback(question, userAnswer, userAnswerText);
  } else {
    hideAnswerFeedback();
  }

  updateNavigationButtons(session);
}

/** 出題形式に応じて選択肢／テキスト入力の描画を振り分ける。 */
export function renderChoicesByType(
  question: Question,
  session: QuizSession,
  callbacks: RenderQuestionCallbacks,
): void {
  if (question.questionType === "text-input") {
    renderTextInput(question, session, callbacks);
  } else {
    renderMultipleChoice(question, session, callbacks);
  }
}
