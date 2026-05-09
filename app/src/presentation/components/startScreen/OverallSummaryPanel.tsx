/**
 * 総合タブ専用のサマリパネル（学習状況 / シェア）。
 *
 * 活動日付・教科別ステータス・活動一覧（履歴形式）と、共有用テキスト・URL 編集領域を含む。
 * テキストや URL は既存コントローラ（`shareSummary` 系・履歴ビュー等）が動的に更新する。
 */

export function OverallSummaryPanel(): React.JSX.Element {
  return (
    <div id="overallSummaryPanel" className="hidden overall-summary-panel" role="region" aria-label="活動サマリ">
      <div className="panel-tabs overall-panel-tabs" role="tablist" aria-label="概要パネル切り替え">
        <button
          className="panel-tab active"
          id="overallTab-learned"
          data-overall-panel="learned"
          role="tab"
          type="button"
          aria-selected="true"
        >
          🎓 学習状況
        </button>
        <button
          className="panel-tab"
          id="overallTab-share"
          data-overall-panel="share"
          role="tab"
          type="button"
          aria-selected="false"
        >
          📤 シェア
        </button>
      </div>
      <div id="overallLearnedPanel" className="overall-activity-panel">
        <div className="overall-activity-date-row">
          <span id="overallActivityDateLabel" className="overall-activity-date"></span>
        </div>
        <div id="overallSubjectStatusSummary" className="overall-subject-status-summary"></div>
        <div id="todayActivityContent" className="history-list overall-today-list"></div>
      </div>
      <div id="overallSharePanel" className="overall-activity-panel hidden">
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
