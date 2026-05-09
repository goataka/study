/**
 * 進度タブ専用の詳細パネル（学年別 / カテゴリ別 / マトリクス）。
 *
 * モバイルでの閉じるボタン、タブバー、学習状況フィルターを含み、
 * `progressDetailContent` 内の描画は既存コントローラが行う。
 *
 * タブの active 状態と aria-labelledby は `panelTabsStore` を購読して
 * 宣言的に反映する。クリックは onClick で `setActiveProgressDetailMode` を呼ぶ。
 */

import { type ProgressDetailMode } from "./panelTabsStore";
import { useActiveProgressDetailMode } from "./usePanelTabsStore";

interface ProgressDetailTabButtonProps {
  mode: ProgressDetailMode;
  active: ProgressDetailMode;
  id: string;
  label: string;
}

function ProgressDetailTabButton({ mode, active, id, label }: ProgressDetailTabButtonProps): React.JSX.Element {
  const isActive = mode === active;
  return (
    <button
      className={isActive ? "panel-tab active" : "panel-tab"}
      id={id}
      data-progress-detail-panel={mode}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls="progressDetailContent"
      tabIndex={isActive ? 0 : -1}
      // クリックは setupProgressDetailTabs の DOM 委譲が処理する
    >
      {label}
    </button>
  );
}

export function ProgressDetailPanel(): React.JSX.Element {
  const active = useActiveProgressDetailMode();
  return (
    <div id="progressDetailPanel" className="hidden progress-detail-panel" role="region" aria-label="進度詳細">
      <div className="progress-detail-close-row">
        <span className="progress-detail-close-title">📊 進度詳細</span>
        <button id="progressDetailCloseBtn" className="admin-data-close-btn" type="button" aria-label="閉じる">
          ✕
        </button>
      </div>
      <div className="panel-tabs progress-detail-tabs" role="tablist" aria-label="進度詳細タブ">
        <ProgressDetailTabButton mode="grade" active={active} id="progressDetailTab-grade" label="🎓 学年別" />
        <ProgressDetailTabButton
          mode="category"
          active={active}
          id="progressDetailTab-category"
          label="📁 カテゴリ別"
        />
        <ProgressDetailTabButton mode="matrix" active={active} id="progressDetailTab-matrix" label="📊 マトリクス" />
      </div>
      <div className="progress-detail-toolbar">
        <div className="category-status-filter" role="group" aria-label="学習状況フィルター">
          <span className="category-status-filter-label">学習状況：</span>
          <button
            id="progressStatusAllBtn"
            className="category-status-filter-btn active"
            type="button"
            aria-pressed="true"
          >
            すべて
          </button>
          <button
            id="progressStatusUnlearnedBtn"
            className="category-status-filter-btn"
            type="button"
            aria-pressed="false"
          >
            未学習
          </button>
          <button
            id="progressStatusStudyingBtn"
            className="category-status-filter-btn"
            type="button"
            aria-pressed="false"
          >
            学習中
          </button>
          <button
            id="progressStatusLearnedBtn"
            className="category-status-filter-btn"
            type="button"
            aria-pressed="false"
          >
            学習済
          </button>
        </div>
      </div>
      <div
        id="progressDetailContent"
        className="progress-detail-content"
        role="tabpanel"
        aria-labelledby={`progressDetailTab-${active}`}
      ></div>
    </div>
  );
}
