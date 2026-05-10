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

  // `choice-label` / `choice-text` のクラス名は答え合わせ用テスト
  // （`querySelector(".choice-label" / ".choice-text")`）で参照されるため残置している。
  // `:has(input:disabled)` 系の状態スタイルは Tailwind の `has-[…]` バリアントで表現し、
  // `<input>:checked + .choice-text` の文字色変化は `peer-checked:` で表現する。
  const labelClass =
    "choice-label flex cursor-pointer items-center rounded-lg border-2 border-solid border-[#e0e0e0] px-5 py-[15px] transition-all duration-300" +
    " hover:border-[#0366d6] hover:bg-[#f0f7ff]" +
    " has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60" +
    " has-[input:disabled]:hover:border-[#e0e0e0] has-[input:disabled]:hover:bg-transparent" +
    " has-[input:disabled:checked]:border-[#0366d6] has-[input:disabled:checked]:bg-[#f0f7ff] has-[input:disabled:checked]:opacity-100";
  const inputClass = "peer mr-[15px] h-5 w-5 cursor-pointer disabled:cursor-not-allowed";
  const textClass = "choice-text text-xl text-[#333] peer-checked:font-bold peer-checked:text-[#0366d6]";

  return (
    <>
      {question.choices.map((choice, index) => (
        <label key={index} className={labelClass}>
          <input
            type="radio"
            name="answer"
            value={String(index)}
            checked={picked === index}
            disabled={isLocked}
            className={inputClass}
            onChange={() => {
              if (isLocked) return;
              session.selectAnswer(session.currentIndex, index);
              setPicked(index);
              callbacks.onAnswered(question, index);
            }}
          />
          <span className={textClass}>{choice}</span>
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
  // `answered` を依存配列に含めない（マウント時の状態のみで判定すれば十分なため）。
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
    <div className="text-answer-wrapper flex flex-col gap-3 py-2.5">
      <input
        ref={inputRef}
        type="text"
        className="text-answer-input box-border w-full rounded-lg border-2 border-solid border-[#e1e4e8] px-4 py-3.5 font-[inherit] text-2xl outline-none transition-colors duration-200 focus:border-[#0366d6] focus:shadow-[0_0_0_3px_rgba(3,102,214,0.2)] disabled:cursor-not-allowed disabled:bg-[#f6f8fa] disabled:text-[#586069]"
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
      <button
        type="button"
        className="text-answer-submit-btn cursor-pointer self-start rounded-md border-none bg-[#0366d6] px-6 py-2.5 text-lg font-semibold text-white transition-colors duration-200 hover:not-disabled:bg-[#0256b9] disabled:cursor-not-allowed disabled:bg-[#c8e1ff]"
        disabled={answered}
        onClick={handleSubmit}
      >
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
