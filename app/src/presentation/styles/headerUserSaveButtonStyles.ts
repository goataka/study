/**
 * ヘッダー内ユーザー名保存ボタンの CVA レシピ。
 *
 * `TabsUserRow.tsx` の `#headerUserNameSaveBtn` に使用する。
 *
 * 利用例:
 *   <button className={headerUserSaveButton()}>✓</button>
 */

import { cva } from "class-variance-authority";

export const headerUserSaveButton = cva(
  "header-user-save-btn px-2 py-1 bg-[#28a745] text-white border-none rounded-md cursor-pointer text-base font-semibold transition-[background] duration-200 hover:bg-[#218838]",
);
