/**
 * スタート画面の左カラム：単元一覧パネル。
 *
 * 学習状況フィルターと「おすすめ単元」見出し、日付ナビ、
 * カテゴリリスト本体（動的描画）を含む。
 */

export function CategoryPanel(): React.JSX.Element {
  return (
    <div className="category-panel">
      <div className="category-panel-header">
        <span id="categoryListTitle" className="category-list-title">
          📚 単元一覧
        </span>
        <div className="category-status-filter" role="group" aria-label="学習状態フィルター">
          <span className="category-status-filter-label">学習状況：</span>
          <button id="filterStatusAll" className="category-status-filter-btn active" type="button" aria-pressed="true">
            すべて
          </button>
          <button id="filterStatusUnlearned" className="category-status-filter-btn" type="button" aria-pressed="false">
            未学習
          </button>
          <button id="filterStatusStudying" className="category-status-filter-btn" type="button" aria-pressed="false">
            学習中
          </button>
          <button id="filterStatusLearned" className="category-status-filter-btn" type="button" aria-pressed="false">
            学習済
          </button>
        </div>
        <span id="allSubjectPanelTitle" className="all-subject-panel-title hidden">
          ✨ おすすめ単元
        </span>
      </div>
      <div id="overallDateNav" className="activity-date-nav hidden">
        <span id="activityDateDisplay" className="activity-date-display"></span>
      </div>
      <div id="categoryControls" className="category-controls"></div>
      <div id="categoryList" className="category-list"></div>
    </div>
  );
}
