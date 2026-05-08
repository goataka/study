/**
 * 総合タブの各教科おすすめ単元一覧（renderAllSubjectList）の DOM 構築ヘルパー。
 *
 * 教科行ヘッダー、カテゴリグループヘッダー、おすすめ単元カードといった
 * 純粋な DOM 構築処理を、QuizApp から切り出したもの。
 */

import { gradeColorClass, calcDualProgressPct } from "./uiHelpers";

/**
 * 単一のおすすめ単元（QuizUseCase.getRecommendedCategoriesForSubject の戻り値要素）。
 * 必要なフィールドだけを切り出した最小インターフェース。
 */
export interface RecommendedItem {
  id: string;
  name: string;
  isLearned: boolean;
  referenceGrade?: string;
}

/**
 * カテゴリでグループ化したおすすめ単元の集合。
 */
export interface RecommendedGroup {
  topCatId: string;
  topCatName: string;
  parentCatId: string;
  parentCatName: string;
  items: RecommendedItem[];
}

/**
 * 親カテゴリ・トップカテゴリ情報を取得するためのインターフェース。
 */
export interface CategoryLookup {
  getTopCategoryForUnit(subject: string, categoryId: string): { id: string; name: string } | undefined;
  getParentCategoryForUnit(subject: string, categoryId: string): { id: string; name: string } | undefined;
}

/**
 * おすすめ単元を「同一親カテゴリ」でグループ化し、未学習を含むグループ／未学習単元が先頭になるように並べる。
 */
