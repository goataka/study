/**
 * クイズ結果画面の解答一覧（`#resultDetails` 配下）を描画する React コンポーネント。
 * もともと `resultItemView.ts` の `buildResultItem` が `document.createElement` で
 * 構築していた DOM を JSX に置き換えたもの。
 *
 * 既存テスト・E2E 互換性のため、生成される class 名と DOM 階層は元実装と同じに保つ。
 * `result-item` / `correct` / `incorrect` / `result-icon` などのセマンティック
 * クラス名は CVA レシピ（`resultItem` / `resultIcon`）の出力に含めて維持する。
 * `result-question` / `result-user-answer` / `result-answer` は font-size 切替
 * （`15-font-size.css`）が参照キーとするため className に残置する。
 */

import type { AnswerResult } from "../../application/quizUseCase";
import { resultIcon, resultItem } from "../styles/resultItemStyles";
import { speakButton } from "../styles/speakButtonStyles";

export interface ResultDetailsListProps {
  results: AnswerResult[];
}

/** `<h3>解答一覧</h3>` + 1 問ずつの結果アイテム。 */
export function ResultDetailsList({ results }: ResultDetailsListProps): React.JSX.Element {
  return (
    <>
      {/* `.result-details h3` の font-size 上書きが詳細度で勝つため、ここでは Tailwind の base のみ宣言する */}
      <h3 className="mb-5 text-[22px] text-[#333]">解答一覧</h3>
      {results.map((r, idx) => (
        <ResultItem key={`${r.question.id ?? idx}-${idx}`} result={r} />
      ))}
    </>
  );
}

interface ResultItemProps {
  result: AnswerResult;
}

function ResultItem({ result }: ResultItemProps): React.JSX.Element {
  const { question, userAnswerIndex, isCorrect } = result;
  const userAnswerText =
    question.questionType === "text-input"
      ? (result.userAnswerText ?? "（未入力）")
      : (question.choices[userAnswerIndex] ?? "未回答");
  const correctAnswerText = question.choices[question.correct] ?? "";
  const variant = isCorrect ? "correct" : "incorrect";
  const canSpeakEnglish =
    question.subject === "english" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined";

  const handleSpeakClick = (): void => {
    if (!canSpeakEnglish) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question.question.trim());
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch {
      // 読み上げ非対応環境では何もしない
    }
  };

  return (
    <div className={resultItem({ result: variant })}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={resultIcon({ result: variant })}>{isCorrect ? "✓" : "✗"}</span>
        <span className="result-question flex-1 text-lg font-bold text-[#333]">{question.question}</span>
        {canSpeakEnglish && (
          <button
            type="button"
            className={`${speakButton()} !mb-0 !mr-1 !px-2.5 !py-0.5`}
            aria-label="問題文を読み上げる"
            title="問題文を読み上げる"
            onClick={handleSpeakClick}
          >
            🔊
          </button>
        )}
        <span className="result-user-answer shrink-0 text-right text-[15px] whitespace-nowrap text-[#666]">
          {"あなた: "}
          <strong className="text-[#333]">{userAnswerText}</strong>
        </span>
      </div>
      <div className="result-answer ml-[34px] text-base text-[#666] [&>div]:mb-1.5 [&_strong]:text-[#333]">
        <div>
          {"正解: "}
          <strong>{correctAnswerText}</strong>
        </div>
        <div className="mt-2 rounded bg-[#f0f7ff] px-3 py-2 text-[#0366d6] italic">{question.explanation}</div>
      </div>
    </div>
  );
}
