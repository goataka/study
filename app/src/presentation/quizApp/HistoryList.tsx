/**
 * 履歴一覧（および総合タブの当日アクティビティ）の React コンポーネント。
 *
 * もともと `historyItemView.ts` / `historyListView.ts` で `document.createElement`
 * を組み合わせて構築していた DOM を JSX に置き換えたもの。
 * 折りたたみ状態は React のローカル state（`useState`）で管理する。
 *
 * 既存テスト・E2E 互換性のため、生成される class 名と DOM 階層は元実装と同じに保つ。
 */

import { useState } from "react";
import type { QuizUseCase, QuizRecord } from "../../application/quizUseCase";
import { NO_ANSWER_TEXT } from "../../application/quizUseCase";
import { shuffleChoices } from "../../domain/question";

export interface HistoryListProps {
  records: QuizRecord[];
  useCase: QuizUseCase;
  /** true のとき教科名・カテゴリ名のプレフィックス表示と時刻のみの日付表示にする（総合タブ用）。 */
  showSubjectPrefix?: boolean;
  /** records が空の場合に表示するメッセージとそのクラス名。 */
  emptyMessage: string;
  emptyClassName: string;
}

/**
 * 履歴レコードのリスト。空配列の場合は空メッセージを表示する。
 */
export function HistoryList({
  records,
  useCase,
  showSubjectPrefix = false,
  emptyMessage,
  emptyClassName,
}: HistoryListProps): React.JSX.Element {
  if (records.length === 0) {
    return <p className={emptyClassName}>{emptyMessage}</p>;
  }
  return (
    <>
      {records.map((record, idx) => (
        <HistoryItem
          key={`${record.date}-${idx}`}
          record={record}
          useCase={useCase}
          showSubjectPrefix={showSubjectPrefix}
        />
      ))}
    </>
  );
}

interface HistoryItemProps {
  record: QuizRecord;
  useCase: QuizUseCase;
  showSubjectPrefix: boolean;
}

function formatDate(date: Date, showSubjectPrefix: boolean): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (showSubjectPrefix) return `${hh}:${mm}`;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(
    2,
    "0",
  )} ${hh}:${mm}`;
}

function HistoryItem({ record, useCase, showSubjectPrefix }: HistoryItemProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isManual = record.mode === "manual";
  const pct = Math.round((record.correctCount / record.totalCount) * 100);
  const dateStr = formatDate(new Date(record.date), showSubjectPrefix);

  const toggle = (): void => {
    if (isManual) return;
    setExpanded((v) => !v);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isManual) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  // 既存テスト互換: manual の場合は role/tabindex/aria-expanded を一切付けない。
  const headerInteractiveProps = isManual
    ? {}
    : {
        role: "button",
        tabIndex: 0,
        "aria-expanded": expanded,
        onClick: toggle,
        onKeyDown,
      };

  // 既存テスト互換: manual の詳細は常に hidden。それ以外は expanded のとき hidden を外す。
  const detailHidden = isManual || !expanded;

  return (
    <div className="history-item overflow-hidden rounded-lg border border-solid border-[#e1e4e8]">
      <div
        className="history-item-header flex cursor-pointer items-center gap-3 bg-[#f6f8fa] px-4 py-3 transition-colors duration-150 select-none hover:bg-[#e8f0fe]"
        {...headerInteractiveProps}
      >
        <div className="history-meta flex flex-1 flex-wrap items-center gap-2">
          <span className="history-date text-[15px] text-[#586069]">{dateStr}</span>
          <span className="history-subject text-base font-semibold text-[#24292e]">
            {showSubjectPrefix ? `${record.subjectName} / ${record.categoryName}` : record.categoryName}
          </span>
        </div>
        {isManual ? (
          <span className="history-score text-base font-bold whitespace-nowrap">-</span>
        ) : (
          <span
            className={`history-score text-base font-bold whitespace-nowrap ${
              pct >= 70 ? "pass text-[#28a745]" : "fail text-[#dc3545]"
            }`}
          >
            {`${record.correctCount}/${record.totalCount} (${pct}%)`}
          </span>
        )}
        {!isManual && (
          <span className="history-toggle text-sm text-[#586069] transition-transform duration-200">
            {expanded ? "▼" : "▶"}
          </span>
        )}
      </div>
      <div
        className={
          "history-detail flex flex-col gap-1.5 border-t border-solid border-[#e1e4e8] bg-white px-4 py-2" +
          (detailHidden ? " hidden" : "")
        }
      >
        {!isManual &&
          record.entries.map((entry, idx) => {
            const question = useCase.getQuestionById(entry.questionId);
            let questionText: string;
            let answerText: string;
            if (question) {
              const shuffled = shuffleChoices(question);
              questionText = question.question;
              const userAnswer =
                entry.userAnswerText ??
                entry.userAnswerChoiceText ??
                shuffled.choices[entry.userAnswerIndex] ??
                NO_ANSWER_TEXT;
              const correctAnswer = entry.correctAnswerText ?? shuffled.choices[shuffled.correct] ?? "";
              answerText = entry.isCorrect
                ? `正解: ${correctAnswer}`
                : `あなたの回答: ${userAnswer} → 正解: ${correctAnswer}`;
            } else {
              questionText = `(問題ID: ${entry.questionId})`;
              answerText = entry.isCorrect ? "正解" : "不正解";
            }
            return (
              <div
                key={`${entry.questionId}-${idx}`}
                className={`history-entry flex items-start gap-2.5 rounded-md p-2 text-[15px] ${
                  entry.isCorrect ? "correct bg-[#f0fff4]" : "incorrect bg-[#fff0f0]"
                }`}
              >
                <span
                  className={`history-entry-icon mt-px shrink-0 text-base font-bold ${
                    entry.isCorrect ? "text-[#28a745]" : "text-[#dc3545]"
                  }`}
                >
                  {entry.isCorrect ? "✓" : "✗"}
                </span>
                <div className="history-entry-content flex-1">
                  <p className="history-entry-question mb-0.5 text-[#24292e]">{questionText}</p>
                  <p className="history-entry-answer text-sm text-[#586069]">{answerText}</p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
