/**
 * カテゴリリスト描画ヘルパー（カテゴリ別ビュー / 学年別ビュー）。
 *
 * - `renderCategoryListByCategory`: 親カテゴリ・トップカテゴリの 3 階層で描画
 * - `renderCategoryListByGrade`: 学年グループ単位で描画
 *
 * いずれも `categoryItemBuilder` の単元アイテム生成・親カテゴリグループ生成を利用する。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import {
  createCategoryItem,
  buildParentCategoryGroup,
  type CreateCategoryItemParams,
  type BuildParentCategoryGroupParams,
} from "./categoryItemBuilder";

/** トップカテゴリヘッダークリック時の選択／非選択トグル処理。 */
export type TopHeaderClickHandler = (topCatId: string) => void;
/** 学年グループヘッダークリック時の選択／非選択トグル処理。 */
export type GradeHeaderClickHandler = (grade: string) => void;
/** トップカテゴリ折りたたみトグル。 */
export type ToggleTopCategoryHandler = (topCatId: string) => void;
/** 学年グループ折りたたみ状態を保持する Set への直接トグル。 */

/** renderCategoryListByCategory に渡すパラメータ。 */
export interface RenderCategoryListByCategoryParams {
  useCase: QuizUseCase;
  subject: string;
  /** 学年フィルターに合致するかを判定するクロージャ。 */
  gradeFilterMatches: (subject: string, catId: string) => boolean;
  /** 折りたたみ済みのトップカテゴリ ID Set。 */
  collapsedTopCategories: Set<string>;
  /** 選択中のトップカテゴリ ID（null 時は選択なし）。 */
  getSelectedTopCategoryId: () => string | null;
  itemCtx: CreateCategoryItemParams;
  parentGroupCtx: BuildParentCategoryGroupParams;
  onTopHeaderClick: TopHeaderClickHandler;
  onToggleTopCategory: ToggleTopCategoryHandler;
}

/**
 * カテゴリ別ビュー（既存の階層構造）でカテゴリリストを描画する。
 * gradeFilter が設定されている場合は学年でフィルタリングする。
 */
export function renderCategoryListByCategory(params: RenderCategoryListByCategoryParams): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const { useCase, subject } = params;

  // 全親カテゴリとその配下のカテゴリを収集
  const allParentCategories = useCase.getParentCategoriesForSubject(subject);
  const categoriesByParent = new Map<string, Record<string, string>>();
  for (const [parentCatId] of Object.entries(allParentCategories)) {
    const cats = useCase.getCategoriesForParent(subject, parentCatId);
    // 学年フィルターを適用
    const filtered: Record<string, string> = {};
    for (const [catId, catName] of Object.entries(cats)) {
      if (params.gradeFilterMatches(subject, catId)) {
        filtered[catId] = catName;
      }
    }
    categoriesByParent.set(parentCatId, filtered);
  }

  // トップカテゴリがある場合は3階層で描画
  const topCategories = useCase.getTopCategoriesForSubject(subject);
  const parentCatIdsInTopGroups = new Set<string>();

  for (const [topCatId, topCatName] of Object.entries(topCategories)) {
    const parentCatsForTop = useCase.getParentCategoriesForTop(subject, topCatId);

    // このトップカテゴリに表示すべきカテゴリがあるか確認
    let hasVisibleItems = false;
    for (const [parentCatId] of Object.entries(parentCatsForTop)) {
      parentCatIdsInTopGroups.add(parentCatId);
      const cats = categoriesByParent.get(parentCatId) ?? {};
      if (Object.keys(cats).length > 0) {
        hasVisibleItems = true;
      }
    }
    if (!hasVisibleItems) continue;

    const topGroupDiv = buildTopGroup(topCatId, topCatName, params.collapsedTopCategories.has(topCatId));
    const { topGroupHeader, topToggleArrow } = topGroupDiv;

    for (const [parentCatId, parentCatName] of Object.entries(parentCatsForTop)) {
      const cats = categoriesByParent.get(parentCatId) ?? {};
      if (Object.keys(cats).length === 0) continue;
      const groupDiv = buildParentCategoryGroup(
        params.parentGroupCtx,
        subject,
        parentCatId,
        parentCatName,
        cats,
        topCatId,
      );
      topGroupDiv.element.appendChild(groupDiv);
    }

    const handleTopHeaderClick = (e: Event): void => {
      e.stopPropagation();
      params.onTopHeaderClick(topCatId);
    };
    topGroupHeader.addEventListener("click", handleTopHeaderClick);
    topGroupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleTopHeaderClick(e);
      }
    });
    topToggleArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      params.onToggleTopCategory(topCatId);
    });

    categoryList.appendChild(topGroupDiv.element);
  }

  // トップカテゴリに属さない親カテゴリグループ（2階層の孤立グループ）
  for (const [parentCatId, parentCatName] of Object.entries(allParentCategories)) {
    if (parentCatIdsInTopGroups.has(parentCatId)) continue;
    const cats = categoriesByParent.get(parentCatId) ?? {};
    if (Object.keys(cats).length === 0) continue;
    const groupDiv = buildParentCategoryGroup(params.parentGroupCtx, subject, parentCatId, parentCatName, cats);
    categoryList.appendChild(groupDiv);
  }

  // 親カテゴリに属さないスタンドアロンカテゴリ
  const allCategories = useCase.getCategoriesForSubject(subject);
  for (const [catId, catName] of Object.entries(allCategories)) {
    const belongsToParent = Array.from(categoriesByParent.values()).some((cats) => catId in cats);
    if (!belongsToParent && params.gradeFilterMatches(subject, catId)) {
      const catItem = createCategoryItem(params.itemCtx, subject, catId, catName);
      categoryList.appendChild(catItem);
    }
  }
}

