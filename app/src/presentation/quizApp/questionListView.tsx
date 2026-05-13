/**
 * 問題一覧パネル（questions タブ）のレンダラー（React 版）。
 *
 * フィルターボタンの active 切り替え・件数バッジ更新は引き続き命令的に行うが、
 * 一覧本文（`#questionListBody`）は `QuestionList` コンポーネントを
 * `questionListContentStore` 経由で描画する。公開 API（関数名・引数）は維持。
 */

import type { Question, QuizFilter, QuizUseCase } from "../../application/quizUseCase";
import { QuestionList } from "./QuestionList";
import { questionListContentStore } from "../components/questionListContentStore";

export type QuestionListFilter = "all" | "learned" | "unlearned";

/**
 * 問題一覧（`#questionListBody`）を描画する。
 * 学習状態フィルター（all/learned/unlearned）を適用し、件数バッジも更新する。
 */
export function renderQuestionList(
  filter: QuizFilter,
  questionListFilter: QuestionListFilter,
  useCase: QuizUseCase,
): void {
  const filterButtonMap = {
    all: "questionListFilterAll",
    unlearned: "questionListFilterUnlearned",
    learned: "questionListFilterLearned",
  } as const;
  (Object.entries(filterButtonMap) as Array<[QuestionListFilter, string]>).forEach(([key, id]) => {
    document.getElementById(id)?.classList.toggle("active", key === questionListFilter);
  });

  const allQuestions = useCase.getFilteredQuestions(filter);
  const questions = applyFilter(allQuestions, questionListFilter, useCase);

  const countEl = document.getElementById("questionListFilterCount");
  if (countEl) countEl.textContent = `${questions.length}問`;

  // タイトルと日付を更新する
  updateQuestionListHeader(filter, allQuestions, useCase);

  questionListContentStore.set(<QuestionList questions={questions} useCase={useCase} />);
}

/**
 * 問題一覧パネルのヘッダー（タイトルと最終学習日）を更新する。
 */
function updateQuestionListHeader(filter: QuizFilter, questions: Question[], useCase: QuizUseCase): void {
  const headerEl = document.getElementById("questionListHeader");
  const titleEl = document.getElementById("questionListTitle");
  const dateEl = document.getElementById("questionListDate");
  if (!headerEl || !titleEl || !dateEl) return;

  // タイトル: 最初の問題のカテゴリ名を使用（全体の場合は教科名）
  const firstQuestion = questions[0];
  const title = firstQuestion?.categoryName ?? firstQuestion?.category ?? "";

  // 最終学習日: その教科・カテゴリの最新の学習記録を取得
  const lastStudyDate = getLastStudyDateForFilter(filter, useCase);
  const dateText = lastStudyDate ? `最終学習: ${formatDate(new Date(lastStudyDate))}` : "";

  if (title) {
    titleEl.textContent = title;
    dateEl.textContent = dateText;
    headerEl.classList.remove("hidden");
    headerEl.classList.add("flex");
  } else {
    headerEl.classList.add("hidden");
    headerEl.classList.remove("flex");
  }
}

/** フィルターに対応する最終学習日を取得する。 */
function getLastStudyDateForFilter(filter: QuizFilter, useCase: QuizUseCase): string | null {
  const history = useCase.getHistory();
  const matchingRecords = history.filter((r) => {
    if (filter.subject !== "all" && r.subject !== filter.subject) return false;
    if (filter.category !== "all" && r.category !== filter.category) return false;
    return true;
  });
  if (matchingRecords.length === 0) return null;
  const latest = matchingRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return latest?.date ?? null;
}

/** 日付を "YYYY/MM/DD" 形式にフォーマットする。 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function applyFilter(questions: Question[], listFilter: QuestionListFilter, useCase: QuizUseCase): Question[] {
  if (listFilter === "learned") return questions.filter((q) => useCase.isMastered(q.id));
  if (listFilter === "unlearned") return questions.filter((q) => !useCase.isMastered(q.id));
  return questions;
}
