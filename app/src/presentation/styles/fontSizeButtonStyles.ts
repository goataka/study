/**
 * 文字サイズ切り替えボタンの CVA レシピ。
 *
 * セマンティッククラス（`font-size-btn`）は
 * 既存の `15-font-size.css` から参照されるため残置する。
 *
 * `active` 状態は `aria-pressed` 属性と `active` クラスの両方で表現する
 * （Tailwind の arbitrary variant `[&.active]:` を使用）。
 *
 * 利用例:
 *   <button className={fontSizeButton({ size: "small", active: false })}>小</button>
 *   <button className={fontSizeButton({ size: "medium", active: true })}>中</button>
 */

import { cva, type VariantProps } from "class-variance-authority";

export const fontSizeButton = cva(
  "font-size-btn cursor-pointer border border-solid border-[#c8d8e8] rounded-md bg-[#f0f7ff] px-2 py-1 text-[#586069] font-semibold font-[inherit] transition-[background,color,border-color] duration-200 hover:border-[#0366d6] hover:text-[#0366d6] hover:bg-[#e0efff] [&.active]:bg-[#0366d6] [&.active]:text-white [&.active]:border-[#0366d6]",
  {
    variants: {
      size: {
        small: "text-[11px]",
        medium: "text-[15px]",
        large: "text-[19px]",
      },
      active: {
        true: "active",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export type FontSizeButtonVariantProps = VariantProps<typeof fontSizeButton>;
