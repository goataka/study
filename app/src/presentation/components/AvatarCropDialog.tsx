/**
 * アバター画像の選択 + トリム位置指定ダイアログ。
 *
 * `AvatarController` がダイアログ要素・プレビュー画像・ズーム入力を直接 DOM 操作する。
 * React は静的な初期マークアップのみを描画する。
 */

export function AvatarCropDialog(): React.JSX.Element {
  return (
    <dialog id="avatarCropDialog" className="avatar-crop-dialog">
      <div className="avatar-crop-dialog-inner">
        <p className="avatar-crop-dialog-title">プロフィール画像</p>
        <label className="avatar-crop-file-label">
          <span>画像を選択</span>
          <input id="headerUserAvatarInput" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" />
        </label>
        <div className="avatar-crop-preview-wrap" id="avatarCropPreviewWrap">
          {/* src は AvatarController が動的に設定する。空文字属性は React の警告対象なので未設定にする。 */}
          <img id="avatarCropPreview" className="avatar-crop-preview" alt="" aria-hidden="true" />
          <span id="avatarCropPreviewPlaceholder" className="avatar-crop-preview-placeholder">
            👤
          </span>
        </div>
        <label htmlFor="avatarCropZoom" className="avatar-crop-zoom-label">
          拡大縮小
        </label>
        <input
          id="avatarCropZoom"
          className="avatar-crop-zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          defaultValue="1"
          aria-label="拡大縮小"
        />
        <div className="avatar-crop-dialog-btns">
          <button id="avatarCropConfirmBtn" type="button" className="avatar-crop-confirm-btn">
            確定
          </button>
          <button id="avatarCropCancelBtn" type="button" className="avatar-crop-cancel-btn">
            キャンセル
          </button>
        </div>
      </div>
    </dialog>
  );
}
