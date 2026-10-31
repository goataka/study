import { useMemo, useState } from "react";
import type { QuizUseCase, QuizRecord } from "../../application/quizUseCase";
import { categoryListContentStore } from "../components/categoryListContentStore";
import { SUBJECTS } from "../uiHelpers";
import { panelTab, panelTabs } from "../styles/panelTabStyles";

type HistorySubjectMode = "unit" | "question";

interface HistorySubjectPanelProps {
  records: QuizRecord[];
  useCase: QuizUseCase;
}

interface UnitSummary {
  key: string;
  subjectId: string;
  label: string;
  attempts: number;
  totalCorrect: number;
  totalQuestions: number;
  latestDate: number;
}

interface QuestionSummary {
  key: string;
  subjectId: string;
  questionText: string;
  latestUnitLabel: string;
  correctCount: number;
  incorrectCount: number;
  latestDate: number;
}

interface HistorySubjectSummary {
  id: string;
  name: string;
  icon: string;
  unitCount: number;
  questionCount: number;
  latestDate: number;
}

const NON_CONTENT_SUBJECT_IDS = new Set(["all", "progress", "history", "admin", "support"]);

export function renderHistorySubjectPanel(useCase: QuizUseCase): void {
  const records = useCase.getHistory().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  categoryListContentStore.set(<HistorySubjectPanel records={records} useCase={useCase} />);
}

