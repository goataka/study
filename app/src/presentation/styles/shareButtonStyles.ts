/**
 * 総合タブのシェア系ボタン（コピー / 共有 / 保存）の CVA レシピ。
 *
 * セマンティッククラス（`share-copy-btn` / `share-url-open-btn` / `share-url-save-btn`）を
 * 含めることで、`15-font-size.css` のフォントサイズ切替を維持する。
 */

import { cva, type VariantProps } from "class-variance-authority";

const shareButtonVariants = cva(
  "px-3 py-1 text-[13px] border rounded bg-white cursor-pointer whitespace-nowrap transition-[background,color] duration-150",
  {
    variants: {
      kind: {
        copy: "share-copy-btn border-[#0366d6] text-[#0366d6] hover:bg-[#0366d6] hover:text-white",
        open: "share-url-open-btn border-[#1a7f37] text-[#1a7f37] hover:bg-[#1a7f37] hover:text-white",
        save: "share-url-save-btn border-[#1a7f37] text-[#1a7f37] hover:bg-[#1a7f37] hover:text-white",
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

export type ShareButtonVariantProps = VariantProps<typeof shareButtonVariants>;

export const shareButton = shareButtonVariants;
