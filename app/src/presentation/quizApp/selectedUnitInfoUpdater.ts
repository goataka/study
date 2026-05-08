/**
 * 「選択中の単元情報」パネル（#selectedUnitInfo）の更新ヘルパー。
 *
 * 選択レベル（unit / parentCategory / topCategory / 学年グループ）に応じて
 * 対応する詳細サマリ（タイトル・カテゴリ・例文・進捗バー＋閉じるボタン）を描画する。
 */

import type { QuizUseCase, QuizFilter } from "../../application/quizUseCase";
import {
  buildSelectedUnitInfoBody,
  buildSelectedUnitInfoSimpleBody,
  buildSelectedUnitCloseButton,
} from "../selectedUnitInfoView";
import { renderSelectedUnitInfo } from "./selectedUnitInfoRenderer";

/** 選択中の単元コンテキスト（総合タブから単元選択中の場合に使われる）。 */
export interface SelectedUnitContext {
  subject: string;
  categoryId: string;
  categoryName: string;
}

/** updateSelectedUnitInfo に渡すパラメータ群。 */
export interface UpdateSelectedUnitInfoParams {
  useCase: QuizUseCase;
  filter: QuizFilter;
  selectionLevel: "none" | "topCategory" | "parentCategory" | "unit";
  /** 総合タブから単元を選択した際のコンテキスト。 */
  selectedUnitContext: SelectedUnitContext | null;
  /** 教科タブのカテゴリビュー（"category" or "grade"）。 */
  categoryViewMode: "category" | "grade";
  /** 学年別ビューで選択中の学年グループ ID。 */
  selectedGradeGroup: string | null;
  /** トップカテゴリ選択中の ID。 */
  selectedTopCategoryId: string | null;
  /** 「単元の解説を閉じる」（総合タブから単元選択時）の閉じるハンドラ。 */
  onCloseOverallUnitView: () => void;
  /** 「選択を解除して閉じる」の閉じるハンドラ。 */
  onDeselect: () => void;
}

/**
 * 「選択中の単元情報」パネルを更新する。
 */
export function updateSelectedUnitInfo(params: UpdateSelectedUnitInfoParams): void {
  const container = document.getElementById("selectedUnitInfo");
  if (!container) return;

  const { useCase, filter, selectionLevel, selectedUnitContext, categoryViewMode, selectedGradeGroup } = params;

  // 総合タブから単元が選択されている場合: 教科の画面と同じ形式で詳細を表示
  if (selectedUnitContext !== null) {
    const { subject, categoryId, categoryName } = selectedUnitContext;
    renderSelectedUnitInfo(
      useCase,
      container,
      subject,
      categoryId,
      categoryName,
      "単元の解説を閉じる",
      params.onCloseOverallUnitView,
    );
    return;
  }

  if (categoryViewMode === "grade" && selectedGradeGroup !== null && filter.subject !== "all") {
    renderGradeGroupSummary(container, useCase, filter.subject, selectedGradeGroup, params.onDeselect);
    return;
  }

  if (selectionLevel === "none" || filter.subject === "all") {
    container.classList.add("hidden");
    document.getElementById("categoryList")?.classList.remove("detail-active");
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = "";

  if (selectionLevel === "unit") {
    const cats = useCase.getCategoriesForSubject(filter.subject);
    const name = cats[filter.category] ?? filter.category;
    renderSelectedUnitInfo(
      useCase,
      container,
      filter.subject,
      filter.category,
      name,
      "選択を解除して閉じる",
      params.onDeselect,
    );
    return;
  }

  renderCategoryOrTopSummary(
    container,
    useCase,
    filter,
    selectionLevel,
    params.selectedTopCategoryId,
    params.onDeselect,
  );
}

/** 学年グループ選択時のサマリを描画する。 */
function renderGradeGroupSummary(
  container: HTMLElement,
  useCase: QuizUseCase,
  subject: string,
  grade: string,
  onDeselect: () => void,
): void {
  container.classList.remove("hidden");
  container.innerHTML = "";

  const selectedCategoryEntries =
    grade === "none"
      ? Object.entries(useCase.getCategoriesWithoutGrade(subject))
      : Object.entries(useCase.getCategoriesForGrade(subject, grade));
  const selectedCategorySet = new Set(selectedCategoryEntries.map(([catId]) => catId));
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
  const gradeLabel = grade === "none" ? "学年未設定" : grade;
  const exampleText = grade === "none" ? "対象学年: 学年未設定" : `対象学年: ${grade}`;
  container.appendChild(
    buildSelectedUnitInfoBody({
      name: gradeLabel,
      description: `${selectedCategoryEntries.length}単元の解説`,
      example: exampleText,
      mastered,
      inProgressCount,
      total,
    }),
  );
  container.appendChild(buildSelectedUnitCloseButton("選択を解除して閉じる", onDeselect));
  document.getElementById("categoryList")?.classList.add("detail-active");
}

/** 親カテゴリ／トップカテゴリ選択時のサマリを描画する。 */
function renderCategoryOrTopSummary(
  container: HTMLElement,
  useCase: QuizUseCase,
  filter: QuizFilter,
  selectionLevel: "topCategory" | "parentCategory",
  selectedTopCategoryId: string | null,
  onDeselect: () => void,
): void {
  let name: string;
  let topCatName: string | undefined;
  const selectedCategoryEntries: Array<[string, string]> = [];
  if (selectionLevel === "parentCategory" && filter.parentCategory) {
    const parentCats = useCase.getParentCategoriesForSubject(filter.subject);
    name = parentCats[filter.parentCategory] ?? filter.parentCategory;
    const cats = useCase.getCategoriesForParent(filter.subject, filter.parentCategory);
    selectedCategoryEntries.push(...Object.entries(cats));
    // 親カテゴリのトップカテゴリ名を取得（パンくずに使用）
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
  } else {
    name = "";
  }

  if (selectedCategoryEntries.length === 0) {
    container.appendChild(buildSelectedUnitInfoSimpleBody(name));
    container.appendChild(buildSelectedUnitCloseButton("選択を解除して閉じる", onDeselect));
    document.getElementById("categoryList")?.classList.add("detail-active");
    return;
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
  const subjectQuestions = useCase.getFilteredQuestions({ subject: filter.subject, category: "all" });
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
  container.appendChild(
    buildSelectedUnitInfoBody({
      name,
      topCatName,
      description: summaryText,
      example: exampleText,
      mastered,
      inProgressCount,
      total,
    }),
  );
  container.appendChild(buildSelectedUnitCloseButton("選択を解除して閉じる", onDeselect));
  document.getElementById("categoryList")?.classList.add("detail-active");
}
