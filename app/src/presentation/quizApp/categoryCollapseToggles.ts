/**
 * 親カテゴリ・トップカテゴリの折りたたみ状態をトグル／展開するヘルパー（純粋関数）。
 *
 * 状態保持用の `Set<string>` と DOM 反映関数（`applyParentCategoryCollapsedState` /
 * `applyTopCategoryCollapsedState`）の組み合わせで動作する。
 * QuizApp からは状態 `Set` を引数で受け取り、`this` には依存しない。
 */

import {
  applyParentCategoryCollapsedState,
  applyTopCategoryCollapsedState,
} from "./categoryCollapseState";

/**
 * 親カテゴリの折りたたみ状態をトグルし、DOM へ反映する。
 */
export function toggleParentCategory(
  collapsedParentCategories: Set<string>,
  parentCatId: string,
): void {
  if (collapsedParentCategories.has(parentCatId)) {
    collapsedParentCategories.delete(parentCatId);
  } else {
    collapsedParentCategories.add(parentCatId);
  }
  applyParentCategoryCollapsedState(parentCatId, collapsedParentCategories.has(parentCatId));
}

/**
 * 親カテゴリを強制的に展開する。既に展開されている場合は何もしない。
 */
export function expandParentCategory(
  collapsedParentCategories: Set<string>,
  parentCatId: string,
): void {
  if (!collapsedParentCategories.has(parentCatId)) return;
  collapsedParentCategories.delete(parentCatId);
  applyParentCategoryCollapsedState(parentCatId, false);
}

/**
 * トップカテゴリの折りたたみ状態をトグルし、DOM へ反映する。
 */
export function toggleTopCategory(collapsedTopCategories: Set<string>, topCatId: string): void {
  if (collapsedTopCategories.has(topCatId)) {
    collapsedTopCategories.delete(topCatId);
  } else {
    collapsedTopCategories.add(topCatId);
  }
  applyTopCategoryCollapsedState(topCatId, collapsedTopCategories.has(topCatId));
}

/**
 * トップカテゴリを強制的に展開する。既に展開されている場合は何もしない。
 */
export function expandTopCategory(collapsedTopCategories: Set<string>, topCatId: string): void {
  if (!collapsedTopCategories.has(topCatId)) return;
  collapsedTopCategories.delete(topCatId);
  applyTopCategoryCollapsedState(topCatId, false);
}
