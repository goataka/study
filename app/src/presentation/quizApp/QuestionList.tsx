/**
 * 問題一覧パネル（questions タブ）の React コンポーネント。
 * `QuestionListItem` がヒント表示の開閉を `useState` で管理する。
 *
 * E2E 互換性のため、生成される class 名・aria-* 属性は他のリストビューと統一されている。
 */

import { useState } from "react";
import { flushSync } from "react-dom";
import type { Question, QuizUseCase } from "../../application/quizUseCase";
import { speakButton } from "../styles/speakButtonStyles";
import { canSpeakEnglishQuestion, speakEnglishQuestionText } from "./speakEnglishText";

export interface QuestionListProps {
  questions: Question[];
  useCase: QuizUseCase;
}

/** 問題一覧（フィルター適用後の配列）。空配列なら空メッセージを表示する。 */
export function QuestionList({ questions, useCase }: QuestionListProps): React.JSX.Element {
  if (questions.length === 0) {
    return (
      <p className="history-empty py-10 px-5 text-center text-[17px] text-[#586069]">この単元に問題はありません。</p>
    );
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
  const canSpeakEnglish = canSpeakEnglishQuestion(question);

  const handleSpeakClick = (): void => {
    if (!canSpeakEnglish) return;
    speakEnglishQuestionText(question.question);
  };

  // `question-list-item` / `question-list-completed` クラス名は font-size 切替・テスト
  // セレクタ参照のため残置。背景・枠線・右上の折り目（::before / clip-path）も
  // Tailwind の arbitrary value + before: バリアントで表現する。
  const itemBaseClass =
    "question-list-item relative mb-2 rounded-lg border border-solid border-[#e1e4e8] bg-[#fafbfc] px-4 py-3" +
    " before:absolute before:top-[-1px] before:right-[-1px] before:block before:h-[18px] before:w-[18px]" +
    " before:rounded-tr-lg before:bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0_49%,#d9e3ee_50%_100%)]" +
    " before:[clip-path:polygon(100%_0,0_0,100%_100%)]" +
    " before:shadow-[-1px_1px_0_rgba(0,0,0,0.05)]" +
    " before:content-['']";
  const completedClass = "question-list-completed bg-[#fffbf0] border-l-[3px] border-l-[#f9c513]";
  const itemClass = `${itemBaseClass}${isCompleted ? ` ${completedClass}` : ""}`;

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
      <div className="question-list-row flex flex-wrap items-center gap-2">
        <span className="question-list-text flex-auto text-[17px] font-semibold leading-[1.5] text-[#24292e]">
          {question.question}
        </span>
        <span className="question-list-stat shrink-0 rounded-[10px] bg-black/5 px-1.5 py-0.5 text-[13px] whitespace-nowrap text-[#586069]">
          {statText}
        </span>
        {canSpeakEnglish && (
          <button
            type="button"
            className={`${speakButton()} !mb-0 !px-2.5 !py-0.5`}
            aria-label="問題文を読み上げる"
            title="問題文を読み上げる"
            onClick={handleSpeakClick}
          >
            🔊
          </button>
        )}
        <button
          type="button"
          className="question-list-hint-btn shrink-0 cursor-pointer rounded border-none bg-transparent px-1 py-0.5 text-lg leading-none hover:bg-[#f0f7ff]"
          aria-label="ヒントを表示"
          aria-expanded={hintOpen}
          // flushSync は既存テスト互換のため一時的に使用（クリック直後に hidden 状態を assert する仕様）。
          // 将来テストを async 対応に書き換えた段階で除去予定。
          onClick={() => flushSync(() => setHintOpen((v) => !v))}
        >
          💡
        </button>
      </div>
      {/* `.question-list-hint.hidden` の display:none は既存 `.hidden`（!important）が
         勝つため、conditional に `hidden` クラスを付与する。基本スタイルは Tailwind 化。
         `question-list-hint` クラス名は font-size 切替が参照するため残置。 */}
      <div
        className={
          "question-list-hint mt-2 rounded bg-[#f0f7ff] px-2.5 py-2 text-[15px] leading-[1.5] text-[#586069]" +
          (hintOpen ? "" : " hidden")
        }
      >
        <span className="question-list-correct rounded bg-[#e6ffed] px-2 py-1 text-[15px] font-semibold whitespace-nowrap text-[#22863a]">
          {`✓ ${question.choices[question.correct]}`}
        </span>
        {question.explanation && (
          <div className="question-list-hint-explanation mt-1.5 text-[13px] leading-[1.5] text-[#586069]">
            {question.explanation}
          </div>
        )}
      </div>
    </div>
  );
}
