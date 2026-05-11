/**
 * カテゴリ統計の計算ロジック（純粋関数）。
 *
 * `<CategoryItem>` などの React コンポーネントが props として直接受け取れる形を返す。
 *
 * - `computeCategoryStatsMap`: 全問題を 1 回走査し、`subject::category` / `subject::parent::*` /
 *   `subject::all` / `all::all` をキーとする統計マップを構築する
 * - `formatCategoryStatsText`: stats から表示テキスト（例: "3/10" or "3(2)/10"）を作る
 * - `deriveCategoryItemStatus`: stats から学習状態（`learned` / `studying` / `unlearned`）と
 *   ステータス絵文字を決定する
 */

import type { QuizUseCase } from "../../application/quizUseCase";

export interface CategoryStat {
  total: number;
  inProgress: number;
  mastered: number;
}

/** 表示用ステータス。 */
export type CategoryStatusKind = "learned" | "studying" | "unlearned";

export interface CategoryItemStatusView {
  status: CategoryStatusKind;
  /** ステータス絵文字（⬜ / 🔄 / ✅）。 */
  icon: string;
}

/**
 * 全問題を 1 回走査して、subject/category/parentCategory ごとの統計マップを返す。
 *
 * キー命名:
 * - `all::all`
 * - `${subject}::all`
 * - `${subject}::${category}`
 * - `${subject}::parent::${parentCategory}`（parentCategory がある場合のみ）
 */
export function computeCategoryStatsMap(useCase: QuizUseCase): Map<string, CategoryStat> {
  const allQuestions = useCase.getFilteredQuestions({ subject: "all", category: "all" });
  const masteredSet = new Set(useCase.getMasteredIds());
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
    const isInProgress = (qStat?.total ?? 0) > 0 && !isMastered;
    addStat("all::all", isInProgress, isMastered);
    addStat(`${q.subject}::all`, isInProgress, isMastered);
    addStat(`${q.subject}::${q.category}`, isInProgress, isMastered);
    if (q.parentCategory) {
      addStat(`${q.subject}::parent::${q.parentCategory}`, isInProgress, isMastered);
    }
  }
  return statsMap;
}

/**
 * 統計から表示用テキストを生成する。
 * - `total === 0`: 空文字
 * - `inProgress > 0`: `${mastered}(${inProgress})/${total}`
 * - それ以外: `${mastered}/${total}`
 */
export function formatCategoryStatsText(stat: CategoryStat): string {
  if (stat.total === 0) return "";
  if (stat.inProgress > 0) {
    return `${stat.mastered}(${stat.inProgress})/${stat.total}`;
  }
  return `${stat.mastered}/${stat.total}`;
}

/**
 * 統計と studied キー集合から学習状態を判定する。
 *
 * - 全問習得済み（`mastered === total > 0`）: `learned` (✅)
 * - 上記以外で `inProgress > 0` または `studiedKeys.has(key)`: `studying` (🔄)
 * - それ以外: `unlearned` (⬜)
 */
export function deriveCategoryItemStatus(
  stat: CategoryStat,
  studiedKeys: Set<string>,
  key: string,
): CategoryItemStatusView {
  const isAllMastered = stat.total > 0 && stat.mastered === stat.total;
  const isStudying = !isAllMastered && (stat.inProgress > 0 || studiedKeys.has(key));
  if (isAllMastered) return { status: "learned", icon: "✅" };
  if (isStudying) return { status: "studying", icon: "🔄" };
  return { status: "unlearned", icon: "⬜" };
}

/**
 * `data-subject` / `data-category` から統計マップ参照キーを組み立てる。
 * `category === "all"` の場合は subject 全体集計のキーを返す。
 */
export function categoryStatsKey(subject: string, category: string): string {
  return category !== "all" ? `${subject}::${category}` : `${subject}::all`;
}
