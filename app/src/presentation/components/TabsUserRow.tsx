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
    <div className="tabs-user-row">
      <div className="subject-tabs" role="tablist" aria-label="教科を選択"></div>
      <div className="tabs-links-area">
        <a
          id="supportBtn"
          className="tabs-link-note tabs-link-note-support"
          href="./support/"
          target="_blank"
          rel="noopener noreferrer"
          title="サポートページを開く"
          aria-label="サポートページを開く"
        >
          ❔
        </a>
      </div>
      <div className="tabs-user-area">
        <button
          id="headerUserName"
          className="header-user-name"
          type="button"
          title="名前を編集する"
          aria-label="名前を編集する"
        ></button>
        <div id="headerUserEdit" className="header-user-edit hidden">
          <input
            type="text"
            id="headerUserNameInput"
            className="header-user-name-input"
            maxLength={20}
            placeholder="名前を入力"
          />
          <button id="headerUserNameSaveBtn" className="header-user-save-btn" aria-label="保存">
            ✓
          </button>
        </div>
        <button
          id="headerUserAvatar"
          className="header-user-avatar"
          type="button"
          title="プロフィール画像を変更する"
          aria-label="プロフィール画像を変更する"
        >
          {/* src は AvatarController が動的に設定する。空文字属性は React の警告対象なので未設定にする。 */}
          <img id="headerUserAvatarImg" className="header-user-avatar-img" alt="" aria-hidden="true" />
          <span id="headerUserAvatarPlaceholder" className="header-user-avatar-placeholder" aria-hidden="true">
            👤
          </span>
        </button>
        <AvatarCropDialog />
      </div>
    </div>
  );
}
