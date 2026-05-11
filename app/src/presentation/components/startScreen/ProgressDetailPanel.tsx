/**
 * 進度タブ専用の詳細パネル（学年別 / カテゴリ別 / マトリクス）。
 *
 * モバイルでの閉じるボタン、タブバー、学習状況フィルターを含み、
 * `progressDetailContent` 内の描画は既存コントローラが行う。
 *
 * タブの active 状態と aria-labelledby は `panelTabsStore` を購読して
 * 宣言的に反映し、クリックは React onClick で `panelTabsStore` を更新する。
 */

import { useSyncExternalStore } from "react";
import { setActiveProgressDetailMode, type ProgressDetailMode } from "./panelTabsStore";
import { useActiveProgressDetailMode } from "./usePanelTabsStore";
import { panelTab, panelTabs } from "../../styles/panelTabStyles";
import { statusFilterButton } from "../../styles/categoryControlButtonStyles";
import { progressDetailContentStore } from "../progressDetailContentStore";

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
      className={isActive ? `${panelTab()} active` : panelTab()}
      id={id}
      data-progress-detail-panel={mode}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls="progressDetailContent"
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveProgressDetailMode(mode)}
    >
      {label}
    </button>
  );
}

export function ProgressDetailPanel(): React.JSX.Element {
  const active = useActiveProgressDetailMode();
  return (
    <div
      id="progressDetailPanel"
      className="hidden progress-detail-panel flex flex-col h-full overflow-hidden"
      role="region"
      aria-label="進度詳細"
    >
      <div className="progress-detail-close-row flex items-center justify-between px-4 py-2 border-b border-[#e1e4e8] shrink-0">
        <span className="progress-detail-close-title text-sm font-bold text-[#24292e]">📊 進度詳細</span>
        <button
          id="progressDetailCloseBtn"
          className="admin-data-close-btn inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#d1d5da] bg-white text-[#586069] cursor-pointer text-sm font-semibold hover:bg-[#f0f7ff] hover:text-[#0366d6] hover:border-[#0366d6]"
          type="button"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <div className={`${panelTabs()} progress-detail-tabs shrink-0`} role="tablist" aria-label="進度詳細タブ">
        <ProgressDetailTabButton mode="grade" active={active} id="progressDetailTab-grade" label="🎓 学年別" />
        <ProgressDetailTabButton
          mode="category"
          active={active}
          id="progressDetailTab-category"
          label="📁 カテゴリ別"
        />
        <ProgressDetailTabButton mode="matrix" active={active} id="progressDetailTab-matrix" label="📊 マトリクス" />
      </div>
      <div className="progress-detail-toolbar px-4">
        <div className="category-status-filter flex items-center gap-0.5" role="group" aria-label="学習状況フィルター">
          <span className="category-status-filter-label text-xs text-[#586069]">学習状況：</span>
          <button
            id="progressStatusAllBtn"
            className={`${statusFilterButton()} active`}
            type="button"
            aria-pressed="true"
          >
            すべて
          </button>
          <button id="progressStatusUnlearnedBtn" className={statusFilterButton()} type="button" aria-pressed="false">
            未学習
          </button>
          <button id="progressStatusStudyingBtn" className={statusFilterButton()} type="button" aria-pressed="false">
            学習中
          </button>
          <button id="progressStatusLearnedBtn" className={statusFilterButton()} type="button" aria-pressed="false">
            学習済
          </button>
        </div>
      </div>
      <div
        id="progressDetailContent"
        className="progress-detail-content flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3"
        role="tabpanel"
        aria-labelledby={`progressDetailTab-${active}`}
      >
        <ProgressDetailSection />
      </div>
    </div>
  );
}

/** 進度詳細コンテンツ — progressDetailContentStore から描画。 */
function ProgressDetailSection(): React.JSX.Element {
  const node = useSyncExternalStore(progressDetailContentStore.subscribe, progressDetailContentStore.get, progressDetailContentStore.get);
  return <>{node}</>;
}
