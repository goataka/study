/**
 * 教科タブ + サポートリンク + ユーザーエリア（名前 / アバター / アバター編集ダイアログ）。
 *
 * これら DOM 要素は既存の vanilla 実装（`QuizApp` / `AvatarController` 等）が
 * `getElementById` 経由で参照する。React は初期マークアップだけを担当し、
 * 後続の更新（テキスト・src 等）は引き続き既存コントローラが行う。
 */

import { AvatarCropDialog } from "./AvatarCropDialog";

export function TabsUserRow(): React.JSX.Element {
  return (
    <div className="tabs-user-row flex items-end gap-0">
      <div
        className="subject-tabs flex gap-1 border-b-0 mb-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 pt-2 items-end justify-start"
        role="tablist"
        aria-label="教科を選択"
      ></div>
      <div className="tabs-links-area flex items-end gap-1 shrink-0 px-1 pt-2">
        <a
          id="supportBtn"
          className={[
            "tabs-link-note tabs-link-note-support",
            "inline-flex items-center gap-1 justify-center",
            "px-[18px] pt-[6px] pb-2 min-w-7 min-h-[33px]",
            "border border-[rgba(0,0,0,0.12)] border-b-0 rounded-none",
            "text-[15px] font-semibold no-underline whitespace-nowrap leading-none",
            "translate-y-0.5 shadow-[0_-2px_4px_rgba(0,0,0,0.08)]",
            "transition-[filter,transform] duration-150",
            "hover:brightness-[1.08] hover:translate-y-0",
            // tabs-link-note-support 固有色
            "bg-[#d8f0e8] text-[#1a6a40]",
          ].join(" ")}
          href="./support/"
          target="_blank"
          rel="noopener noreferrer"
          title="サポートページを開く"
          aria-label="サポートページを開く"
        >
          ❔
        </a>
      </div>
      <div className="tabs-user-area flex items-center gap-1.5 shrink-0 px-1 pt-px relative ml-auto">
        <button
          id="headerUserName"
          className="header-user-name text-[15px] text-white font-semibold max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap bg-transparent border-none rounded-md px-1.5 py-0.5 cursor-pointer transition-[background,color] duration-150 -translate-y-0.5 hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white focus:outline-none"
          type="button"
          title="名前を編集する"
          aria-label="名前を編集する"
        ></button>
        <div id="headerUserEdit" className="header-user-edit hidden flex items-center gap-1">
          <input
            type="text"
            id="headerUserNameInput"
            className="header-user-name-input px-2 py-1 border border-[#0366d6] rounded-md text-base w-[140px] shadow-[0_0_0_3px_rgba(3,102,214,0.1)] outline-none"
            maxLength={20}
            placeholder="名前を入力"
          />
          <button id="headerUserNameSaveBtn" className="header-user-save-btn px-2 py-1 bg-[#28a745] text-white border-none rounded-md cursor-pointer text-base font-semibold transition-[background] duration-200 hover:bg-[#218838]" aria-label="保存">
            ✓
          </button>
        </div>
        <button
          id="headerUserAvatar"
          className="header-user-avatar relative w-8 h-8 rounded-full border-2 border-[#d0d8e0] overflow-hidden cursor-pointer shrink-0 flex items-center justify-center bg-[#f0f4f8] transition-[border-color,box-shadow] duration-150 select-none p-0 -translate-y-0.5 hover:border-[#0366d6] hover:shadow-[0_0_0_2px_rgba(3,102,214,0.3)] focus:border-[#0366d6] focus:shadow-[0_0_0_2px_rgba(3,102,214,0.3)] focus:outline-none"
          type="button"
          title="プロフィール画像を変更する"
          aria-label="プロフィール画像を変更する"
        >
          {/* src は AvatarController が動的に設定する。空文字属性は React の警告対象なので未設定にする。 */}
          {/* display は JS が .visible クラスで制御するため 11-header-controls.css の display:none/.visible ルールを残置 */}
          <img id="headerUserAvatarImg" className="header-user-avatar-img w-full h-full object-cover rounded-full" alt="" aria-hidden="true" />
          {/* display は JS が .hidden クラスで制御するため 11-header-controls.css の .hidden ルールを参照 */}
          <span id="headerUserAvatarPlaceholder" className="header-user-avatar-placeholder text-base leading-none text-[#8a9ab0]" aria-hidden="true">
            👤
          </span>
        </button>
        <AvatarCropDialog />
      </div>
    </div>
  );
}
