/**
 * 選択肢（多肢選択／テキスト入力）の描画ヘルパー（React 版）。
 *
 * もともと `container.innerHTML = ""` + `createElement` で組み立てていた版を、
 * `MultipleChoice` / `TextInput` の React コンポーネントに置き換えた。
 * 公開 API（`renderMultipleChoice` / `renderTextInput`）はシグネチャを維持し、
 * 内部で `renderReactInto` を呼ぶ。
 */

import { useEffect, useRef, useState } from "react";
import type { Question } from "../../domain/question";
import type { QuizSession } from "../../domain/quizSession";
import { renderReactInto } from "./reactMount";

/** 回答後に QuizApp 側で実行するコールバック群。 */
export interface ChoiceRendererCallbacks {
  /** 選択（または確認）後の共通フィードバック・ボタン更新。 */
  onAnswered: (question: Question, answerIndex: number, userAnswerText?: string) => void;
  /** テキスト入力で確認後にメモエリアを切り替えるためのコールバック。 */
  onTextAnswered?: (question: Question) => void;
}

interface MultipleChoiceProps {
  question: Question;
  session: QuizSession;
  callbacks: ChoiceRendererCallbacks;
}

function MultipleChoice({ question, session, callbacks }: MultipleChoiceProps): React.JSX.Element {
  // 既回答状態（再描画またはこのセッション中にラジオ操作で確定したかを表す）。
  const initialAnswer = session.getAnswer(session.currentIndex);
  const [picked, setPicked] = useState<number | undefined>(initialAnswer);

  const isLocked = picked !== undefined;

  return (
    <>
      {question.choices.map((choice, index) => (
        <label key={index} className="choice-label">
          <input
            type="radio"
            name="answer"
            value={String(index)}
            checked={picked === index}
            disabled={isLocked && picked !== index ? true : isLocked}
            onChange={() => {
              if (isLocked) return;
              session.selectAnswer(session.currentIndex, index);
              setPicked(index);
              callbacks.onAnswered(question, index);
            }}
          />
          <span className="choice-text">{choice}</span>
        </label>
      ))}
    </>
  );
}

interface TextInputProps {
  question: Question;
  session: QuizSession;
  callbacks: ChoiceRendererCallbacks;
}

function TextInput({ question, session, callbacks }: TextInputProps): React.JSX.Element {
  const initialAnswerIndex = session.getAnswer(session.currentIndex);
  const [answered, setAnswered] = useState<boolean>(initialAnswerIndex !== undefined);
  const initialText = ((): string => {
    if (initialAnswerIndex === undefined) return "";
    const stored = session.getTextAnswer(session.currentIndex);
    if (stored !== undefined) return stored;
    if (initialAnswerIndex === question.correct) return question.choices[question.correct] ?? "";
    return "";
  })();
  const [text, setText] = useState<string>(initialText);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 初回マウント時のみ、PC/タッチ非対応端末で自動フォーカス。
  useEffect(() => {
    if (!answered && shouldAutoFocusTextInput()) {
      inputRef.current?.focus();
    }
  }, []);

  const handleSubmit = (): void => {
    if (answered) return;
    // テスト等で `inputRef.current.value` を直接書き換えるケースに対応するため
    // DOM の値を優先し、無ければ React state を使う。
    const raw = inputRef.current?.value ?? text;
    const trimmed = raw.trim();
    if (!trimmed) return;
    session.selectTextAnswer(session.currentIndex, trimmed);
    const answerIndex = session.getAnswer(session.currentIndex)!;
    setAnswered(true);
    setText(trimmed);
    callbacks.onAnswered(question, answerIndex, trimmed);
    callbacks.onTextAnswered?.(question);
  };

  return (
    <div className="text-answer-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="text-answer-input"
        placeholder="答えを入力してください"
        aria-label="解答を入力"
        disabled={answered}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) return;
          e.preventDefault();
          handleSubmit();
        }}
      />
      <button type="button" className="text-answer-submit-btn" disabled={answered} onClick={handleSubmit}>
        確認する
      </button>
    </div>
  );
}

function shouldAutoFocusTextInput(): boolean {
  // PC またはタッチ非対応デバイスでのみ自動フォーカスし、スマホではキーボードの不要な表示を避ける。
  const hasFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  return hasFinePointer || !hasTouchPoints;
}

// ─── 公開 API（既存呼び出し元と互換） ───────────────────────────────────

/**
 * 多肢選択型問題の選択肢を描画する（互換 API）。
 * 既に回答済みなら disable 状態で表示し、選択時には `callbacks.onAnswered` を呼ぶ。
 */
export function renderMultipleChoice(
  question: Question,
  session: QuizSession,
  callbacks: ChoiceRendererCallbacks,
): void {
  const container = document.getElementById("choicesContainer");
  if (!container) return;
  // 問題が変わった時に React の useState を初期化するため、key に問題インデックス＋ID を含める。
  const key = `${session.currentIndex}-${question.id}`;
  renderReactInto(container, <MultipleChoice key={key} question={question} session={session} callbacks={callbacks} />);
}

/**
 * テキスト入力型問題の入力フォームを描画する（互換 API）。
 * 確認ボタンまたは Enter で `callbacks.onAnswered` と `callbacks.onTextAnswered` を呼ぶ。
 */
export function renderTextInput(question: Question, session: QuizSession, callbacks: ChoiceRendererCallbacks): void {
  const container = document.getElementById("choicesContainer");
  if (!container) return;
  const key = `${session.currentIndex}-${question.id}`;
  renderReactInto(container, <TextInput key={key} question={question} session={session} callbacks={callbacks} />);
}
