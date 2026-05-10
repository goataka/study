/**
 * クイズ画面下部のナビゲーションボタン CVA レシピ。
 *
 * 旧 `.nav-btn` / `.submit-btn` 相当の見た目を Tailwind ユーティリティで表現する。
 * 共通ボタン CVA（`button({ variant })`）は `.button-group` 配下用の角丸の
 * 大きめスタイルなのに対し、こちらは `flex: 1` のナビ列専用なので別レシピにする。
 *
 * セマンティッククラス（`nav-btn` / `submit-btn`）は font-size 切替
 * （`15-font-size.css` の `body.font-size-medium .nav-btn, body.font-size-medium .submit-btn`）
 * から参照されるためレシピ出力に含めて**残置**する。
 *
 * 利用例:
 *   <button className={navButton({ variant: "nav" })}>前へ</button>
 *   <button className={navButton({ variant: "submit" })}>採点する</button>
 */

import { cva, type VariantProps } from "class-variance-authority";

const navButtonVariants = cva(
  "flex-1 cursor-pointer rounded-lg border-none px-6 py-3 text-lg font-bold transition-all duration-300",
  {
    variants: {
      variant: {
        nav: "nav-btn bg-[#f0f0f0] text-[#333] hover:not-disabled:bg-[#e0e0e0]",
        submit:
          "submit-btn bg-[#0366d6] text-white hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-[#0255b8] hover:not-disabled:shadow-[0_6px_12px_rgba(3,102,214,0.4)]",
      },
      hidden: {
        true: "hidden",
        false: "",
      },
    },
    defaultVariants: {
      hidden: false,
    },
  },
);

export type NavButtonVariantProps = VariantProps<typeof navButtonVariants>;

export const navButton = navButtonVariants;
