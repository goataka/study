/**
 * 問題一覧パネル（questions タブ）のビュー。
 *
 * 1問分の DOM を構築する `buildQuestionListItem` と、
 * フィルター適用＋一覧描画を行う `renderQuestionList` を提供する。
 */

import type { Question } from "../../domain/question";
import type { QuizFilter, QuizUseCase } from "../../application/quizUseCase";

export type QuestionListFilter = "all" | "learned" | "unlearned";

/**
 * 1問分の問題リストアイテム要素を構築する。
 * 問題文・回答統計（連続正答数の星）・ヒント（正解＋説明）を含む。
 */
export function buildQuestionListItem(question: Question, useCase: QuizUseCase): HTMLElement {
  const item = document.createElement("div");
  item.className = "question-list-item";

  const stat = useCase.getQuestionStat(question.id);
  const isCompleted = useCase.isMastered(question.id);
  const streak = useCase.getCorrectStreak(question.id);
  if (isCompleted) {
    item.classList.add("question-list-completed");
  }

  const rowDiv = document.createElement("div");
  rowDiv.className = "question-list-row";

  const textDiv = document.createElement("span");
  textDiv.className = "question-list-text";
  textDiv.textContent = question.question;
  rowDiv.appendChild(textDiv);

  const statSpan = document.createElement("span");
  statSpan.className = "question-list-stat";
  if (stat.total > 0) {
    const maxStreak = 3;
    const filledStar = "⭐";
    const emptyStar = "☆";
    const starStr = isCompleted
      ? "🏆"
      : Array.from({ length: maxStreak }, (_, i) => (i < streak ? filledStar : emptyStar)).join("");
    statSpan.textContent = `${starStr} 全${stat.total}回`;
  } else {
    statSpan.textContent = "-";
  }
  rowDiv.appendChild(statSpan);

  const hintBtn = document.createElement("button");
  hintBtn.className = "question-list-hint-btn";
  hintBtn.textContent = "💡";
  hintBtn.setAttribute("aria-label", "ヒントを表示");
  hintBtn.setAttribute("aria-expanded", "false");
  rowDiv.appendChild(hintBtn);

  item.appendChild(rowDiv);

  const hintDiv = document.createElement("div");
  hintDiv.className = "question-list-hint hidden";

  const correctDiv = document.createElement("span");
  correctDiv.className = "question-list-correct";
  correctDiv.textContent = `✓ ${question.choices[question.correct]}`;
  hintDiv.appendChild(correctDiv);

  if (question.explanation) {
    const explanationDiv = document.createElement("div");
    explanationDiv.className = "question-list-hint-explanation";
    explanationDiv.textContent = question.explanation;
    hintDiv.appendChild(explanationDiv);
  }

  item.appendChild(hintDiv);

  hintBtn.addEventListener("click", () => {
    const isHidden = hintDiv.classList.toggle("hidden");
    hintBtn.setAttribute("aria-expanded", isHidden ? "false" : "true");
  });

  return item;
}

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

  let questions = useCase.getFilteredQuestions(filter);

  if (questionListFilter === "learned") {
    questions = questions.filter((q) => useCase.isMastered(q.id));
  } else if (questionListFilter === "unlearned") {
    questions = questions.filter((q) => !useCase.isMastered(q.id));
  }

  const countEl = document.getElementById("questionListFilterCount");
  if (countEl) countEl.textContent = `${questions.length}問`;

  bodyEl.innerHTML = "";
  if (questions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "この単元に問題はありません。";
    bodyEl.appendChild(empty);
  } else {
    questions.forEach((q) => {
      bodyEl.appendChild(buildQuestionListItem(q, useCase));
    });
  }
}