export function groupRecommendedByCategory<T extends RecommendedItem>(
  subjectId: string,
  recommendedList: T[],
  lookup: CategoryLookup,
): { topCatId: string; topCatName: string; parentCatId: string; parentCatName: string; items: T[] }[] {
  type GroupKey = string;
  const groupOrder: GroupKey[] = [];
  const groupMap = new Map<
    GroupKey,
    { topCatId: string; topCatName: string; parentCatId: string; parentCatName: string; items: T[] }
  >();

  for (const recommended of recommendedList) {
    const parentCat = lookup.getParentCategoryForUnit(subjectId, recommended.id);
    const topCat = lookup.getTopCategoryForUnit(subjectId, recommended.id);
    const topCatId = topCat?.id ?? "";
    const topCatName = topCat?.name ?? "";
    const parentCatId = parentCat?.id ?? "";
    const parentCatName = parentCat?.name ?? "";
    const key: GroupKey = `${topCatId}::${parentCatId}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { topCatId, topCatName, parentCatId, parentCatName, items: [] });
      groupOrder.push(key);
    }
    groupMap.get(key)!.items.push(recommended);
  }

  // 未学習単元を含むグループを先頭に
  groupOrder.sort((a, b) => {
    const aHasUnlearned = groupMap.get(a)!.items.some((i) => !i.isLearned);
    const bHasUnlearned = groupMap.get(b)!.items.some((i) => !i.isLearned);
    if (aHasUnlearned && !bHasUnlearned) return -1;
    if (!aHasUnlearned && bHasUnlearned) return 1;
    return 0;
  });
  // 各グループ内でも未学習単元を先頭に
  for (const key of groupOrder) {
    const group = groupMap.get(key)!;
    group.items.sort((a, b) => {
      if (!a.isLearned && b.isLearned) return -1;
      if (a.isLearned && !b.isLearned) return 1;
      return 0;
    });
  }

  return groupOrder.map((key) => groupMap.get(key)!);
}

/**
 * 教科 1 件分の見出し行（アイコン・名称・目標数コントロール）を組み立てる。
 *
 * @param subject 教科情報
 * @param currentCount 現在の表示数（1 / 3 / 5）
 * @param onCountChange 目標数ボタンが押されたときのコールバック
 */
export function buildSubjectOverviewHeaderRow(
  subject: { id: string; name: string; icon: string },
  currentCount: number,
  onCountChange: (n: number) => void,
): HTMLElement {
  const subjectRow = document.createElement("div");
  subjectRow.className = "subject-overview-subject-row";

  const iconSpan = document.createElement("span");
  iconSpan.className = "subject-overview-icon";
  iconSpan.textContent = subject.icon;
  subjectRow.appendChild(iconSpan);

  const nameSpan = document.createElement("span");
  nameSpan.className = "subject-overview-name";
  nameSpan.textContent = subject.name;
  subjectRow.appendChild(nameSpan);

  // 教科ごとの表示数コントロール（1 / 3 / 5）
  const countControls = document.createElement("div");
  countControls.className = "subject-rec-count-controls";
  const countLabel = document.createElement("span");
  countLabel.className = "subject-rec-count-label";
  countLabel.textContent = "目標数:";
  countControls.appendChild(countLabel);
  for (const n of [1, 3, 5]) {
    const btn = document.createElement("button");
    btn.className = "overall-rec-count-btn";
    btn.type = "button";
    btn.textContent = String(n);
    btn.setAttribute("aria-pressed", String(currentCount === n));
    if (currentCount === n) btn.classList.add("active");
    btn.addEventListener("click", () => onCountChange(n));
    countControls.appendChild(btn);
  }
  subjectRow.appendChild(countControls);

  return subjectRow;
}

/**
 * 「単元なし」表示用のシンプルなアイテムを組み立てる。
 */
export function buildSubjectOverviewEmptyItem(subjectId: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "subject-overview-item";
  item.dataset.subject = subjectId;
  item.textContent = "単元なし";
  return item;
}

/**
 * カテゴリグループの見出し行（topCat › parentCat、または parentCat のみ）を組み立てる。
 * 親カテゴリが存在しない場合は null を返す。
 */
export function buildCategoryGroupHeader(group: RecommendedGroup): HTMLElement | null {
  if (!group.parentCatId) return null;
  const catHeader = document.createElement("div");
  catHeader.className = "subject-overview-cat-header";
  if (group.topCatId && group.topCatId !== group.parentCatId) {
    const topSpan = document.createElement("span");
    topSpan.className = "subject-overview-outer-cat";
    topSpan.textContent = group.topCatName;
    catHeader.appendChild(topSpan);
    const arrow = document.createElement("span");
    arrow.className = "subject-overview-cat-header-arrow";
    arrow.textContent = " › ";
    catHeader.appendChild(arrow);
  }
  const parentSpan = document.createElement("span");
  parentSpan.className = "subject-overview-outer-cat";
  parentSpan.textContent = group.parentCatName;
  catHeader.appendChild(parentSpan);
  return catHeader;
}

/**
 * おすすめ単元 1 件分のカード（ステータスアイコン + 名前 + 学年バッジ + 進捗バー）を組み立てる。
 */
export function buildRecommendedUnitCard(
  subjectId: string,
  recommended: RecommendedItem,
  stats: { mastered: number; total: number; inProgressCount: number; isStudying: boolean },
  onActivate: () => void,
): HTMLElement {
  const item = document.createElement("div");
  item.className = "subject-overview-item";
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.dataset.subject = subjectId;

  // ステータスアイコン
  const statusSpan = document.createElement("span");
  statusSpan.className = "subject-overview-status";
  statusSpan.setAttribute("aria-hidden", "true");
  const isAllMastered = stats.total > 0 && stats.mastered === stats.total;
  if (isAllMastered) {
    statusSpan.textContent = "✅";
  } else if (stats.isStudying) {
    statusSpan.textContent = "🔄";
  } else {
    statusSpan.textContent = "⬜";
  }

  const nameArea = document.createElement("div");
  nameArea.className = "subject-overview-name-area";

  // タイトル行: 名前（左）+ 学年バッジ（右）
  const titleRow = document.createElement("div");
  titleRow.className = "subject-overview-title-row";
  const recName = document.createElement("span");
  recName.className = "subject-overview-rec-name";
  recName.textContent = recommended.name;
  titleRow.appendChild(recName);

  if (recommended.referenceGrade) {
    const gradeSpan = document.createElement("span");
    gradeSpan.className = "subject-overview-grade";
    const gradeClassName = gradeColorClass(recommended.referenceGrade);
    if (gradeClassName) gradeSpan.classList.add(gradeClassName);
    gradeSpan.textContent = recommended.referenceGrade;
    titleRow.appendChild(gradeSpan);
  }
  nameArea.appendChild(titleRow);

  // 進捗行: 進捗バー（緑+黄）+ 進捗数値
  const progressRow = document.createElement("div");
  progressRow.className = "subject-overview-progress-row";
  const progressBar = document.createElement("div");
  progressBar.className = "subject-overview-progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "subject-overview-progress-fill";
  const { masteredPct, inProgressPct } = calcDualProgressPct(stats.mastered, stats.inProgressCount, stats.total);
  progressFill.style.width = `${masteredPct}%`;
  progressBar.appendChild(progressFill);
  const progressFillInProgress = document.createElement("div");
  progressFillInProgress.className = "subject-overview-progress-fill-inprogress";
  progressFillInProgress.style.width = `${inProgressPct}%`;
  progressBar.appendChild(progressFillInProgress);
  progressRow.appendChild(progressBar);

  if (stats.total > 0) {
    const pctSpan = document.createElement("span");
    pctSpan.className = "subject-overview-pct";
    pctSpan.textContent =
      stats.inProgressCount > 0
        ? `${stats.mastered}(${stats.inProgressCount})/${stats.total}`
        : `${stats.mastered}/${stats.total}`;
    progressRow.appendChild(pctSpan);
  }
  nameArea.appendChild(progressRow);

  item.appendChild(statusSpan);
  item.appendChild(nameArea);

  item.addEventListener("click", onActivate);
  item.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  });

  return item;
}
