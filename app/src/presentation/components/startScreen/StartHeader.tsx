/**
 * スタート画面のヘッダー部分。
 *
 * タイトル（クリックでスタート画面へ戻る）、日付表示、リロード / メニューボタンを含む。
 * 日付テキストや教科ラベルは既存コントローラが動的に更新する。
 */

export function StartHeader(): React.JSX.Element {
  return (
    <header>
      <div className="header-title-area">
        <h1 id="titleBtn" role="button" tabIndex={0} className="title-btn" title="スタート画面へ戻る">
          <img src="./favicon.svg" className="header-logo" alt="" aria-hidden="true" /> 学習アプリ
        </h1>
        <span className="header-grade-label">小・中・高</span>
      </div>
      <div className="header-date-area">
        <span className="header-date-label">Date:</span>
        <span id="headerTodayDate" className="header-today-date"></span>
        <button
          id="reloadBtn"
          className="reload-btn"
          type="button"
          title="ページを更新する"
          aria-label="ページを更新する"
        >
          🔄
        </button>
        <button
          id="adminMenuBtn"
          className="admin-menu-header-btn"
          type="button"
          title="メニュー"
          aria-label="メニューを開く"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