/** トップカテゴリグループ要素の DOM ノードと参照を返す。 */
function buildTopGroup(
  topCatId: string,
  topCatName: string,
  collapsed: boolean,
): { element: HTMLElement; topGroupHeader: HTMLElement; topToggleArrow: HTMLButtonElement } {
  const topGroupDiv = document.createElement("div");
  topGroupDiv.className = "category-top-group";
  topGroupDiv.dataset.topCategory = topCatId;

  const topGroupHeader = document.createElement("div");
  topGroupHeader.className = "category-top-group-header";
  topGroupHeader.setAttribute("role", "button");
  topGroupHeader.setAttribute("tabindex", "0");
  topGroupHeader.dataset.topCategory = topCatId;

  const topToggleArrow = document.createElement("button");
  topToggleArrow.type = "button";
  topToggleArrow.className = "category-top-group-toggle";
  topToggleArrow.setAttribute("aria-label", "セクションの折りたたみを切り替える");
  topToggleArrow.setAttribute("aria-expanded", collapsed ? "false" : "true");
  topGroupHeader.appendChild(topToggleArrow);

  const topHeaderText = document.createElement("span");
  topHeaderText.textContent = topCatName;
  topGroupHeader.appendChild(topHeaderText);

  topGroupDiv.appendChild(topGroupHeader);
  if (collapsed) topGroupDiv.classList.add("collapsed");

  return { element: topGroupDiv, topGroupHeader, topToggleArrow };
}

/** renderCategoryListByGrade に渡すパラメータ。 */
export interface RenderCategoryListByGradeParams {
  useCase: QuizUseCase;
  subject: string;
  /** 学年フィルター（プレフィックスマッチ）。 */
  selectedGradeFilter: string | null;
  /** 折りたたみ済みの学年グループ ID Set。 */
  collapsedGradeGroups: Set<string>;
  itemCtx: CreateCategoryItemParams;
  onGradeHeaderClick: GradeHeaderClickHandler;
}

/**
 * 学年別ビューでカテゴリリストを描画する。
 * 学年グループ（小学1年, 中学1年 等）でまとめて表示する。
 */
export function renderCategoryListByGrade(params: RenderCategoryListByGradeParams): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const { useCase, subject } = params;
  const grades = useCase.getUniqueGradesForSubject(subject);

  for (const grade of grades) {
    // 学年フィルターで絞る
    if (params.selectedGradeFilter && !grade.startsWith(params.selectedGradeFilter)) continue;

    const cats = useCase.getCategoriesForGrade(subject, grade);
    if (Object.keys(cats).length === 0) continue;

    const groupDiv = buildGradeGroup(grade, cats, grade, params);
    categoryList.appendChild(groupDiv);
  }

  // 学年未設定のカテゴリ（フィルターなしの場合のみ表示）
  if (!params.selectedGradeFilter) {
    const uncategorized = useCase.getCategoriesWithoutGrade(subject);
    if (Object.keys(uncategorized).length > 0) {
      const groupDiv = buildGradeGroup("none", uncategorized, "学年未設定", params);
      categoryList.appendChild(groupDiv);
    }
  }
}

/** 学年グループ要素を生成する（通常学年・「学年未設定」共通）。 */
function buildGradeGroup(
  gradeId: string,
  cats: Record<string, string>,
  headerLabel: string,
  params: RenderCategoryListByGradeParams,
): HTMLElement {
  const groupDiv = document.createElement("div");
  groupDiv.className = "category-grade-group";
  groupDiv.dataset.grade = gradeId;

  const groupHeader = document.createElement("div");
  groupHeader.className = "category-grade-group-header";
  groupHeader.setAttribute("role", "button");
  groupHeader.setAttribute("tabindex", "0");
  groupHeader.dataset.grade = gradeId;

  const toggleArrow = document.createElement("button");
  toggleArrow.type = "button";
  toggleArrow.className = "category-grade-group-toggle";
  toggleArrow.setAttribute("aria-label", "セクションの折りたたみを切り替える");
  toggleArrow.setAttribute("aria-expanded", params.collapsedGradeGroups.has(gradeId) ? "false" : "true");
  groupHeader.appendChild(toggleArrow);

  const headerText = document.createElement("span");
  headerText.textContent = headerLabel;
  groupHeader.appendChild(headerText);

  groupDiv.appendChild(groupHeader);

  for (const [catId, catName] of Object.entries(cats)) {
    const catItem = createCategoryItem(params.itemCtx, params.subject, catId, catName);
    groupDiv.appendChild(catItem);
  }

  if (params.collapsedGradeGroups.has(gradeId)) {
    groupDiv.classList.add("collapsed");
  }

  const handleToggle = (e: Event): void => {
    e.stopPropagation();
    if (params.collapsedGradeGroups.has(gradeId)) {
      params.collapsedGradeGroups.delete(gradeId);
      groupDiv.classList.remove("collapsed");
      toggleArrow.setAttribute("aria-expanded", "true");
    } else {
      params.collapsedGradeGroups.add(gradeId);
      groupDiv.classList.add("collapsed");
      toggleArrow.setAttribute("aria-expanded", "false");
    }
  };
  const handleHeaderClick = (e: Event): void => {
    e.stopPropagation();
    params.onGradeHeaderClick(gradeId);
  };
  groupHeader.addEventListener("click", handleHeaderClick);
  groupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleHeaderClick(e);
    }
  });
  toggleArrow.addEventListener("click", handleToggle);

  return groupDiv;
}
