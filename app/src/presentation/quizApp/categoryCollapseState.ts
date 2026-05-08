/**
 * カテゴリ折りたたみ状態（親カテゴリ・トップカテゴリ）の DOM 反映ヘルパー。
 *
 * 折りたたみ状態自体は呼び出し元の `Set<string>` で管理し、
 * このモジュールは DOM への反映のみを行う。
 */

/** 親カテゴリ（`category-group[data-parent-category]`）の折りたたみ状態を DOM に反映する。 */
export function applyParentCategoryCollapsedState(parentCatId: string, isCollapsed: boolean): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const groupDiv = categoryList.querySelector<HTMLElement>(`.category-group[data-parent-category="${parentCatId}"]`);
  if (groupDiv) {
    groupDiv.classList.toggle("collapsed", isCollapsed);
    const toggleButton = groupDiv.querySelector<HTMLElement>(".category-group-toggle");
    toggleButton?.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  }
}

/** トップカテゴリ（`category-top-group[data-top-category]`）の折りたたみ状態を DOM に反映する。 */
export function applyTopCategoryCollapsedState(topCatId: string, isCollapsed: boolean): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const topGroupDiv = categoryList.querySelector<HTMLElement>(`.category-top-group[data-top-category="${topCatId}"]`);
  if (topGroupDiv) {
    topGroupDiv.classList.toggle("collapsed", isCollapsed);
    const toggleButton = topGroupDiv.querySelector<HTMLElement>(".category-top-group-toggle");
    toggleButton?.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  }
}

/**
 * カテゴリ一覧の学習状態フィルター（all/unlearned/studying/learned）を CSS クラスとボタン状態に反映する。
 */
export function applyCategoryStatusFilter(categoryStatusFilter: "all" | "unlearned" | "studying" | "learned"): void {
  const categoryList = document.getElementById("categoryList");
  if (categoryList) {
    categoryList.classList.remove("filter-unlearned", "filter-studying", "filter-learned", "hide-learned");
    if (categoryStatusFilter !== "all") {
      categoryList.classList.add(`filter-${categoryStatusFilter}`);
    }
  }
  const btnIds: Record<string, string> = {
    all: "filterStatusAll",
    unlearned: "filterStatusUnlearned",
    studying: "filterStatusStudying",
    learned: "filterStatusLearned",
  };
  for (const [state, id] of Object.entries(btnIds)) {
    const btn = document.getElementById(id);
    const isActive = state === categoryStatusFilter;
    btn?.classList.toggle("active", isActive);
    btn?.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}
