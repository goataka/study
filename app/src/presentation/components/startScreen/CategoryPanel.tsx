/**
 * スタート画面の左カラム：単元一覧パネル。
 *
 * 学習状況フィルターと「おすすめ単元」見出し、日付ナビ、
 * カテゴリリスト本体（動的描画）を含む。
 */

import { useSyncExternalStore } from "react";
import { statusFilterButton } from "../../styles/categoryControlButtonStyles";
import { categoryControlsContentStore } from "../categoryControlsContentStore";
import { categoryListContentStore } from "../categoryListContentStore";

export function CategoryPanel(): React.JSX.Element {
  return (
    <div
      id="categoryPanel"
      className={[
        "category-panel",
        // ノート紙風：白地 + 薄青罫線（32px間隔）
        "notebook-lines bg-white",
        "border-none p-2 min-h-[200px] flex flex-col overflow-hidden",
        "shadow-[inset_-3px_0_6px_rgba(0,0,0,0.08)]",
      ].join(" ")}
    >
      <div className="category-panel-header flex items-center justify-between mb-2 gap-1.5 px-2">
        <span
          id="categoryListTitle"
          className="category-list-title text-sm font-bold text-[#0366d6] shrink-0 px-1 py-1"
        >
          📚 単元一覧
        </span>
        <span
          id="supportMenuTitle"
          className="support-menu-title hidden text-sm font-bold text-[#0366d6] shrink-0 px-1 py-1"
        >
          📜メニュー
        </span>
        <div
          className="category-status-filter flex items-center gap-0.5 ml-auto"
          role="group"
          aria-label="学習状態フィルター"
        >
          <span className="category-status-filter-label text-xs text-[#586069]">学習状況：</span>
          <button id="filterStatusAll" className={`${statusFilterButton()} active`} type="button" aria-pressed="true">
            すべて
          </button>
          <button id="filterStatusUnlearned" className={statusFilterButton()} type="button" aria-pressed="false">
            未学習
          </button>
          <button id="filterStatusStudying" className={statusFilterButton()} type="button" aria-pressed="false">
            学習中
          </button>
          <button id="filterStatusLearned" className={statusFilterButton()} type="button" aria-pressed="false">
            学習済
          </button>
        </div>
        <span
          id="allSubjectPanelTitle"
          className="all-subject-panel-title hidden text-sm font-bold text-[#0366d6] shrink-0"
        >
          📚 今日の単元
        </span>
      </div>
      <div id="overallDateNav" className="activity-date-nav hidden items-center gap-1.5 shrink-0 px-2 py-1.5">
        <span id="activityDateDisplay" className="activity-date-display text-[13px] text-[#586069] font-medium"></span>
      </div>
      <div
        id="categoryControls"
        className="category-controls flex flex-wrap items-center gap-[5px] mb-2 px-2 justify-end"
      >
        <CategoryControlsSection />
      </div>
      <div
        id="categoryList"
        className={[
          "category-list flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0 px-2 pb-1",
          "[&.hide-learned_.category-item.learned]:hidden",
          "[&.filter-unlearned_.category-item.learned]:hidden",
          "[&.filter-unlearned_.category-item.studying]:hidden",
          "[&.filter-studying_.category-item:not(.studying)]:hidden",
          "[&.filter-learned_.category-item:not(.learned)]:hidden",
          "[&.filter-learned_.category-item.learned]:!grid",
          "[&.filter-studying_.category-item.studying]:!grid",
          "[&.filter-unlearned_.category-item:not(.learned):not(.studying)]:!grid",
          "[&.detail-active_.category-item.category-item-has-info]:[grid-template-columns:1fr]",
          "[&.detail-active_.category-item-right]:hidden",
        ].join(" ")}
      >
        <CategoryListSection />
      </div>
    </div>
  );
}

/** カテゴリビューコントロール — categoryControlsContentStore から描画。 */
function CategoryControlsSection(): React.JSX.Element {
  const node = useSyncExternalStore(
    categoryControlsContentStore.subscribe,
    categoryControlsContentStore.get,
    categoryControlsContentStore.get,
  );
  return <>{node}</>;
}

/** カテゴリ一覧 — categoryListContentStore から描画。 */
function CategoryListSection(): React.JSX.Element {
  const node = useSyncExternalStore(
    categoryListContentStore.subscribe,
    categoryListContentStore.get,
    categoryListContentStore.get,
  );
  return <>{node}</>;
}
