/**
 * カテゴリ操作系ボタン（学習状態フィルター / 学年フィルター / ビューモード切替）の CVA レシピ。
 *
 * セマンティッククラス（`category-status-filter-btn` / `grade-filter-btn` / `category-view-toggle`）を
 * 出力に含め、既存テストやフォントサイズ切替との互換性を維持する。
 */

import { cva, type VariantProps } from "class-variance-authority";

export const statusFilterButton = cva(
  "category-status-filter-btn text-xs border border-[#d1d5da] rounded-[10px] bg-white text-[#586069] cursor-pointer select-none whitespace-nowrap transition-[background,color] duration-150 hover:bg-[#e8f0fe] hover:border-[#0366d6] hover:text-[#0366d6] [&.active]:bg-[#0366d6] [&.active]:border-[#0366d6] [&.active]:text-white",
  {
    variants: {
      size: {
        standard: "px-[7px] py-0.5",
      },
    },
    defaultVariants: {
      size: "standard",
    },
  },
);

export const gradeFilterButton = cva(
  "grade-filter-btn text-xs px-2 py-0.5 border border-[#d1d5da] rounded-[10px] bg-white text-[#586069] cursor-pointer select-none transition-[background,color] duration-150 hover:bg-[#e8f0fe] hover:border-[#0366d6] hover:text-[#0366d6] [&[aria-pressed='true']]:bg-[#0366d6] [&[aria-pressed='true']]:border-[#0366d6] [&[aria-pressed='true']]:text-white",
);

export const categoryViewToggleButton = cva(
  "category-view-toggle text-sm px-2 py-[3px] border border-[#d1d5da] rounded cursor-pointer select-none bg-white text-[#586069] transition-[background,color] duration-150 hover:bg-[#e8f0fe] hover:border-[#0366d6] hover:text-[#0366d6] [&[aria-pressed='true']]:bg-[#0366d6] [&[aria-pressed='true']]:border-[#0366d6] [&[aria-pressed='true']]:text-white",
);

export type StatusFilterButtonVariantProps = VariantProps<typeof statusFilterButton>;
