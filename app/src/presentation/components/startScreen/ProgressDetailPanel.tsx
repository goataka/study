/**
 * 進度タブ専用の詳細パネル（学年別 / カテゴリ別 / マトリクス）。
 *
 * モバイルでの閉じるボタン、タブバー、学習状況フィルターを含み、
 * `progressDetailContent` 内の描画は既存コントローラが行う。
 */

export function ProgressDetailPanel(): React.JSX.Element {
  return (
    <div id="progressDetailPanel" className="hidden progress-detail-panel" role="region" aria-label="進度詳細">
      <div className="progress-detail-close-row">
        <span className="progress-detail-close-title">📊 進度詳細</span>
        <button id="progressDetailCloseBtn" className="admin-data-close-btn" type="button" aria-label="閉じる">
          ✕
        </button>
      </div>
      <div className="panel-tabs progress-detail-tabs" role="tablist" aria-label="進度詳細タブ">
        <button
          className="panel-tab"
          id="progressDetailTab-grade"
          data-progress-detail-panel="grade"
          role="tab"
          type="button"
          aria-selected="false"
          aria-controls="progressDetailContent"
          tabIndex={-1}
        >
          🎓 学年別
        </button>
        <button
          className="panel-tab"
          id="progressDetailTab-category"
          data-progress-detail-panel="category"
          role="tab"
          type="button"
          aria-selected="false"
          aria-controls="progressDetailContent"
          tabIndex={-1}
        >
          📁 カテゴリ別
        </button>
        <button
          className="panel-tab active"
          id="progressDetailTab-matrix"
          data-progress-detail-panel="matrix"
          role="tab"
          type="button"
          aria-selected="true"
          aria-controls="progressDetailContent"
          tabIndex={0}
        >
          📊 マトリクス
        </button>
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
        aria-labelledby="progressDetailTab-matrix"
      ></div>
    </div>
  );
}
