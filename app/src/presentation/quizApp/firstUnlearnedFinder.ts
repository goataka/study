/**
 * スタート画面表示時に「学習済みではない最初のカテゴリ」を自動選択するヘルパー。
 *
 * カテゴリリスト DOM (`#categoryList`) から `.category-item:not(.learned)` を
 * 先頭から探し、見つかった単元の subject/category/parentCategory を返す。
 */

/** 自動選択された結果の単元情報。見つからなければ null。 */
export interface FirstUnlearnedCategory {
  subject: string;
  category: string;
  parentCategory: string | undefined;
}

/**
 * カテゴリリストから「最初の未学習カテゴリ」を見つけて返す。
 *
 * @param hasExplicitSelectionParam URL パラメータで教科またはカテゴリが明示指定されているか。
 *                                  true の場合はディープリンク挙動を維持するため null を返す。
 * @returns 見つかった単元情報、または null
 */
export function findFirstUnlearnedCategory(hasExplicitSelectionParam: boolean): FirstUnlearnedCategory | null {
  if (hasExplicitSelectionParam) return null;

  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return null;

  const firstUnlearned = categoryList.querySelector<HTMLElement>(".category-item:not(.learned)");
  if (!firstUnlearned) return null;

  const subject = firstUnlearned.dataset.subject;
  const category = firstUnlearned.dataset.category;
  if (!subject || !category) return null;

  return {
    subject,
    category,
    parentCategory: firstUnlearned.dataset.parentCategory,
  };
}
