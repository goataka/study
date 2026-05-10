/**
 * カテゴリリストとパネルタブのアクティブ状態を DOM に反映するヘルパー群。
 */

import type { QuizFilter } from "../../application/quizUseCase";
import { setActivePanelTab } from "../components/startScreen/panelTabsStore";
import type { PanelTab } from "./tabsBuilder";

/** カテゴリリストアクティブ状態反映に必要な状態とコールバック。 */
export interface UpdateCategoryListActiveParams {
  filter: QuizFilter;
  selectionLevel: "none" | "topCategory" | "parentCategory" | "unit";
  selectedTopCategoryId: string | null;
  selectedGradeGroup: string | null;
  /** 学年グループの折りたたみ状態を保持する Set。アクティブ時は自動展開する。 */
  collapsedGradeGroups: Set<string>;
  /** 親カテゴリの自動展開ハンドラ。 */
  expandParentCategory: (parentCatId: string) => void;
  /** トップカテゴリの自動展開ハンドラ。 */
  expandTopCategory: (topCatId: string) => void;
}

/**
 * カテゴリリストおよびカテゴリヘッダーのアクティブ状態を更新する。
 *
 * - 単元アイテム: filter.subject/category と一致するものを active に
 * - アクティブな単元の親カテゴリ・トップカテゴリ・学年グループを自動展開
 * - 親カテゴリ／トップカテゴリ／学年グループのヘッダーも選択状態に応じて active に
 */
export function updateCategoryListActive(params: UpdateCategoryListActiveParams): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  categoryList.querySelectorAll(".category-item").forEach((item) => {
    const el = item as HTMLElement;
    const isActive =
      params.selectionLevel === "unit" &&
      el.dataset.subject === params.filter.subject &&
      el.dataset.category === params.filter.category;
    el.classList.toggle("active", isActive);

    if (isActive) {
      // 親カテゴリグループを自動展開する
      if (el.dataset.parentCategory) {
        params.expandParentCategory(el.dataset.parentCategory);
      }
      // トップカテゴリグループも自動展開する
      if (el.dataset.topCategory) {
        params.expandTopCategory(el.dataset.topCategory);
      }
      // 学年グループを自動展開する（学年別ビュー用）
      const gradeGroup = el.closest<HTMLElement>(".category-grade-group");
      if (gradeGroup) {
        const grade = gradeGroup.dataset.grade;
        if (grade && params.collapsedGradeGroups.has(grade)) {
          params.collapsedGradeGroups.delete(grade);
          gradeGroup.classList.remove("collapsed");
          // 折りたたみ状態は category-grade-group-toggle ボタンの aria-expanded で管理されている。
          // 自動展開時もトグルボタン側を更新しておかないと、支援技術向け状態と DOM 状態が不整合になる。
          const toggle = gradeGroup.querySelector<HTMLElement>(".category-grade-group-toggle");
          toggle?.setAttribute("aria-expanded", "true");
        }
      }
    }
  });

  // 親カテゴリヘッダーのアクティブ状態を更新
  categoryList.querySelectorAll<HTMLElement>(".category-group-header[data-parent-category]").forEach((header) => {
    const isActive =
      params.selectionLevel === "parentCategory" && header.dataset.parentCategory === params.filter.parentCategory;
    header.classList.toggle("active", isActive);
  });

  // トップカテゴリヘッダーのアクティブ状態を更新
  categoryList.querySelectorAll<HTMLElement>(".category-top-group-header[data-top-category]").forEach((header) => {
    const isActive =
      params.selectionLevel === "topCategory" && header.dataset.topCategory === params.selectedTopCategoryId;
    header.classList.toggle("active", isActive);
  });
  categoryList.querySelectorAll<HTMLElement>(".category-grade-group-header[data-grade]").forEach((header) => {
    const isActive = params.selectedGradeGroup !== null && header.dataset.grade === params.selectedGradeGroup;
    header.classList.toggle("active", isActive);
  });
}

/**
 * インナーパネルタブのコンテンツ表示を切り替える。
 *
 * ストア (`panelTabsStore`) を更新することで `<QuizPanel>` が
 * `useSyncExternalStore` 経由で再レンダリングし、active クラス・aria-selected・
 * tabindex・各サブパネルの hidden が宣言的に更新される。
 *
 * 後方互換のため、React コンポーネントがマウントされていないケース（一部テストの
 * 静的 HTML 構成）でも DOM が更新されるよう、命令的な classList 操作も併用する。
 * React がマウントされている場合は両方の更新が同じ結果になるため二重書き込みは
 * 無害。
 */
export function showPanelTab(tab: PanelTab): void {
  setActivePanelTab(tab);

  // 後方互換のための命令的 DOM 更新（React 未マウントのテスト環境向け）
  const quizModePanel = document.getElementById("quizModePanel");
  const guideContent = document.getElementById("guideContent");
  const historyContent = document.getElementById("historyContent");
  const questionListContent = document.getElementById("questionListContent");

  quizModePanel?.classList.toggle("hidden", tab !== "quiz");
  guideContent?.classList.toggle("hidden", tab !== "guide");
  historyContent?.classList.toggle("hidden", tab !== "history");
  questionListContent?.classList.toggle("hidden", tab !== "questions");

  document.querySelectorAll<HTMLElement>(".panel-tab[data-panel]").forEach((t) => {
    const isActive = t.dataset.panel === tab;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", String(isActive));
    t.setAttribute("tabindex", isActive ? "0" : "-1");
  });
}
