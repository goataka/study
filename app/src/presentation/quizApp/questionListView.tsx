/**
 * 問題一覧パネル（questions タブ）のレンダラー（React 版）。
 *
 * フィルターボタンの active 切り替え・件数バッジ更新は引き続き命令的に行うが、
 * 一覧本文（`#questionListBody`）は `QuestionList` コンポーネントを `renderReactInto`
 * 経由で描画する。公開 API（関数名・引数）は維持。
 */

import type { Question } from "../../domain/question";
import type { QuizFilter, QuizUseCase } from "../../application/quizUseCase";
import { QuestionList } from "./QuestionList";
import { renderReactInto } from "./reactMount";

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
  const bodyEl = document.getElementById("questionListBody");
  if (!bodyEl) return;

  const filterButtonMap = {
    all: "questionListFilterAll",
    unlearned: "questionListFilterUnlearned",
    learned: "questionListFilterLearned",
  } as const;
  (Object.entries(filterButtonMap) as Array<[QuestionListFilter, string]>).forEach(([key, id]) => {
    document.getElementById(id)?.classList.toggle("active", key === questionListFilter);
  });

  const questions = applyFilter(useCase.getFilteredQuestions(filter), questionListFilter, useCase);

  const countEl = document.getElementById("questionListFilterCount");
  if (countEl) countEl.textContent = `${questions.length}問`;

  renderReactInto(bodyEl, <QuestionList questions={questions} useCase={useCase} />);
}

function applyFilter(questions: Question[], listFilter: QuestionListFilter, useCase: QuizUseCase): Question[] {
  if (listFilter === "learned") return questions.filter((q) => useCase.isMastered(q.id));
  if (listFilter === "unlearned") return questions.filter((q) => !useCase.isMastered(q.id));
  return questions;
}
