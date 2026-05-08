/**
 * 選択肢（多肢選択／テキスト入力）の描画ヘルパー。
 *
 * 回答時のコールバックを引数で受け取ることで、QuizApp の他フィールドへの依存を切り離す。
 */

import type { Question } from "../../domain/question";
import type { QuizSession } from "../../domain/quizSession";

/** 回答後に QuizApp 側で実行するコールバック群。 */
export interface ChoiceRendererCallbacks {
  /** 選択（または確認）後の共通フィードバック・ボタン更新。 */
  onAnswered: (question: Question, answerIndex: number, userAnswerText?: string) => void;
  /** テキスト入力で確認後にメモエリアを切り替えるためのコールバック。 */
  onTextAnswered?: (question: Question) => void;
}

/**
 * 多肢選択型問題の選択肢を描画する。
 * 既に回答済みなら disable 状態で表示し、選択時には `callbacks.onAnswered` を呼ぶ。
 */
export function renderMultipleChoice(
  question: Question,
  session: QuizSession,
  callbacks: ChoiceRendererCallbacks,
): void {
  const container = document.getElementById("choicesContainer");
  if (!container) return;
  container.innerHTML = "";

  const existingAnswer = session.getAnswer(session.currentIndex);

  question.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice-label";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = String(index);
    input.checked = existingAnswer === index;
    input.disabled = existingAnswer !== undefined;
    input.addEventListener("change", () => {
      session.selectAnswer(session.currentIndex, index);
      callbacks.onAnswered(question, index);
      // 回答後は全選択肢を無効化して変更不可に
      container.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
        r.disabled = true;
      });
    });

    const span = document.createElement("span");
    span.className = "choice-text";
    span.textContent = choice;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}

/**
 * テキスト入力型問題の入力フォームを描画する。
 * 確認ボタンまたは Enter で `callbacks.onAnswered` と `callbacks.onTextAnswered` を呼ぶ。
 */
export function renderTextInput(question: Question, session: QuizSession, callbacks: ChoiceRendererCallbacks): void {
  const container = document.getElementById("choicesContainer");
  if (!container) return;
  container.innerHTML = "";

  const existingAnswerIndex = session.getAnswer(session.currentIndex);
  const isAnswered = existingAnswerIndex !== undefined;

  const wrapper = document.createElement("div");
  wrapper.className = "text-answer-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-answer-input";
  input.placeholder = "答えを入力してください";
  input.setAttribute("aria-label", "解答を入力");
  input.disabled = isAnswered;

  if (isAnswered) {
    // 既回答の場合、入力テキストを復元して表示
    const storedText = session.getTextAnswer(session.currentIndex);
    if (storedText !== undefined) {
      input.value = storedText;
    } else {
      // 後方互換: 正解インデックスと一致する場合は正解テキストを表示
      if (existingAnswerIndex === question.correct) {
        input.value = question.choices[question.correct] ?? "";
      }
    }
  }

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "text-answer-submit-btn";
  submitBtn.textContent = "確認する";
  submitBtn.disabled = isAnswered;

  const handleSubmit = (): void => {
    const text = input.value.trim();
    if (!text) return;
    session.selectTextAnswer(session.currentIndex, text);
    input.disabled = true;
    submitBtn.disabled = true;
    const answerIndex = session.getAnswer(session.currentIndex)!;
    callbacks.onAnswered(question, answerIndex, text);
    callbacks.onTextAnswered?.(question);
  };

  submitBtn.addEventListener("click", handleSubmit);
  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    handleSubmit();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(submitBtn);
  container.appendChild(wrapper);

  if (!isAnswered && shouldAutoFocusTextInput()) {
    input.focus();
  }
}
function shouldAutoFocusTextInput(): boolean {
  const hasFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  return hasFinePointer || !hasTouchPoints;
}
