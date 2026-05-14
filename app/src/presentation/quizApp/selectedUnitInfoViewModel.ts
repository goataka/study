/**
 * 「選択中の単元情報」パネル（`#selectedUnitInfo`）の表示状態をビューモデルに変換する純粋ロジック。
 *
 * UseCase と選択状態から `SelectedUnitInfoViewModel` を計算する純粋関数群。
 * 実際の DOM 描画は React コンポーネント `SelectedUnitInfoPanel` が担う。
 */

import type { QuizUseCase, QuizFilter } from "../../application/quizUseCase";
import type { SelectedUnitInfoViewModel } from "../components/startScreen/SelectedUnitInfoPanel";

/** 単一単元の詳細ビューモデルを構築する。 */
export function buildSingleUnitViewModel(params: {
  useCase: QuizUseCase;
  subject: string;
  categoryId: string;
  categoryName: string;
  closeAriaLabel: string;
  onClose: () => void;
}): SelectedUnitInfoViewModel {
  const { useCase, subject, categoryId, categoryName, closeAriaLabel, onClose } = params;
  const topInfo = useCase.getTopCategoryForUnit(subject, categoryId);
  const parentInfo = useCase.getParentCategoryForUnit(subject, categoryId);
  const grade = useCase.getCategoryReferenceGrade(subject, categoryId);
  const example = useCase.getCategoryExample(subject, categoryId);
  const description = useCase.getCategoryDescription(subject, categoryId);
  const { mastered, total } = useCase.getMasteredCountForCategory(subject, categoryId);
  const inProgressCount = useCase.getInProgressCount({ subject, category: categoryId });
  return {
    kind: "full",
    closeAriaLabel,
    onClose,
    data: {
      name: categoryName,
      topCatName: topInfo?.name,
      parentCatName: parentInfo?.name,
      grade,
      example,
      description,
      mastered,
      inProgressCount,
      total,
    },
  };
}

/** 学年グループ選択時のビューモデルを構築する。 */
export function buildGradeGroupViewModel(params: {
  useCase: QuizUseCase;
  subject: string;
  grade: string;
  onDeselect: () => void;
}): SelectedUnitInfoViewModel {
  const { useCase, subject, grade, onDeselect } = params;
  const selectedCategoryEntries =
    grade === "none"
      ? Object.entries(useCase.getCategoriesWithoutGrade(subject))
      : Object.entries(useCase.getCategoriesForGrade(subject, grade));
  const selectedCategorySet = new Set(selectedCategoryEntries.map(([catId]) => catId));
  const { mastered, inProgressCount, total } = countCategoryStats(useCase, subject, selectedCategorySet);

  const gradeLabel = grade === "none" ? "学年未設定" : grade;
  const exampleText = grade === "none" ? "対象学年: 学年未設定" : `対象学年: ${grade}`;
  return {
    kind: "full",
    closeAriaLabel: "選択を解除して閉じる",
    onClose: onDeselect,
    data: {
      name: gradeLabel,
      description: `${selectedCategoryEntries.length}単元の解説`,
      example: exampleText,
      mastered,
      inProgressCount,
      total,
    },
  };
}

/** 親カテゴリ／トップカテゴリ選択時のビューモデルを構築する。 */
export function buildCategoryOrTopViewModel(params: {
  useCase: QuizUseCase;
  filter: QuizFilter;
  selectionLevel: "topCategory" | "parentCategory";
  selectedTopCategoryId: string | null;
  onDeselect: () => void;
}): SelectedUnitInfoViewModel {
  const { useCase, filter, selectionLevel, selectedTopCategoryId, onDeselect } = params;
  let name = "";
  let topCatName: string | undefined;
  const selectedCategoryEntries: Array<[string, string]> = [];

  if (selectionLevel === "parentCategory" && filter.parentCategory) {
    const parentCats = useCase.getParentCategoriesForSubject(filter.subject);
    name = parentCats[filter.parentCategory] ?? filter.parentCategory;
    const cats = useCase.getCategoriesForParent(filter.subject, filter.parentCategory);
    selectedCategoryEntries.push(...Object.entries(cats));
    const firstCatId = Object.keys(cats)[0];
    if (firstCatId) {
      topCatName = useCase.getTopCategoryForUnit(filter.subject, firstCatId)?.name;
    }
  } else if (selectionLevel === "topCategory" && selectedTopCategoryId) {
    const topCats = useCase.getTopCategoriesForSubject(filter.subject);
    name = topCats[selectedTopCategoryId] ?? selectedTopCategoryId;
    const parentCats = useCase.getParentCategoriesForTop(filter.subject, selectedTopCategoryId);
    for (const [parentCatId] of Object.entries(parentCats)) {
      const cats = useCase.getCategoriesForParent(filter.subject, parentCatId);
      selectedCategoryEntries.push(...Object.entries(cats));
    }
  }

  if (selectedCategoryEntries.length === 0) {
    return { kind: "simple", name, closeAriaLabel: "選択を解除して閉じる", onClose: onDeselect };
  }
  const uniqueEntries = Array.from(new Map(selectedCategoryEntries).entries());
  const gradeList = Array.from(
    new Set(
      uniqueEntries
        .map(([catId]) => useCase.getCategoryReferenceGrade(filter.subject, catId))
        .filter((grade): grade is string => !!grade),
    ),
  );
  const exampleText = gradeList.length > 0 ? `対象学年: ${gradeList.join(" / ")}` : "対象学年: 学年未設定";
  const summaryText = `${uniqueEntries.length}単元の解説`;
  const selectedCategorySet = new Set(uniqueEntries.map(([catId]) => catId));
  const { mastered, inProgressCount, total } = countCategoryStats(useCase, filter.subject, selectedCategorySet);
  return {
    kind: "full",
    closeAriaLabel: "選択を解除して閉じる",
    onClose: onDeselect,
    data: {
      name,
      topCatName,
      description: summaryText,
      example: exampleText,
      mastered,
      inProgressCount,
      total,
    },
  };
}

/** 指定教科の問題から、選択カテゴリ集合に含まれるものの mastered/inProgress/total を集計する。 */
function countCategoryStats(
  useCase: QuizUseCase,
  subject: string,
  selectedCategorySet: Set<string>,
): { mastered: number; inProgressCount: number; total: number } {
  const subjectQuestions = useCase.getFilteredQuestions({ subject, category: "all" });
  const masteredSet = new Set(useCase.getMasteredIds());
  const questionStats = useCase.getAllQuestionStats();
  let mastered = 0;
  let inProgressCount = 0;
  let total = 0;
  for (const q of subjectQuestions) {
    if (!selectedCategorySet.has(q.category)) continue;
    total++;
    if (masteredSet.has(q.id)) {
      mastered++;
    } else if ((questionStats[q.id]?.total ?? 0) > 0) {
      inProgressCount++;
    }
  }
  return { mastered, inProgressCount, total };
}
