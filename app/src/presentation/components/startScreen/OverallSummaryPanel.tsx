/**
 * 総合タブ専用のサマリパネル（学習状況 / シェア）。
 *
 * 活動日付・教科別ステータス・活動一覧（履歴形式）と、共有用テキスト・URL 編集領域を含む。
 * テキストや URL は既存コントローラ（`shareSummary` 系・履歴ビュー等）が動的に更新する。
 *
 * タブの active 状態と各サブパネルの hidden 表示は `panelTabsStore` を購読して
 * 宣言的に反映し、クリックは React onClick で `panelTabsStore` を更新する。
 */

import { useSyncExternalStore } from "react";
import { setActiveOverallPanel, type OverallPanelTab } from "./panelTabsStore";
import { useActiveOverallPanel } from "./usePanelTabsStore";
import { panelTab, panelTabs } from "../../styles/panelTabStyles";
import { shareButton } from "../../styles/shareButtonStyles";
import { overallStatusContentStore } from "../overallStatusContentStore";
import { todayActivityContentStore } from "../todayActivityContentStore";

interface OverallPanelTabButtonProps {
  panel: OverallPanelTab;
  active: OverallPanelTab;
  id: string;
  label: string;
}

function OverallPanelTabButton({ panel, active, id, label }: OverallPanelTabButtonProps): React.JSX.Element {
  const isActive = panel === active;
  return (
    <button
      className={isActive ? `${panelTab()} active` : panelTab()}
      id={id}
      data-overall-panel={panel}
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => setActiveOverallPanel(panel)}
    >
      {label}
    </button>
  );
}

export function OverallSummaryPanel(): React.JSX.Element {
  const active = useActiveOverallPanel();
  return (
    <div
      id="overallSummaryPanel"
      className="hidden overall-summary-panel flex flex-col gap-0 flex-1 overflow-hidden p-0"
      role="region"
      aria-label="活動サマリ"
    >
      <div
        className={`${panelTabs()} overall-panel-tabs flex border-b border-[#e1e4e8] bg-[#f6f8fa] shrink-0`}
        role="tablist"
        aria-label="概要パネル切り替え"
      >
        <OverallPanelTabButton panel="learned" active={active} id="overallTab-learned" label="🎓 学習状況" />
        <OverallPanelTabButton panel="share" active={active} id="overallTab-share" label="📤 シェア" />
      </div>
      <div
        id="overallLearnedPanel"
        className={`${active === "learned" ? "overall-activity-panel flex flex-col flex-1 overflow-y-auto px-4 py-3 gap-2 min-h-0" : "overall-activity-panel hidden"}`}
      >
        <div className="overall-activity-date-row shrink-0">
          <span
            id="overallActivityDateLabel"
            className="overall-activity-date text-base font-semibold text-[#24292e]"
          ></span>
        </div>
        <div id="overallSubjectStatusSummary" className="overall-subject-status-summary flex flex-col gap-1">
          <OverallStatusSection />
        </div>
        <div id="todayActivityContent" className="history-list overall-today-list flex flex-col gap-2.5">
          <TodayActivitySection />
        </div>
      </div>
      <div
        id="overallSharePanel"
        className={`${active === "share" ? "overall-activity-panel flex flex-col flex-1 overflow-y-auto px-4 py-3 gap-2 min-h-0" : "overall-activity-panel hidden"}`}
      >
        <div
          id="shareSummaryText"
          className="share-summary-text text-xs text-[#444] bg-[#f6f8fa] border border-[#e1e4e8] rounded-md px-[10px] py-2 whitespace-pre-wrap break-words min-h-12 leading-[1.5] shrink-0"
        ></div>
        <div className="share-actions-row flex items-center gap-1.5 shrink-0">
          <button id="copySummaryBtn" className={shareButton({ kind: "copy" })} type="button">
            📋 コピー
          </button>
          <button id="openShareUrlBtn" className={shareButton({ kind: "open", hidden: true })} type="button">
            📤 共有
          </button>
          <div className="share-url-inline flex-1 min-w-0">
            <button
              id="shareUrlDisplayBtn"
              className="share-url-display-btn max-w-full px-[10px] py-1 text-xs border-none rounded bg-transparent text-[#0366d6] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap block text-left transition-[color,background] duration-150 hover:bg-[#e8f0fe] [&.share-url-set]:text-[#999] [&.share-url-set]:hover:bg-[#f0f0f0] [&.share-url-set]:hover:text-[#666]"
              type="button"
              title="URLを編集"
              aria-expanded="false"
            >
              URLを設定
            </button>
            <div id="shareUrlEditArea" className="share-url-edit-area hidden flex gap-1 items-center">
              <input
                type="url"
                id="shareUrlInput"
                className="share-url-input flex-1 min-w-0 px-2 py-1 text-xs border border-[#d1d5da] rounded bg-white text-[#24292e]"
                aria-label="共有URL"
                placeholder="共有URLを入力（例: https://twitter.com）"
              />
              <button id="saveShareUrlBtn" className={shareButton({ kind: "save" })} type="button" aria-label="保存">
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 教科別学習状況サマリ — overallStatusContentStore から描画。 */
function OverallStatusSection(): React.JSX.Element {
  const node = useSyncExternalStore(overallStatusContentStore.subscribe, overallStatusContentStore.get, overallStatusContentStore.get);
  return <>{node}</>;
}

/** 今日の活動 — todayActivityContentStore から描画。 */
function TodayActivitySection(): React.JSX.Element {
  const node = useSyncExternalStore(todayActivityContentStore.subscribe, todayActivityContentStore.get, todayActivityContentStore.get);
  return <>{node}</>;
}
