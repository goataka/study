/**
 * スタート画面のヘッダー部分。
 *
 * タイトル（クリックでスタート画面へ戻る）、日付表示、リロード / メニューボタンを含む。
 * 日付テキストや教科ラベルは既存コントローラが動的に更新する。
 */

export function StartHeader(): React.JSX.Element {
  return (
    <header className="shrink-0 flex items-center justify-between bg-white px-5 py-[10px] border-b-2 border-[#c8d8e8]">
      <div className="header-title-area flex flex-row items-center gap-2 shrink-0 border-b-2 border-[#c8d8e8] pb-0.5">
        <h1
          id="titleBtn"
          role="button"
          tabIndex={0}
          className="title-btn shrink-0 flex items-center gap-1.5 whitespace-nowrap text-[15px] text-[#0366d6] cursor-pointer transition-colors duration-200 hover:text-[#0255b8] focus:text-[#0255b8] focus:outline-none focus:underline"
          title="スタート画面へ戻る"
        >
          <img src="./favicon.svg" className="header-logo w-[18px] h-[18px] shrink-0" alt="" aria-hidden="true" /> 学習アプリ
        </h1>
        <span className="header-grade-label text-sm text-[#586069] font-medium tracking-[0.05em]">小・中・高</span>
      </div>
      <div className="header-date-area flex items-center gap-2 shrink-0">
        <span className="header-date-label text-[15px] text-[#c8d8e8] font-semibold shrink-0">Date:</span>
        <span id="headerTodayDate" className="header-today-date text-[15px] text-[#586069] font-semibold whitespace-nowrap shrink-0 tracking-[0.03em] border-b-2 border-[#c8d8e8] pb-px min-w-[160px] text-center"></span>
        <button
          id="reloadBtn"
          className="reload-btn inline-flex items-center justify-center w-7 h-7 border-none rounded-md bg-transparent text-[#586069] text-lg cursor-pointer shrink-0 p-0 transition-[background,color] duration-200 hover:text-[#0366d6] hover:bg-[#f0f7ff]"
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
