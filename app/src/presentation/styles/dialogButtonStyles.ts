/**
 * ダイアログ内ボタン（確定 / キャンセル）の CVA レシピ。
 *
 * 現在 `AvatarCropDialog.tsx` の確定・キャンセルボタンに使用する。
 * 汎用的なダイアログボタンパターンとして他ダイアログにも流用可能。
 *
 * 利用例:
 *   <button className={dialogButton({ variant: "confirm" })}>確定</button>
 *   <button className={dialogButton({ variant: "cancel" })}>キャンセル</button>
 */

import { cva, type VariantProps } from "class-variance-authority";

export const dialogButton = cva(
  "flex-1 cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 border",
  {
    variants: {
      variant: {
        confirm: "border-[#28a745] bg-[#28a745] text-white hover:bg-[#218838]",
        cancel: "border-[#d1d5da] bg-white text-[#586069] hover:bg-[#f6f8fa]",
      },
    },
    defaultVariants: {
      variant: "confirm",
    },
  },
);

export type DialogButtonVariantProps = VariantProps<typeof dialogButton>;