function HistorySubjectPanel({ records, useCase }: HistorySubjectPanelProps): React.JSX.Element {
  const [mode, setMode] = useState<HistorySubjectMode>("unit");
  const unitSummaries = useMemo(() => buildUnitSummaries(records), [records]);
  const questionSummaries = useMemo(() => buildQuestionSummaries(records, useCase), [records, useCase]);
  const subjectSummaries = useMemo(
    () => buildHistorySubjectSummaries(unitSummaries, questionSummaries, useCase),
    [questionSummaries, unitSummaries, useCase],
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    () => subjectSummaries.find((summary) => summary.unitCount > 0)?.id ?? subjectSummaries[0]?.id ?? "",
  );
  const selectedSubject = subjectSummaries.find((summary) => summary.id === selectedSubjectId) ?? subjectSummaries[0];
  const selectedUnitSummaries = unitSummaries.filter((summary) => summary.subjectId === selectedSubject?.id);
  const selectedQuestionSummaries = questionSummaries.filter((summary) => summary.subjectId === selectedSubject?.id);
  const maxUnitCount = Math.max(...subjectSummaries.map((summary) => summary.unitCount), 1);

  return (
    <div
      id="historySubjectContent"
      className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
    >
      <div
        id="historySubjectMenu"
        className="flex min-h-0 flex-col rounded-lg border border-solid border-[#e1e4e8] bg-white p-2"
      >
        <div className="px-2 py-1 text-sm font-bold text-[#0366d6]">📚 教科メニュー</div>
        <div className="history-subject-menu flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {subjectSummaries.map((summary) => {
            const isActive = summary.id === selectedSubject?.id;
            const hasHistory = summary.unitCount > 0;
            const activityPct = Math.round((summary.unitCount / maxUnitCount) * 100);
            return (
              <button
                key={summary.id}
                id={`historySubjectMenuButton-${summary.id}`}
                type="button"
                data-subject={summary.id}
                aria-pressed={isActive}
                className={[
                  "history-subject-menu-button",
                  "progress-subject-list-item category-item flex w-full cursor-pointer select-none rounded-md text-left transition-[background,border-color] duration-150",
                  "hover:bg-[#e8f0fe] focus:outline-2 focus:outline-[#0366d6] focus:outline-offset-2",
                  "[&.active]:bg-[#e8f0ff] [&.active]:text-[#0366d6] group",
                  isActive ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedSubjectId(summary.id)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 py-[7px] pl-[10px] pr-[14px]">
                  <span className="shrink-0 text-sm leading-none" aria-hidden="true">
                    {hasHistory ? "🕒" : "⬜"}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 text-[19px] leading-none" title={summary.name} aria-hidden="true">
                        {summary.icon}
                      </span>
                      <span className="break-words text-lg font-semibold text-[#24292e] group-[.active]:text-[#0366d6]">
                        {summary.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-1 min-w-0 flex-1 overflow-hidden rounded-sm bg-[#e1e4e8]"
                        role="progressbar"
                        aria-label={`${summary.name} の履歴カバー率`}
                        aria-valuemin={0}
                        aria-valuemax={maxUnitCount}
                        aria-valuenow={summary.unitCount}
                      >
                        <div className="h-full shrink-0 rounded-sm bg-[#6f42c1]" style={{ width: `${activityPct}%` }} />
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[13px] text-[#586069] group-[.active]:text-[#0366d6]/85">
                        {`${summary.unitCount}単元`}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="historySubjectDetail"
        className="flex min-h-0 flex-col rounded-lg border border-solid border-[#e1e4e8] bg-white p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-solid border-[#e1e4e8] pb-2">
          <div>
            <p id="historySubjectDetailHeading" className="m-0 text-base font-bold text-[#24292e]">
              🕒 {selectedSubject?.name ?? "学習履歴"}
            </p>
            <p className="m-0 mt-1 text-xs text-[#586069]">
              {selectedSubject
                ? `${selectedSubject.unitCount}単元 / ${selectedSubject.questionCount}問に履歴があります`
                : "学習履歴がありません。"}
            </p>
          </div>
          <div className={panelTabs()} role="tablist" aria-label="履歴表示切替">
            <button
              id="historySubjectTab-unit"
              type="button"
              className={mode === "unit" ? `${panelTab()} active` : panelTab()}
              role="tab"
              aria-selected={mode === "unit"}
              aria-controls="historySubjectUnitList"
              onClick={() => setMode("unit")}
            >
              単元毎
            </button>
            <button
              id="historySubjectTab-question"
              type="button"
              className={mode === "question" ? `${panelTab()} active` : panelTab()}
              role="tab"
              aria-selected={mode === "question"}
              aria-controls="historySubjectQuestionList"
              onClick={() => setMode("question")}
            >
              問題毎
            </button>
          </div>
        </div>

        <div
          id="historySubjectUnitList"
          className={`min-h-0 flex-1 overflow-y-auto pt-3 ${mode === "unit" ? "" : "hidden"}`}
        >
          {selectedUnitSummaries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#586069]">この教科の学習履歴はありません。</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {selectedUnitSummaries.map((summary) => {
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
          className={`min-h-0 flex-1 overflow-y-auto pt-3 ${mode === "question" ? "" : "hidden"}`}
        >
          {selectedQuestionSummaries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#586069]">この教科の学習履歴はありません。</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {selectedQuestionSummaries.map((summary) => (
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
        subjectId: record.subject,
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
          subjectId: record.subject,
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

function buildHistorySubjectSummaries(
  unitSummaries: UnitSummary[],
  questionSummaries: QuestionSummary[],
  useCase: QuizUseCase,
): HistorySubjectSummary[] {
  const unitCountBySubject = new Map<string, number>();
  const latestDateBySubject = new Map<string, number>();

  for (const summary of unitSummaries) {
    unitCountBySubject.set(summary.subjectId, (unitCountBySubject.get(summary.subjectId) ?? 0) + 1);
    latestDateBySubject.set(
      summary.subjectId,
      Math.max(latestDateBySubject.get(summary.subjectId) ?? Number.NEGATIVE_INFINITY, summary.latestDate),
    );
  }

  const questionCountBySubject = new Map<string, number>();
  for (const summary of questionSummaries) {
    questionCountBySubject.set(summary.subjectId, (questionCountBySubject.get(summary.subjectId) ?? 0) + 1);
    latestDateBySubject.set(
      summary.subjectId,
      Math.max(latestDateBySubject.get(summary.subjectId) ?? Number.NEGATIVE_INFINITY, summary.latestDate),
    );
  }

  const contentSubjects = SUBJECTS.filter((subject) => !NON_CONTENT_SUBJECT_IDS.has(subject.id))
    .map((subject) => ({
      ...subject,
      categories: useCase.getCategoriesForSubject(subject.id),
    }))
    .filter((subject) => Object.keys(subject.categories).length > 0);

  return contentSubjects
    .map((subject) => ({
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      unitCount: unitCountBySubject.get(subject.id) ?? 0,
      questionCount: questionCountBySubject.get(subject.id) ?? 0,
      latestDate: latestDateBySubject.get(subject.id) ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((a, b) => {
      const orderDiff =
        SUBJECTS.findIndex((subject) => subject.id === a.id) - SUBJECTS.findIndex((subject) => subject.id === b.id);
      return orderDiff !== 0 ? orderDiff : b.latestDate - a.latestDate;
    });
}
