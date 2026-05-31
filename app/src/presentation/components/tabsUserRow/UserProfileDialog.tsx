/**
 * ユーザープロフィールダイアログ。
 *
 * ヘッダーのアバター / ユーザー名クリックで開き、以下を 1 つのポップアップから操作できる:
 * - 名前の変更
 * - プロフィール画像の変更（既存 AvatarCropDialog を起動）
 * - ユーザーの追加
 * - ユーザーの切り替え
 */

import { useRef, useState, useSyncExternalStore } from "react";
import {
  subscribeUserProfileDialog,
  getUserProfileDialogSnapshot,
  closeUserProfileDialog,
  saveUserName,
  switchUser,
  addUserAndSwitch,
} from "./userProfileDialogStore";
import { dialogButton } from "../../styles/dialogButtonStyles";

export function UserProfileDialog(): React.JSX.Element {
  const state = useSyncExternalStore(
    subscribeUserProfileDialog,
    getUserProfileDialogSnapshot,
    getUserProfileDialogSnapshot,
  );

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // ダイアログが開いた / 閉じたときのリセット
  const prevOpenRef = useRef(false);
  if (state.open && !prevOpenRef.current) {
    // 開いた瞬間にリセット
    prevOpenRef.current = true;
    setEditingName(false);
    setAddingUser(false);
    setNewUserName("");
  } else if (!state.open && prevOpenRef.current) {
    prevOpenRef.current = false;
  }

  const handleStartEditName = (): void => {
    setEditingName(true);
    setNameValue(state.currentUserName === "ゲスト" ? "" : state.currentUserName);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = (): void => {
    const saved = saveUserName(nameValue);
    setEditingName(false);
    // ヘッダーの表示名も更新（既存 DOM 操作との連携）
    const headerNameBtn = document.getElementById("headerUserName");
    if (headerNameBtn) headerNameBtn.textContent = saved;
  };

  const handleOpenAvatarDialog = (): void => {
    closeUserProfileDialog();
    // 少し遅延して既存の AvatarCropDialog を開く
    setTimeout(() => {
      const avatarBtn = document.getElementById("headerUserAvatar");
      avatarBtn?.click();
    }, 100);
  };

  const handleAddUser = (): void => {
    const trimmed = newUserName.trim();
    if (!trimmed) return;
    addUserAndSwitch(trimmed);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      closeUserProfileDialog();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeUserProfileDialog();
    }
  };

  const overlayBase = "fixed inset-0 z-[999] flex items-start justify-end pt-14 pr-4";
  const overlayClass = state.open ? overlayBase : `${overlayBase} hidden`;

  return (
    <div
      id="userProfileDialog"
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-label="ユーザープロフィール"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="w-[300px] max-w-[90vw] rounded-lg border border-[#c8d8e8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#e8eef4]">
          <span className="text-[14px] font-bold text-[#24292e]">プロフィール</span>
          <button
            type="button"
            className="text-[18px] leading-none text-[#586069] hover:text-[#24292e] bg-transparent border-none cursor-pointer p-1"
            onClick={() => closeUserProfileDialog()}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* 名前セクション */}
        <div className="px-4 py-3 border-b border-[#e8eef4]">
          <p className="text-[12px] text-[#586069] m-0 mb-1">表示名</p>
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                type="text"
                className="flex-1 px-2 py-1 border border-[#0366d6] rounded-md text-sm outline-none shadow-[0_0_0_3px_rgba(3,102,214,0.1)]"
                maxLength={20}
                placeholder="名前を入力"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveName();
                  } else if (e.key === "Escape") {
                    setEditingName(false);
                  }
                }}
              />
              <button
                type="button"
                className="px-2 py-1 bg-[#28a745] text-white border-none rounded-md text-sm cursor-pointer hover:bg-[#218838]"
                onClick={handleSaveName}
              >
                保存
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="w-full text-left px-2 py-1 bg-transparent border border-[#e1e4e8] rounded-md text-sm text-[#24292e] cursor-pointer hover:bg-[#f6f8fa] transition-colors"
              onClick={handleStartEditName}
            >
              {state.currentUserName || "ゲスト"}
              <span className="ml-2 text-[#586069] text-xs">✏️</span>
            </button>
          )}
        </div>

        {/* アバターセクション */}
        <div className="px-4 py-3 border-b border-[#e8eef4]">
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 bg-transparent border border-[#e1e4e8] rounded-md text-sm text-[#24292e] cursor-pointer hover:bg-[#f6f8fa] transition-colors"
            onClick={handleOpenAvatarDialog}
          >
            🖼️ プロフィール画像を変更する
          </button>
        </div>

        {/* ユーザー一覧セクション */}
        <div className="px-4 py-3 border-b border-[#e8eef4] max-h-[200px] overflow-y-auto">
          <p className="text-[12px] text-[#586069] m-0 mb-2">ユーザー切り替え</p>
          <ul className="list-none m-0 p-0 flex flex-col gap-1">
            {state.users.map((user) => {
              const isActive = user.id === state.activeUserId;
              return (
                <li
                  key={user.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                    isActive ? "border-[#0366d6] bg-[#e8f0fe]" : "border-[#e1e4e8] bg-white"
                  }`}
                >
                  <span className="flex-1 text-sm text-[#24292e] overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.name || "ゲスト"}
                    {isActive ? <span className="ml-1 text-xs text-[#586069]">（使用中）</span> : null}
                  </span>
                  {isActive ? null : (
                    <button
                      type="button"
                      className="px-2 py-0.5 bg-[#0366d6] text-white border-none rounded text-xs cursor-pointer hover:bg-[#0255b8]"
                      onClick={() => switchUser(user.id)}
                    >
                      切り替え
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ユーザー追加セクション */}
        <div className="px-4 py-3">
          {addingUser ? (
            <div className="flex items-center gap-1">
              <input
                ref={addInputRef}
                type="text"
                className="flex-1 px-2 py-1 border border-[#28a745] rounded-md text-sm outline-none shadow-[0_0_0_3px_rgba(40,167,69,0.1)]"
                maxLength={20}
                placeholder="新しいユーザー名"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUser();
                  } else if (e.key === "Escape") {
                    setAddingUser(false);
                    setNewUserName("");
                  }
                }}
              />
              <button type="button" className={dialogButton({ variant: "confirm" })} onClick={handleAddUser}>
                追加
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="w-full px-2 py-1.5 bg-transparent border border-dashed border-[#28a745] rounded-md text-sm text-[#28a745] cursor-pointer hover:bg-[#f0fff4] transition-colors"
              onClick={() => {
                setAddingUser(true);
                setTimeout(() => addInputRef.current?.focus(), 0);
              }}
            >
              ＋ 新しいユーザーを追加
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
