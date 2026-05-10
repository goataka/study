/**
 * カテゴリ一覧アイテムの統計（進捗バー・学習状態絵文字）を更新するヘルパー。
 *
 * 全問題を 1 回走査して subject/category/parentCategory ごとの統計を集計し、
 * `.category-item[data-subject]` 要素を順に更新する。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { calcDualProgressPct } from "../uiHelpers";
import {
  categoryStatsKey,
  computeCategoryStatsMap,
  deriveCategoryItemStatus,
  formatCategoryStatsText,
  type CategoryStat,
} from "./categoryStatsCalculator";

/**
 * カテゴリ一覧アイテムの進捗バー・学習状態を再計算して DOM に反映する。
 *
 * 純粋計算は `categoryStatsCalculator` の helper に委譲し、本関数は DOM 更新責務のみを持つ。
 */
export function updateSubjectStats(useCase: QuizUseCase): void {
  const statsMap = computeCategoryStatsMap(useCase);
  const studiedKeys = useCase.getStudiedCategoryKeys();
  document.querySelectorAll(".category-item[data-subject]").forEach((item) => {
    updateCategoryItem(item as HTMLElement, statsMap, studiedKeys);
  });
}

function updateCategoryItem(el: HTMLElement, statsMap: Map<string, CategoryStat>, studiedKeys: Set<string>): void {
  const subject = el.dataset.subject || "";
  const category = el.dataset.category || "all";
  const key = categoryStatsKey(subject, category);

  const stat = statsMap.get(key) ?? { total: 0, inProgress: 0, mastered: 0 };
  const statsEl = el.querySelector(".category-stats");
  if (statsEl) {
    statsEl.textContent = formatCategoryStatsText(stat);
  }

  const progressFill = el.querySelector(".category-progress-fill") as HTMLElement | null;
  const progressFillInProgress = el.querySelector(".category-progress-fill-inprogress") as HTMLElement | null;
  if (progressFill) {
    if (stat.mastered > 0 || stat.inProgress > 0) {
      const { masteredPct, inProgressPct } = calcDualProgressPct(stat.mastered, stat.inProgress, stat.total);
      progressFill.style.width = `${masteredPct}%`;
      progressFill.classList.toggle("progress-fill-done", masteredPct === 100);
      if (progressFillInProgress) {
        progressFillInProgress.style.width = `${inProgressPct}%`;
      }
    } else {
      progressFill.style.width = "0%";
      progressFill.classList.remove("progress-fill-done");
      if (progressFillInProgress) {
        progressFillInProgress.style.width = "0%";
      }
    }
  }

  // 学習状態の絵文字を更新（⬜未学習 / 🔄学習中 / ✅学習済）
  const view = deriveCategoryItemStatus(stat, studiedKeys, key);
  el.classList.toggle("learned", view.status === "learned");
  el.classList.toggle("studying", view.status === "studying");
  const statusEl = el.querySelector(".category-status");
  if (statusEl) {
    statusEl.textContent = view.icon;
  }
}
