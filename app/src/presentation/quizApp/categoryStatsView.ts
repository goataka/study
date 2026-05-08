/**
 * カテゴリ一覧アイテムの統計（進捗バー・学習状態絵文字）を更新するヘルパー。
 *
 * 全問題を 1 回走査して subject/category/parentCategory ごとの統計を集計し、
 * `.category-item[data-subject]` 要素を順に更新する。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { calcDualProgressPct } from "../uiHelpers";

interface CategoryStat {
  total: number;
  inProgress: number;
  mastered: number;
}

/**
 * カテゴリ一覧アイテムの進捗バー・学習状態を再計算して DOM に反映する。
 */
export function updateSubjectStats(useCase: QuizUseCase): void {
  // 全問題を 1 回だけ走査して subject/category/parentCategory ごとの統計を集計する
  const allQuestions = useCase.getFilteredQuestions({ subject: "all", category: "all" });
  const masteredSet = new Set(useCase.getMasteredIds());
  // questionStats をキャッシュして各問題のループ内で再利用する
  const allQuestionStats = useCase.getAllQuestionStats();

  const statsMap = new Map<string, CategoryStat>();
  const addStat = (key: string, isInProgress: boolean, isMastered: boolean): void => {
    const s = statsMap.get(key) ?? { total: 0, inProgress: 0, mastered: 0 };
    s.total++;
    if (isInProgress) s.inProgress++;
    if (isMastered) s.mastered++;
    statsMap.set(key, s);
  };

  for (const q of allQuestions) {
    const qStat = allQuestionStats[q.id];
    const isMastered = masteredSet.has(q.id);
    // 1 回以上回答済みで未習得の問題を「学習中」とカウント
    const isInProgress = (qStat?.total ?? 0) > 0 && !isMastered;
    addStat("all::all", isInProgress, isMastered);
    addStat(`${q.subject}::all`, isInProgress, isMastered);
    addStat(`${q.subject}::${q.category}`, isInProgress, isMastered);
    if (q.parentCategory) {
      addStat(`${q.subject}::parent::${q.parentCategory}`, isInProgress, isMastered);
    }
  }

  const studiedKeys = useCase.getStudiedCategoryKeys();
  document.querySelectorAll(".category-item[data-subject]").forEach((item) => {
    updateCategoryItem(item as HTMLElement, statsMap, studiedKeys);
  });
}

function formatCategoryStats(stat: CategoryStat): string {
  if (stat.total === 0) return "";
  if (stat.inProgress > 0) {
    return `${stat.mastered}(${stat.inProgress})/${stat.total}`;
  }
  return `${stat.mastered}/${stat.total}`;
}

function updateCategoryItem(el: HTMLElement, statsMap: Map<string, CategoryStat>, studiedKeys: Set<string>): void {
  const subject = el.dataset.subject || "";
  const category = el.dataset.category || "all";
  const key = category !== "all" ? `${subject}::${category}` : `${subject}::all`;

  const stat = statsMap.get(key) ?? { total: 0, inProgress: 0, mastered: 0 };
  const statsEl = el.querySelector(".category-stats");
  if (statsEl) {
    statsEl.textContent = formatCategoryStats(stat);
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
  // ✅: 全問題が masteredIds にある（明示的に学習済みにした、またはクイズで習得）
  // 🔄: 1 回以上回答済みで未習得の問題あり、またはクイズ履歴あり
  // ⬜: 未学習（一度も回答していない）
  const isAllMastered = stat.total > 0 && stat.mastered === stat.total;
  const isStudying = !isAllMastered && (stat.inProgress > 0 || studiedKeys.has(key));
  el.classList.toggle("learned", isAllMastered);
  el.classList.toggle("studying", isStudying);
  const statusEl = el.querySelector(".category-status");
  if (statusEl) {
    if (isAllMastered) {
      statusEl.textContent = "✅";
    } else if (isStudying) {
      statusEl.textContent = "🔄";
    } else {
      statusEl.textContent = "⬜";
    }
  }
}
