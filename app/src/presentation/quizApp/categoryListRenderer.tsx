/**
 * カテゴリリスト描画ヘルパー（カテゴリ別ビュー / 学年別ビュー）。
 *
 * - `renderCategoryListByCategory`: 親カテゴリ・トップカテゴリの 3 階層で描画
 * - `renderCategoryListByGrade`: 学年グループ単位で描画
 *
 * DOM 互換を維持しつつ、カテゴリリスト本体の組み立てを React コンポーネントへ寄せる。
 */

import * as React from "react";
import type { QuizUseCase } from "../../application/quizUseCase";
import { CategoryItem, type CategoryItemProps } from "../components/CategoryItem";
import { ParentCategoryGroup, type ParentCategoryGroupProps } from "../components/ParentCategoryGroup";
import {
  type CreateCategoryItemParams,
  type BuildParentCategoryGroupParams,
} from "./categoryItemBuilder";
import { renderReactInto } from "./reactMount";

/** トップカテゴリヘッダークリック時の選択／非選択トグル処理。 */
export type TopHeaderClickHandler = (topCatId: string) => void;
/** 学年グループヘッダークリック時の選択／非選択トグル処理。 */
export type GradeHeaderClickHandler = (grade: string) => void;
/** トップカテゴリ折りたたみトグル。 */
export type ToggleTopCategoryHandler = (topCatId: string) => void;

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

interface TopCategoryGroupProps {
  topCatId: string;
  topCatName: string;
  collapsed: boolean;
  onHeaderActivate: () => void;
  onToggle: () => void;
  children: React.ReactNode;
}

