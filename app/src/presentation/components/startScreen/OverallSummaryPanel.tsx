/**
 * 総合タブ専用のサマリパネル（学習状況 / シェア）。
 *
 * 活動日付・教科別ステータス・活動一覧（履歴形式）と、共有用テキスト・URL 編集領域を含む。
 * テキストや URL は既存コントローラ（`shareSummary` 系・履歴ビュー等）が動的に更新する。
 *
 * タブの active 状態と各サブパネルの hidden 表示は `panelTabsStore` を購読して
 * 宣言的に反映する。クリックハンドラは React onClick ではなく
 * `setupOverallPanelTabs` の DOM 委譲で処理する（既存の静的 HTML テストとの
 * 二重発火を避けるため）。
 */

import { type OverallPanelTab } from "./panelTabsStore";
import { useActiveOverallPanel } from "./usePanelTabsStore";
import { panelTab, panelTabs } from "../../styles/panelTabStyles";

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
      // クリックは setupOverallPanelTabs の DOM 委譲が処理する（React onClick との二重発火を避けるため）
    >
      {label}
    </button>
  );
}

export function OverallSummaryPanel(): React.JSX.Element {
  const active = useActiveOverallPanel();
  const learnedClass = active === "learned" ? "overall-activity-panel" : "overall-activity-panel hidden";
  const shareClass = active === "share" ? "overall-activity-panel" : "overall-activity-panel hidden";
  return (
    <div id="overallSummaryPanel" className="hidden overall-summary-panel" role="region" aria-label="活動サマリ">
      <div className={`${panelTabs()} overall-panel-tabs`} role="tablist" aria-label="概要パネル切り替え">
        <OverallPanelTabButton panel="learned" active={active} id="overallTab-learned" label="🎓 学習状況" />
        <OverallPanelTabButton panel="share" active={active} id="overallTab-share" label="📤 シェア" />
      </div>
      <div id="overallLearnedPanel" className={learnedClass}>
        <div className="overall-activity-date-row">
          <span id="overallActivityDateLabel" className="overall-activity-date"></span>
        </div>
        <div id="overallSubjectStatusSummary" className="overall-subject-status-summary"></div>
        <div id="todayActivityContent" className="history-list overall-today-list flex flex-col gap-2.5"></div>
      </div>
      <div id="overallSharePanel" className={shareClass}>
        <div id="shareSummaryText" className="share-summary-text"></div>
        <div className="share-actions-row">
          <button id="copySummaryBtn" className="share-copy-btn" type="button">
            📋 コピー
          </button>
          <button id="openShareUrlBtn" className="share-url-open-btn hidden" type="button">
            📤 共有
          </button>
          <div className="share-url-inline">
            <button
              id="shareUrlDisplayBtn"
              className="share-url-display-btn"
              type="button"
              title="URLを編集"
              aria-expanded="false"
            >
              URLを設定
            </button>
            <div id="shareUrlEditArea" className="share-url-edit-area hidden">
              <input
                type="url"
                id="shareUrlInput"
                className="share-url-input"
                aria-label="共有URL"
                placeholder="共有URLを入力（例: https://twitter.com）"
              />
              <button id="saveShareUrlBtn" className="share-url-save-btn" type="button" aria-label="保存">
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
