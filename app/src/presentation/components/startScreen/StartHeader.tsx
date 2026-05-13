/**
 * スタート画面のヘッダー部分。
 *
 * タイトル（クリックでスタート画面へ戻る）、日付表示、リロード / メニューボタンを含む。
 * 日付テキストや教科ラベルは既存コントローラが動的に更新する。
 */

import { useSyncExternalStore } from "react";
import { activeSubjectStore } from "../activeSubjectStore";

export function StartHeader(): React.JSX.Element {
  const activeSubject = useSyncExternalStore(
    activeSubjectStore.subscribe,
    activeSubjectStore.get,
    activeSubjectStore.get,
  );

  return (
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-y-2 bg-white pt-2 px-4 pb-4 border-b-2 border-[#c8d8e8]">
      <div className="header-title-area flex flex-row items-center gap-2 shrink-0 border-b-2 border-[#c8d8e8] pb-0.5">
        <h1
          id="titleBtn"
          role="button"
          tabIndex={0}
          className="title-btn shrink-0 flex items-center gap-1.5 whitespace-nowrap text-base font-extrabold text-[#0366d6] cursor-pointer transition-colors duration-200 hover:text-[#0255b8] focus-visible:text-[#0255b8] focus-visible:outline-none focus-visible:underline px-2 py-1"
          title="スタート画面へ戻る"
        >
          <span className="header-active-subject-icon" aria-hidden="true">
            {activeSubject.icon}
          </span>
          <span className="header-active-subject-name">{activeSubject.name}</span>
        </h1>
      </div>
      <div className="header-date-area flex w-full items-center justify-end gap-2 shrink-0 sm:w-auto">
        <span className="header-date-label text-base text-[#c8d8e8] font-semibold shrink-0">Date:</span>
        <span
          id="headerTodayDate"
          className="header-today-date text-base text-[#586069] font-semibold whitespace-nowrap shrink-0 tracking-[0.03em] border-b-2 border-[#c8d8e8] pb-px px-2 min-w-[120px] sm:min-w-[160px] text-center"
        ></span>
        <button
          id="reloadBtn"
          className="reload-btn inline-flex items-center justify-center w-7 h-7 border-none rounded-md bg-transparent text-[#586069] text-lg cursor-pointer shrink-0 p-0 transition-[background,color] duration-200 hover:text-[#0366d6] hover:bg-[#f0f7ff]"
          type="button"
          title="ページを更新する"
          aria-label="ページを更新する"
        >
          🔄
        </button>
      </div>
    </header>
  );
}
