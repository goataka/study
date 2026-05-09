/**
 * 問題一覧パネル（questions タブ）の React コンポーネント。
 * 旧版の `buildQuestionListItem`（命令的 DOM 構築 + click ハンドラ）を
 * `QuestionListItem` に置き換え、ヒント表示の開閉を `useState` で管理する。
 *
 * 既存テスト・E2E 互換性のため、生成される class 名・aria-* 属性は元実装と完全一致させる。
 */

import { useState } from "react";
import { flushSync } from "react-dom";
import type { Question } from "../../domain/question";
import type { QuizUseCase } from "../../application/quizUseCase";

export interface QuestionListProps {
  questions: Question[];
  useCase: QuizUseCase;
}

/** 問題一覧（フィルター適用後の配列）。空配列なら空メッセージを表示する。 */
export function QuestionList({ questions, useCase }: QuestionListProps): React.JSX.Element {
  if (questions.length === 0) {
    return <p className="history-empty">この単元に問題はありません。</p>;
  }
  return (
    <>
      {questions.map((q) => (
        <QuestionListItem key={q.id} question={q} useCase={useCase} />
      ))}
    </>
  );
}

interface QuestionListItemProps {
  question: Question;
  useCase: QuizUseCase;
}

function QuestionListItem({ question, useCase }: QuestionListItemProps): React.JSX.Element {
  const [hintOpen, setHintOpen] = useState(false);
  const stat = useCase.getQuestionStat(question.id);
  const isCompleted = useCase.isMastered(question.id);
  const streak = useCase.getCorrectStreak(question.id);

  const itemClass = `question-list-item${isCompleted ? " question-list-completed" : ""}`;

  let statText: string;
  if (stat.total > 0) {
    const maxStreak = 3;
    const filledStar = "⭐";
    const emptyStar = "☆";
    const starStr = isCompleted
      ? "🏆"
      : Array.from({ length: maxStreak }, (_, i) => (i < streak ? filledStar : emptyStar)).join("");
    statText = `${starStr} 全${stat.total}回`;
  } else {
    statText = "-";
  }

  return (
    <div className={itemClass}>
      <div className="question-list-row">
        <span className="question-list-text">{question.question}</span>
        <span className="question-list-stat">{statText}</span>
        <button
          type="button"
          className="question-list-hint-btn"
          aria-label="ヒントを表示"
          aria-expanded={hintOpen}
          // flushSync は既存テスト互換のため一時的に使用（クリック直後に hidden 状態を assert する仕様）。
          // 将来テストを async 対応に書き換えた段階で除去予定。
          onClick={() => flushSync(() => setHintOpen((v) => !v))}
        >
          💡
        </button>
      </div>
      <div className={hintOpen ? "question-list-hint" : "question-list-hint hidden"}>
        <span className="question-list-correct">{`✓ ${question.choices[question.correct]}`}</span>
        {question.explanation && <div className="question-list-hint-explanation">{question.explanation}</div>}
      </div>
    </div>
  );
}
