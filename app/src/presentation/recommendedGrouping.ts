/**
 * 総合タブの「教科別おすすめ単元」を親カテゴリでグルーピングするための純粋ロジック。
 *
 * かつてはここに DOM 構築ヘルパー（`buildSubjectOverviewHeaderRow` 等）も
 * 置かれていたが、UI 描画は React コンポーネント `AllSubjectList`
 * （`presentation/quizApp/allSubjectListRenderer.tsx`）に移管したため、
 * 残るのはおすすめ単元のグルーピング・並び替え（`groupRecommendedByCategory`）
 * のような副作用なしの純粋関数のみ。
 */

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
 *
 * 戻り値の `items` は呼び出し元の具象型を保つため、`RecommendedGroup` ではなく
 * ジェネリックな `T extends RecommendedItem` を使ったインライン構造体型にしている。
 * 通常用途では `RecommendedGroup` 互換の構造を返す。
 */
export function groupRecommendedByCategory<T extends RecommendedItem>(
  subjectId: string,
  recommendedList: T[],
  lookup: CategoryLookup,
): Array<Omit<RecommendedGroup, "items"> & { items: T[] }> {
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
