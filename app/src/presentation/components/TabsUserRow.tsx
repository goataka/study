/**
 * 教科タブ + ユーザーエリア（名前 / アバター / アバター編集ダイアログ）。
 *
 * これら DOM 要素は既存の vanilla 実装（`QuizApp` / `AvatarController` 等）が
 * `getElementById` 経由で参照する。React は初期マークアップだけを担当し、
 * 後続の更新（テキスト・src 等）は引き続き既存コントローラが行う。
 *
 * サポートリンクはタブ行の末尾（管理タブの後）に tabsBuilder が挿入するため
 * ここには含めない。
 */

import { useSyncExternalStore } from "react";
import { AvatarCropDialog } from "./AvatarCropDialog";
import type { ScreenName } from "./screenStore";
import { subjectTabsContentStore } from "./subjectTabsContentStore";

interface TabsUserRowProps {
  currentScreen: ScreenName;
}

export function TabsUserRow({ currentScreen }: TabsUserRowProps): React.JSX.Element {
  return (
    <div className="tabs-user-row flex items-end gap-0 [background:linear-gradient(to_bottom,#1e3a5f_0%,#0d2137_100%)] shrink-0">
      <div
        className={[
          "subject-tabs",
          currentScreen !== "start" ? "hidden" : "",
          "flex flex-1 min-w-0 gap-1 border-b-0 mb-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4 items-end justify-start",
        ].join(" ")}
        role="tablist"
        aria-label="教科を選択"
      >
        <SubjectTabsSection />
      </div>
      <div className="tabs-user-area flex items-center gap-1.5 shrink-0 px-4 pt-px relative ml-4 pl-4">
        <button
          id="headerUserName"
          className="header-user-name text-[15px] text-white font-semibold max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap bg-transparent border-none rounded-md px-2 py-1 cursor-pointer transition-[background,color] duration-150 -translate-y-0.5 hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white focus:outline-none"
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
          <button
            id="headerUserNameSaveBtn"
            className="header-user-save-btn px-2 py-1 bg-[#28a745] text-white border-none rounded-md cursor-pointer text-base font-semibold transition-[background] duration-200 hover:bg-[#218838]"
            aria-label="保存"
          >
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
          <img
            id="headerUserAvatarImg"
            className="header-user-avatar-img hidden h-full w-full rounded-full object-cover [&.visible]:block"
            alt=""
            aria-hidden="true"
          />
          {/* display は JS が .hidden クラスで制御するため 11-header-controls.css の .hidden ルールを参照 */}
          <span
            id="headerUserAvatarPlaceholder"
            className="header-user-avatar-placeholder text-base leading-none text-[#8a9ab0]"
            aria-hidden="true"
          >
            👤
          </span>
        </button>
        <AvatarCropDialog />
      </div>
    </div>
  );
}

/** 教科タブ列 — subjectTabsContentStore から描画。 */
function SubjectTabsSection(): React.JSX.Element {
  const node = useSyncExternalStore(subjectTabsContentStore.subscribe, subjectTabsContentStore.get, subjectTabsContentStore.get);
  return <>{node}</>;
}
