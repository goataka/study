/**
 * クイズ結果画面の解答一覧（`#resultDetails` 配下）を描画する React コンポーネント。
 * もともと `resultItemView.ts` の `buildResultItem` が `document.createElement` で
 * 構築していた DOM を JSX に置き換えたもの。
 *
 * 既存テスト・E2E 互換性のため、生成される class 名と DOM 階層は元実装と同じに保つ。
 */

import type { AnswerResult } from "../../application/quizUseCase";

export interface ResultDetailsListProps {
  results: AnswerResult[];
}

/** `<h3>解答一覧</h3>` + 1 問ずつの結果アイテム。 */
export function ResultDetailsList({ results }: ResultDetailsListProps): React.JSX.Element {
  return (
    <>
      <h3>解答一覧</h3>
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

  return (
    <div className={`result-item ${isCorrect ? "correct" : "incorrect"}`}>
      <div className="result-header">
        <span className="result-icon">{isCorrect ? "✓" : "✗"}</span>
        <span className="result-question">{question.question}</span>
        <span className="result-user-answer">
          {"あなた: "}
          <strong>{userAnswerText}</strong>
        </span>
      </div>
      <div className="result-answer">
        <div>
          {"正解: "}
          <strong>{correctAnswerText}</strong>
        </div>
        <div className="explanation">{question.explanation}</div>
      </div>
    </div>
  );
}
