/**
 * スタート画面の左カラム：単元一覧パネル。
 *
 * 学習状況フィルターと「おすすめ単元」見出し、日付ナビ、
 * カテゴリリスト本体（動的描画）を含む。
 */

import { useSyncExternalStore, useState, useEffect, useRef } from "react";
import { statusFilterButton } from "../../styles/categoryControlButtonStyles";
import { categoryControlsContentStore } from "../categoryControlsContentStore";
import { categoryListContentStore } from "../categoryListContentStore";
import { CATEGORY_STATUS_ITEMS } from "../../uiHelpers";

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
        <CategoryStatusInfoButton />
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
          className="all-subject-panel-title hidden text-base font-bold text-[#0366d6] shrink-0"
        >
          📚 今日の単元
        </span>
        <AllSubjectPanelInfoButton />
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

/** 単元一覧のステータスアイコンの説明を吹き出しで表示する ℹ️ ボタン。 */
function CategoryStatusInfoButton(): React.JSX.Element {
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = "categoryStatusInfoBtn";

  useEffect(() => {
    if (!showInfo) return;
    const handlePointerDown = (e: PointerEvent): void => {
      if (containerRef.current && e.target instanceof Node && !containerRef.current.contains(e.target)) {
        setShowInfo(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setShowInfo(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showInfo]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        id={buttonId}
        type="button"
        className="text-base text-[#586069] cursor-pointer bg-transparent border-none p-0 leading-none hover:text-[#0366d6]"
        aria-label="着手・完了ステータスの説明を表示"
        aria-expanded={showInfo}
        onClick={() => setShowInfo((v) => !v)}
      >
        ℹ️
      </button>
      {showInfo && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-[#e1e4e8] bg-white p-3 shadow-lg text-[#24292e]"
          role="region"
          aria-labelledby={buttonId}
        >
          <ul className="m-0 list-none p-0 space-y-1">
            {CATEGORY_STATUS_ITEMS.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-base leading-snug text-[#24292e]">
                <span className="text-base leading-none shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 今日の単元の抽出条件を吹き出しで説明する ℹ️ ボタン（総合タブ時のみ表示）。 */
function AllSubjectPanelInfoButton(): React.JSX.Element {
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = "allSubjectPanelInfoBtn";

  const infoConditions = [
    "未学習の単元を優先して表示",
    "学習済（📝）は7日後、復習済（📜）は14日後に復習対象として表示",
    "検定済（🎓）・履修済（✅）は除外",
    "国語 → 数学 → 英語の順で優先",
  ];

  useEffect(() => {
    if (!showInfo) return;
    const handlePointerDown = (e: PointerEvent): void => {
      if (containerRef.current && e.target instanceof Node && !containerRef.current.contains(e.target)) {
        setShowInfo(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setShowInfo(false);
    };
    const handleFocusOut = (e: FocusEvent): void => {
      // フォーカスがコンテナ外に移動した場合に閉じる
      if (containerRef.current && e.relatedTarget instanceof Node && !containerRef.current.contains(e.relatedTarget)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    containerRef.current?.addEventListener("focusout", handleFocusOut);
    const container = containerRef.current;
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      container?.removeEventListener("focusout", handleFocusOut);
    };
  }, [showInfo]);

  return (
    <div
      id="allSubjectPanelInfo"
      ref={containerRef}
      className="all-subject-panel-info hidden relative shrink-0 ml-auto"
    >
      <button
        id={buttonId}
        type="button"
        className="text-base text-[#586069] cursor-pointer bg-transparent border-none p-0 leading-none hover:text-[#0366d6]"
        aria-label="抽出条件を表示"
        aria-expanded={showInfo}
        onClick={() => setShowInfo((v) => !v)}
      >
        ℹ️
      </button>
      {showInfo && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-[#e1e4e8] bg-white p-3 shadow-lg text-[#24292e]"
          role="region"
          aria-labelledby={buttonId}
        >
          <ul className="m-0 list-disc pl-4 space-y-1">
            {infoConditions.map((cond, i) => (
              <li key={i} className="text-base leading-snug text-[#24292e]">
                {cond}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
