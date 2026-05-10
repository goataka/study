/**
 * 結果画面の解答一覧アイテム CVA レシピ。
 *
 * 旧 `.result-item.correct` / `.result-item.incorrect` 相当の見た目を
 * Tailwind ユーティリティで表現する。アイコン色は `compoundVariants` で
 * 同じ `result` バリアント値に応じて切り替える。
 *
 * `.result-item` クラス自体は responsive override の対象ではないが、
 * 既存テストや E2E で `.result-item` を参照する可能性があるため
 * セマンティッククラス（`result-item`、`correct` / `incorrect`）は
 * レシピ出力に**残置**する。
 *
 * 利用例:
 *   <div className={resultItem({ result: "correct" })}>...</div>
 *   <span className={resultIcon({ result: "correct" })}>✓</span>
 */

import { cva, type VariantProps } from "class-variance-authority";

const resultItemVariants = cva("result-item mb-[15px] rounded border-l-4 border-solid bg-[#f9f9f9] p-[15px]", {
  variants: {
    result: {
      correct: "correct border-l-[#38ef7d]",
      incorrect: "incorrect border-l-[#f45c43]",
    },
  },
  defaultVariants: {
    result: "correct",
  },
});

const resultIconVariants = cva("result-icon mr-0.5 shrink-0 text-[26px] font-bold", {
  variants: {
    result: {
      correct: "text-[#38ef7d]",
      incorrect: "text-[#f45c43]",
    },
  },
  defaultVariants: {
    result: "correct",
  },
});

export type ResultItemVariantProps = VariantProps<typeof resultItemVariants>;
export type ResultIconVariantProps = VariantProps<typeof resultIconVariants>;

export const resultItem = resultItemVariants;
export const resultIcon = resultIconVariants;
