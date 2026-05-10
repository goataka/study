/**
 * 共通ボタンの class 文字列を生成する CVA レシピ。
 *
 * 設計方針:
 * - 出力には**従来のセマンティッククラス**（`primary-btn` / `secondary-btn` /
 *   `tertiary-btn`）を含める。これは `15-font-size.css` の
 *   `body.font-size-medium .primary-btn { font-size: ... }` 等が
 *   フォントサイズ切り替え時にキー名で参照しているため、
 *   Tailwind 化後もクラス名自体を残す必要があるためである。
 * - 実際の見た目（color / padding / radius / hover 効果）はすべて
 *   Tailwind ユーティリティで表現する。元 CSS の `.primary-btn` 等の
 *   宣言は、本レシピへ移行後に `09-quiz-screen.css` から削除する。
 *
 * 利用例:
 *   <button className={button({ variant: "primary" })}>OK</button>
 *   <button className={button({ variant: "secondary", hidden: true })}>キャンセル</button>
 */

import { cva, type VariantProps } from "class-variance-authority";

/**
 * 旧 `.primary-btn` / `.secondary-btn` / `.tertiary-btn` 共通の基本スタイル。
 * `font-size` は Tailwind の `text-xl`（20px）で出力するが、
 * `body.font-size-medium .primary-btn` などのフォントサイズ上書きが
 * 詳細度（0,2,0 vs 0,1,0）で勝つため、フォントサイズ切替は従来通り動作する。
 */
const buttonVariants = cva(
  "cursor-pointer rounded-lg border-none px-[30px] py-[15px] text-xl font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // 旧 `.primary-btn` 相当：青地に白文字、hover で持ち上がる
        primary:
          "primary-btn bg-[#0366d6] text-white hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-[#0255b8] hover:not-disabled:shadow-[0_6px_12px_rgba(3,102,214,0.4)]",
        // 旧 `.secondary-btn` 相当：グレー地に濃いグレー文字、hover で薄暗く
        secondary: "secondary-btn bg-[#f0f0f0] text-[#333] hover:not-disabled:bg-[#e0e0e0]",
        // 旧 `.tertiary-btn` 相当：白地に青文字＋青枠
        tertiary: "tertiary-btn border-2 border-solid border-[#0366d6] bg-white text-[#0366d6] hover:bg-[#f8f9ff]",
      },
      hidden: {
        true: "hidden",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      hidden: false,
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export const button = buttonVariants;
