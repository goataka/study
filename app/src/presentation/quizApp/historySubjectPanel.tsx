import { useMemo, useState } from "react";
import type { QuizUseCase, QuizRecord } from "../../application/quizUseCase";
import { categoryListContentStore } from "../components/categoryListContentStore";

type HistorySubjectMode = "unit" | "question";

interface HistorySubjectPanelProps {
  records: QuizRecord[];
  useCase: QuizUseCase;
}

interface UnitSummary {
  key: string;
  label: string;
  attempts: number;
  totalCorrect: number;
  totalQuestions: number;
  latestDate: number;
}

interface QuestionSummary {
  key: string;
  questionText: string;
  latestUnitLabel: string;
  correctCount: number;
  incorrectCount: number;
  latestDate: number;
}

export function renderHistorySubjectPanel(useCase: QuizUseCase): void {
  const records = useCase.getHistory().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  categoryListContentStore.set(<HistorySubjectPanel records={records} useCase={useCase} />);
}

function HistorySubjectPanel({ records, useCase }: HistorySubjectPanelProps): React.JSX.Element {
  const [mode, setMode] = useState<HistorySubjectMode>("unit");
  const unitSummaries = useMemo(() => buildUnitSummaries(records), [records]);
  const questionSummaries = useMemo(() => buildQuestionSummaries(records, useCase), [records, useCase]);

  return (
    <div id="historySubjectContent" className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1 border-b border-solid border-[#e1e4e8] pb-2">
        <button
          id="historySubjectTab-unit"
          type="button"
          className={`rounded-md border px-2 py-1 text-sm font-semibold ${
            mode === "unit"
              ? "border-[#0366d6] bg-[#e8f0ff] text-[#0366d6]"
              : "border-[#d0d7de] bg-white text-[#586069] hover:bg-[#f6f8fa]"
          }`}
          onClick={() => setMode("unit")}
        >
          単元毎
        </button>
        <button
          id="historySubjectTab-question"
          type="button"
          className={`rounded-md border px-2 py-1 text-sm font-semibold ${
            mode === "question"
              ? "border-[#0366d6] bg-[#e8f0ff] text-[#0366d6]"
              : "border-[#d0d7de] bg-white text-[#586069] hover:bg-[#f6f8fa]"
          }`}
          onClick={() => setMode("question")}
        >
          問題毎
        </button>
      </div>

      <div id="historySubjectUnitList" className={`min-h-0 flex-1 overflow-y-auto ${mode === "unit" ? "" : "hidden"}`}>
        {unitSummaries.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#586069]">学習履歴がありません。</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {unitSummaries.map((summary) => {
              const scorePct =
                summary.totalQuestions > 0 ? Math.round((summary.totalCorrect / summary.totalQuestions) * 100) : 0;
              return (
                <li key={summary.key} className="rounded-md border border-solid border-[#e1e4e8] bg-white p-3">
                  <p className="m-0 text-sm font-semibold text-[#24292e]">{summary.label}</p>
                  <p className="m-0 mt-1 text-xs text-[#586069]">
                    学習回数: {summary.attempts}回 / 正答率: {scorePct}% ({summary.totalCorrect}/
                    {summary.totalQuestions})
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        id="historySubjectQuestionList"
        className={`min-h-0 flex-1 overflow-y-auto ${mode === "question" ? "" : "hidden"}`}
      >
        {questionSummaries.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#586069]">学習履歴がありません。</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {questionSummaries.map((summary) => (
              <li key={summary.key} className="rounded-md border border-solid border-[#e1e4e8] bg-white p-3">
                <p className="m-0 text-sm font-semibold text-[#24292e]">{summary.questionText}</p>
                <p className="m-0 mt-1 text-xs text-[#586069]">
                  正解: {summary.correctCount}回 / 不正解: {summary.incorrectCount}回
                </p>
                <p className="m-0 mt-1 text-xs text-[#586069]">直近単元: {summary.latestUnitLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function buildUnitSummaries(records: QuizRecord[]): UnitSummary[] {
  const map = new Map<string, UnitSummary>();

  for (const record of records) {
    const key = `${record.subject}::${record.category}`;
    const current = map.get(key);
    const latestDate = new Date(record.date).getTime();
    if (!current) {
      map.set(key, {
        key,
        label: `${record.subjectName} / ${record.categoryName}`,
        attempts: 1,
        totalCorrect: record.correctCount,
        totalQuestions: record.totalCount,
        latestDate,
      });
      continue;
    }
    current.attempts += 1;
    current.totalCorrect += record.correctCount;
    current.totalQuestions += record.totalCount;
    current.latestDate = Math.max(current.latestDate, latestDate);
  }

  return Array.from(map.values()).sort((a, b) => b.latestDate - a.latestDate);
}

function buildQuestionSummaries(records: QuizRecord[], useCase: QuizUseCase): QuestionSummary[] {
  const map = new Map<string, QuestionSummary>();

  for (const record of records) {
    const latestDate = new Date(record.date).getTime();
    for (const entry of record.entries) {
      const question = useCase.getQuestionById(entry.questionId);
      const current = map.get(entry.questionId);
      if (!current) {
        map.set(entry.questionId, {
          key: entry.questionId,
          questionText: question?.question ?? `(問題ID: ${entry.questionId})`,
          latestUnitLabel: `${record.subjectName} / ${record.categoryName}`,
          correctCount: entry.isCorrect ? 1 : 0,
          incorrectCount: entry.isCorrect ? 0 : 1,
          latestDate,
        });
        continue;
      }
      current.correctCount += entry.isCorrect ? 1 : 0;
      current.incorrectCount += entry.isCorrect ? 0 : 1;
      if (latestDate >= current.latestDate) {
        current.latestDate = latestDate;
        current.latestUnitLabel = `${record.subjectName} / ${record.categoryName}`;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.latestDate - a.latestDate);
}
