/**
 * アバター画像の選択 + トリム位置指定ダイアログ。
 *
 * `AvatarController` がダイアログ要素・プレビュー画像・ズーム入力を直接 DOM 操作する。
 * React は静的な初期マークアップのみを描画する。
 *
 * NOTE: 静的スタイルと `.visible` / `.dragging` の状態スタイルは
 * Tailwind ユーティリティへ移行済み。`::backdrop` 疑似要素のみ
 * `07-avatar-dialog.css` に残している。
 */

import { dialogButton } from "../styles/dialogButtonStyles";

export function AvatarCropDialog(): React.JSX.Element {
  return (
    <dialog
      id="avatarCropDialog"
      className="fixed top-1/2 left-1/2 min-w-[240px] max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#c8d8e8] p-0 shadow-[0_8px_24px_rgba(0,0,0,0.25)] avatar-crop-dialog"
    >
      <div className="flex flex-col items-center gap-3 p-4">
        <p className="m-0 text-[14px] font-bold text-[#24292e]">プロフィール画像</p>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[#0366d6] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#0256b8]">
          <span>画像を選択</span>
          <input
            id="headerUserAvatarInput"
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />
        </label>
        <div
          id="avatarCropPreviewWrap"
          className="relative flex h-[120px] w-[120px] cursor-grab touch-none select-none items-center justify-center overflow-hidden rounded-full border-2 border-[#d0d8e0] bg-[#f0f4f8] [overscroll-behavior:contain] avatar-crop-preview-wrap [&.dragging]:cursor-grabbing"
        >
          {/* src は AvatarController が動的に設定する。空文字属性は React の警告対象なので未設定にする。 */}
          <img
            id="avatarCropPreview"
            className="pointer-events-none hidden h-full w-full object-cover avatar-crop-preview [&.visible]:block"
            alt=""
            aria-hidden="true"
          />
          <span
            id="avatarCropPreviewPlaceholder"
            className="pointer-events-none text-[48px] leading-none text-[#0366d6]"
          >
            👤
          </span>
        </div>
        <label htmlFor="avatarCropZoom" className="self-stretch text-[12px] text-[#586069]">
          拡大縮小
        </label>
        <input
          id="avatarCropZoom"
          className="w-full"
          type="range"
          min="1"
          max="3"
          step="0.05"
          defaultValue="1"
          aria-label="拡大縮小"
        />
        <div className="flex w-full gap-2">
          <button id="avatarCropConfirmBtn" type="button" className={dialogButton({ variant: "confirm" })}>
            確定
          </button>
          <button id="avatarCropCancelBtn" type="button" className={dialogButton({ variant: "cancel" })}>
            キャンセル
          </button>
        </div>
      </div>
    </dialog>
  );
}