function TopCategoryGroup(props: TopCategoryGroupProps): React.JSX.Element {
  const { topCatId, topCatName, collapsed, onHeaderActivate, onToggle, children } = props;

  return (
    <div
      className={["category-top-group flex flex-col gap-0.5 mt-1", collapsed ? "collapsed" : ""].filter(Boolean).join(" ")}
      data-top-category={topCatId}
    >
      <div
        className={[
          "category-top-group-header",
          "flex items-center gap-1.5 text-[13px] font-bold text-white bg-[#0366d6] px-[10px] py-1.5 rounded-md cursor-pointer select-none",
          "transition-[background] duration-150 hover:bg-[#0256b8]",
          "[&.active]:bg-[#024a9e] [&.active]:shadow-[0_0_0_2px_rgba(255,255,255,0.4)]",
        ].join(" ")}
        data-top-category={topCatId}
        onClick={onHeaderActivate}
      >
        <button
          type="button"
          className="category-top-group-toggle border-none bg-transparent p-0 m-0 text-inherit cursor-pointer leading-none opacity-80"
          aria-label="セクションの折りたたみを切り替える"
          aria-expanded={collapsed ? "false" : "true"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        />
        <button
          type="button"
          className="category-group-header-action flex-1 border-none bg-transparent p-0 m-0 font-[inherit] text-inherit text-left cursor-pointer"
        >
          {topCatName}
        </button>
      </div>
      {children}
    </div>
  );
}

interface GradeCategoryGroupProps {
  gradeId: string;
  headerLabel: string;
  collapsed: boolean;
  items: CategoryItemProps[];
  onHeaderActivate: () => void;
  onToggle: () => void;
}

function GradeCategoryGroup(props: GradeCategoryGroupProps): React.JSX.Element {
  const { gradeId, headerLabel, collapsed, items, onHeaderActivate, onToggle } = props;

  return (
    <div
      className={["category-grade-group flex flex-col gap-0.5 mb-1", collapsed ? "collapsed" : ""].filter(Boolean).join(" ")}
      data-grade={gradeId}
    >
      <div
        className={[
          "category-grade-group-header",
          "flex items-center gap-1.5 text-[15px] font-bold text-[#1a1e23] bg-[#d1d5da] px-2 py-[5px] rounded cursor-pointer select-none",
        ].join(" ")}
        data-grade={gradeId}
        onClick={onHeaderActivate}
      >
        <button
          type="button"
          className="category-grade-group-toggle border-none bg-transparent p-0 m-0 text-inherit cursor-pointer leading-none"
          aria-label="セクションの折りたたみを切り替える"
          aria-expanded={collapsed ? "false" : "true"}
          onClick={(e) => {
            e.stopPropagation();
            const group = e.currentTarget.closest<HTMLElement>(".category-grade-group");
            const nextCollapsed = !group?.classList.contains("collapsed");
            group?.classList.toggle("collapsed", nextCollapsed);
            e.currentTarget.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
            onToggle();
          }}
        />
        <button
          type="button"
          className="category-group-header-action flex-1 border-none bg-transparent p-0 m-0 font-[inherit] text-inherit text-left cursor-pointer"
        >
          {headerLabel}
        </button>
      </div>
      {items.map((item) => (
        <CategoryItem key={`${item.subject}::${item.categoryId}`} {...item} />
      ))}
    </div>
  );
}

function buildCategoryItemProps(
  ctx: CreateCategoryItemParams,
  subject: string,
  categoryId: string,
  categoryName: string,
  parentCatId?: string,
  topCatId?: string,
): CategoryItemProps {
  let hierarchy: { topName?: string; parentName?: string } | undefined;
  if (ctx.categoryViewMode === "grade") {
    const parentInfo = ctx.useCase.getParentCategoryForUnit(subject, categoryId);
    const topInfo = ctx.useCase.getTopCategoryForUnit(subject, categoryId);
    hierarchy = { topName: topInfo?.name, parentName: parentInfo?.name };
  }

  const onActivate = (): void => {
    if (ctx.filter.subject === subject && ctx.filter.category === categoryId) {
      ctx.callbacks.onDeselect();
      return;
    }
    const wasProgressTab = ctx.filter.subject === "progress";
    ctx.setFilter(subject, categoryId, parentCatId);
    ctx.resetSelectionOnUnit();
    if (wasProgressTab) {
      ctx.callbacks.onSelectTabByFilter();
      ctx.callbacks.onRenderCategoryList();
    }
    ctx.callbacks.onUpdateCategoryListActive();
    ctx.setPanelTabUserSelected(true);
    ctx.callbacks.onAutoSelectPanelTab();
    ctx.callbacks.onUpdateStartScreen();
    ctx.callbacks.onSyncURLFragment();
  };

  return {
    subject,
    categoryId,
    categoryName,
    parentCatId,
    topCatId,
    hierarchy,
    referenceGrade: ctx.useCase.getCategoryReferenceGrade(subject, categoryId),
    showReferenceGrade: ctx.categoryViewMode !== "grade",
    description: ctx.useCase.getCategoryDescription(subject, categoryId),
    example: ctx.useCase.getCategoryExample(subject, categoryId),
    onActivate,
  };
}

function buildParentCategoryGroupProps(
  params: BuildParentCategoryGroupParams,
  subject: string,
  parentCatId: string,
  parentCatName: string,
  cats: Record<string, string>,
  topCatId?: string,
): ParentCategoryGroupProps {
  return {
    subject,
    parentCatId,
    parentCatName,
    topCatId,
    collapsed: params.collapsedParentCategories.has(parentCatId),
    onHeaderActivate: () => params.onParentHeaderClick(parentCatId),
    onToggle: () => params.onToggleParentCategory(parentCatId),
    items: Object.entries(cats).map(([catId, catName]) =>
      buildCategoryItemProps(params.itemCtx, subject, catId, catName, parentCatId, topCatId),
    ),
  };
}

/**
 * カテゴリ別ビュー（既存の階層構造）でカテゴリリストを描画する。
 * gradeFilter が設定されている場合は学年でフィルタリングする。
 */
export function renderCategoryListByCategory(params: RenderCategoryListByCategoryParams): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const { useCase, subject } = params;

  const allParentCategories = useCase.getParentCategoriesForSubject(subject);
  const categoriesByParent = new Map<string, Record<string, string>>();
  for (const [parentCatId] of Object.entries(allParentCategories)) {
    const cats = useCase.getCategoriesForParent(subject, parentCatId);
    const filtered: Record<string, string> = {};
    for (const [catId, catName] of Object.entries(cats)) {
      if (params.gradeFilterMatches(subject, catId)) {
        filtered[catId] = catName;
      }
    }
    categoriesByParent.set(parentCatId, filtered);
  }

  const topCategories = useCase.getTopCategoriesForSubject(subject);
  const parentCatIdsInTopGroups = new Set<string>();
  const nodes: React.ReactNode[] = [];

  for (const [topCatId, topCatName] of Object.entries(topCategories)) {
    const parentCatsForTop = useCase.getParentCategoriesForTop(subject, topCatId);
    const groupItems: ParentCategoryGroupProps[] = [];

    for (const [parentCatId, parentCatName] of Object.entries(parentCatsForTop)) {
      parentCatIdsInTopGroups.add(parentCatId);
      const cats = categoriesByParent.get(parentCatId) ?? {};
      if (Object.keys(cats).length === 0) continue;
      groupItems.push(buildParentCategoryGroupProps(params.parentGroupCtx, subject, parentCatId, parentCatName, cats, topCatId));
    }

    if (groupItems.length === 0) continue;

    nodes.push(
      <TopCategoryGroup
        key={`top::${topCatId}`}
        topCatId={topCatId}
        topCatName={topCatName}
        collapsed={params.collapsedTopCategories.has(topCatId)}
        onHeaderActivate={() => params.onTopHeaderClick(topCatId)}
        onToggle={() => params.onToggleTopCategory(topCatId)}
      >
        {groupItems.map((group) => (
          <ParentCategoryGroup key={`parent::${group.parentCatId}`} {...group} />
        ))}
      </TopCategoryGroup>,
    );
  }

  for (const [parentCatId, parentCatName] of Object.entries(allParentCategories)) {
    if (parentCatIdsInTopGroups.has(parentCatId)) continue;
    const cats = categoriesByParent.get(parentCatId) ?? {};
    if (Object.keys(cats).length === 0) continue;
    const groupProps = buildParentCategoryGroupProps(params.parentGroupCtx, subject, parentCatId, parentCatName, cats);
    nodes.push(<ParentCategoryGroup key={`parent::${parentCatId}`} {...groupProps} />);
  }

  const allCategories = useCase.getCategoriesForSubject(subject);
  for (const [catId, catName] of Object.entries(allCategories)) {
    const belongsToParent = Array.from(categoriesByParent.values()).some((cats) => catId in cats);
    if (!belongsToParent && params.gradeFilterMatches(subject, catId)) {
      const itemProps = buildCategoryItemProps(params.itemCtx, subject, catId, catName);
      nodes.push(<CategoryItem key={`unit::${catId}`} {...itemProps} />);
    }
  }

  renderReactInto(categoryList, <>{nodes}</>);
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
  const groups: React.ReactNode[] = [];

  const pushGradeGroup = (gradeId: string, headerLabel: string, cats: Record<string, string>): void => {
    if (Object.keys(cats).length === 0) return;
    groups.push(
      <GradeCategoryGroup
        key={`grade::${gradeId}`}
        gradeId={gradeId}
        headerLabel={headerLabel}
        collapsed={params.collapsedGradeGroups.has(gradeId)}
        items={Object.entries(cats).map(([catId, catName]) => buildCategoryItemProps(params.itemCtx, subject, catId, catName))}
        onHeaderActivate={() => params.onGradeHeaderClick(gradeId)}
        onToggle={() => {
          if (params.collapsedGradeGroups.has(gradeId)) {
            params.collapsedGradeGroups.delete(gradeId);
          } else {
            params.collapsedGradeGroups.add(gradeId);
          }
        }}
      />,
    );
  };

  for (const grade of grades) {
    if (params.selectedGradeFilter && !grade.startsWith(params.selectedGradeFilter)) continue;
    pushGradeGroup(grade, grade, useCase.getCategoriesForGrade(subject, grade));
  }

  if (!params.selectedGradeFilter) {
    pushGradeGroup("none", "学年未設定", useCase.getCategoriesWithoutGrade(subject));
  }

  renderReactInto(categoryList, <>{groups}</>);
}
