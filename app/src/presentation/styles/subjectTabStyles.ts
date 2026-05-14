/**
 * 教科タブボタンの CVA レシピ。
 *
 * セマンティッククラス（`subject-tab`）は既存テスト・CSS 互換のため残置する。
 *
 * `active` 状態は CVA の `active` バリアントで `active` クラスを付与し、
 * Tailwind の arbitrary variant `[&.active]:` で見た目を切り替える。
 * `style.backgroundColor` は動的な値（教科色）のため CVA 外（JSX 側の `style` prop）で管理する。
 *
 * 利用例:
 *   <button
 *     className={subjectTab({ active: isActive })}
 *     style={{ backgroundColor: isActive ? subject.tabBgActive : subject.tabBg }}
 *   >
 *     {subject.name}
 *   </button>
 */

import { cva, type VariantProps } from "class-variance-authority";

export const subjectTab = cva(
  [
    "subject-tab",
    // レイアウト・ボーダー
    "pt-[6px] px-[18px] pb-2 border border-[rgba(0,0,0,0.12)] border-b-0",
    // 文字
    "cursor-pointer text-sm font-semibold text-[#5a4a28] font-[inherit]",
    "flex items-center gap-1.5 whitespace-nowrap",
    "shadow-[0_-2px_4px_rgba(0,0,0,0.08)] relative",
    "transition-[background,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0366d6] focus-visible:ring-offset-1",
    // hover 状態
    "hover:brightness-[1.05] hover:shadow-[0_-3px_6px_rgba(0,0,0,0.12)] hover:text-[#333]",
    // active 状態（太字・下に延伸して StartScreen に重なる）
    // pb-[40px] でタブ下部に同色の矩形を描画し、-mb-[40px] でレイアウト上の高さ増加を打ち消す
    // これにより、タブ行の高さを変えずにアクティブタブの拡張部分が下のコンテンツ（StartScreen header）に
    // オーバーラップして視覚的に接続する
    // items-start（TabsUserRow 側）と合わせることで全タブの上端位置はそろったまま
    // [&.active]:border-b で延伸部分の下端に枠線を復活させる（border-b-0 を上書き）
    "[&.active]:text-[#1a1a1a] [&.active]:font-extrabold [&.active]:brightness-110 [&.active]:pb-[40px] [&.active]:-mb-[40px] [&.active]:z-10 [&.active]:border-b",
  ].join(" "),
  {
    variants: {
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

export type SubjectTabVariantProps = VariantProps<typeof subjectTab>;
