/**
 * カテゴリアイテムと親カテゴリグループ要素の生成ヘルパー。
 *
 * `renderCategoryListByCategory` / `renderCategoryListByGrade` から共通利用される
 * カテゴリリストの DOM ノード生成と選択ハンドラ登録をまとめる。
 */

import type { QuizUseCase, QuizFilter } from "../../application/quizUseCase";
import { buildCategoryItem } from "../categoryItemView";

/** カテゴリ／親カテゴリ選択時に呼ばれるコールバック群。 */
export interface CategorySelectionCallbacks {
  /** 既選択の単元クリック時の選択解除。 */
  onDeselect: () => void;
  /** 教科タブを現在のフィルターに合わせる（進度タブから単元選択時に使用）。 */
  onSelectTabByFilter: () => void;
  /** カテゴリリストの再描画。 */
  onRenderCategoryList: () => void;
  /** カテゴリリストのアクティブ状態を更新。 */
  onUpdateCategoryListActive: () => void;
  /** 履歴に基づくパネルタブの自動選択。 */
  onAutoSelectPanelTab: () => void;
  /** スタート画面の再描画。 */
  onUpdateStartScreen: () => void;
  /** URL フラグメントの同期。 */
  onSyncURLFragment: () => void;
}

/** createCategoryItem 用のコンテキスト。 */
export interface CreateCategoryItemParams {
  useCase: QuizUseCase;
  filter: QuizFilter;
  categoryViewMode: "category" | "grade";
  /** 単元選択時に filter / 関連状態を変更するためのセッター。 */
  setFilter: (subject: string, categoryId: string, parentCatId?: string) => void;
  /** 単元選択時にトップカテゴリ選択 / 学年グループ選択をリセットする。 */
  resetSelectionOnUnit: () => void;
  /** isPanelTabUserSelected フラグを設定する。 */
  setPanelTabUserSelected: (value: boolean) => void;
  callbacks: CategorySelectionCallbacks;
}

/**
 * 単元アイテムを生成し、選択トグル／キーボード操作のリスナーを登録する。
 */
export function createCategoryItem(
  ctx: CreateCategoryItemParams,
  subject: string,
  categoryId: string,
  categoryName: string,
  parentCatId?: string,
  topCatId?: string,
): HTMLElement {
  // 学年別ビューでは親カテゴリ・トップカテゴリの名称を表示する
  let hierarchy: { topName?: string; parentName?: string } | undefined;
  if (ctx.categoryViewMode === "grade") {
    const parentInfo = ctx.useCase.getParentCategoryForUnit(subject, categoryId);
    const topInfo = ctx.useCase.getTopCategoryForUnit(subject, categoryId);
    hierarchy = { topName: topInfo?.name, parentName: parentInfo?.name };
  }

  const item = buildCategoryItem({
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
  });

  const handleActivate = (e: Event): void => {
    e.stopPropagation();
    // 既に選択中の単元をクリックした場合は非選択に戻す（トグル）
    if (ctx.filter.subject === subject && ctx.filter.category === categoryId) {
      ctx.callbacks.onDeselect();
      return;
    }
    const wasProgressTab = ctx.filter.subject === "progress";
    ctx.setFilter(subject, categoryId, parentCatId);
    ctx.resetSelectionOnUnit();
    if (wasProgressTab) {
      // 進度タブから単元を選択した場合: 対応する教科タブをアクティブにして再描画する
      ctx.callbacks.onSelectTabByFilter();
      ctx.callbacks.onRenderCategoryList();
    }
    ctx.callbacks.onUpdateCategoryListActive();
    // 単元を切り替えても前回のパネルタブを引き継ぐ（解説タブへの自動切換えを抑制）
    ctx.setPanelTabUserSelected(true);
    ctx.callbacks.onAutoSelectPanelTab();
    ctx.callbacks.onUpdateStartScreen();
    ctx.callbacks.onSyncURLFragment();
  };

  item.addEventListener("click", handleActivate);
  item.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate(e);
    }
  });

  return item;
}

/** buildParentCategoryGroup 用のコンテキスト。 */
export interface BuildParentCategoryGroupParams {
  filter: QuizFilter;
  /** 折りたたまれている親カテゴリ ID の Set。 */
  collapsedParentCategories: Set<string>;
  /** 現在の選択レベル。 */
  getSelectionLevel: () => "none" | "topCategory" | "parentCategory" | "unit";
  /** createCategoryItem 用コンテキスト（子単元の生成に使用）。 */
  itemCtx: CreateCategoryItemParams;
  /** 親カテゴリヘッダークリック時の選択トグル副作用群。 */
  onParentHeaderClick: (parentCatId: string) => void;
  /** 折りたたみアイコンクリック時のトグル。 */
  onToggleParentCategory: (parentCatId: string) => void;
}

/**
 * 親カテゴリグループ要素を生成して返す。
 * トップカテゴリグループの子として使われる場合は topCatId を渡す。
 */
export function buildParentCategoryGroup(
  params: BuildParentCategoryGroupParams,
  subject: string,
  parentCatId: string,
  parentCatName: string,
  cats: Record<string, string>,
  topCatId?: string,
): HTMLElement {
  const groupDiv = document.createElement("div");
  groupDiv.className = "category-group";
  groupDiv.dataset.parentCategory = parentCatId;
  if (topCatId) groupDiv.dataset.topCategory = topCatId;

  const groupHeader = document.createElement("div");
  groupHeader.className = "category-group-header";
  groupHeader.setAttribute("role", "button");
  groupHeader.setAttribute("tabindex", "0");
  groupHeader.dataset.parentCategory = parentCatId;

  const toggleArrow = document.createElement("button");
  toggleArrow.type = "button";
  toggleArrow.className = "category-group-toggle";
  toggleArrow.setAttribute("aria-label", "セクションの折りたたみを切り替える");
  toggleArrow.setAttribute("aria-expanded", params.collapsedParentCategories.has(parentCatId) ? "false" : "true");
  groupHeader.appendChild(toggleArrow);

  const headerText = document.createElement("span");
  headerText.textContent = parentCatName;
  groupHeader.appendChild(headerText);

  const learnedBadge = document.createElement("span");
  learnedBadge.className = "category-group-learned-badge";
  learnedBadge.setAttribute("aria-hidden", "true");
  groupHeader.appendChild(learnedBadge);

  groupDiv.appendChild(groupHeader);

  for (const [catId, catName] of Object.entries(cats)) {
    const catItem = createCategoryItem(params.itemCtx, subject, catId, catName, parentCatId, topCatId);
    groupDiv.appendChild(catItem);
  }

  if (params.collapsedParentCategories.has(parentCatId)) {
    groupDiv.classList.add("collapsed");
  }

  const handleHeaderClick = (e: Event): void => {
    e.stopPropagation();
    params.onParentHeaderClick(parentCatId);
  };
  groupHeader.addEventListener("click", handleHeaderClick);
  groupHeader.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleHeaderClick(e);
    }
  });
  toggleArrow.addEventListener("click", (e) => {
    e.stopPropagation();
    params.onToggleParentCategory(parentCatId);
  });

  return groupDiv;
}
