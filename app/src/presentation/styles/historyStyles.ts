/**
 * 履歴一覧（HistoryList）のスコア・エントリ CVA レシピ群。
 *
 * - `historyScore`: 履歴ヘッダーのスコア表示（pass / fail）。
 *   セマンティッククラス（`history-score`、`pass` / `fail`）は
 *   既存テスト互換のため残置する。
 * - `historyEntry`: 履歴詳細の1問分のエントリ（correct / incorrect）。
 *   セマンティッククラス（`history-entry`、`correct` / `incorrect`）は
 *   既存テスト互換のため残置する。
 * - `historyEntryIcon`: エントリ内のアイコン（correct / incorrect の色分け）。
 *
 * 利用例:
 *   <span className={historyScore({ result: "pass" })}>10/10 (100%)</span>
 *   <div className={historyEntry({ result: "correct" })}>...</div>
 *   <span className={historyEntryIcon({ result: "correct" })}>✓</span>
 */

import { cva, type VariantProps } from "class-variance-authority";

export const historyScore = cva("history-score text-base font-bold whitespace-nowrap", {
  variants: {
    result: {
      pass: "pass text-[#28a745]",
      fail: "fail text-[#dc3545]",
    },
  },
});

export const historyEntry = cva("history-entry flex items-start gap-2.5 rounded-md p-2 text-[15px]", {
  variants: {
    result: {
      correct: "correct bg-[#f0fff4]",
      incorrect: "incorrect bg-[#fff0f0]",
    },
  },
});

export const historyEntryIcon = cva("history-entry-icon mt-px shrink-0 text-base font-bold", {
  variants: {
    result: {
      correct: "text-[#28a745]",
      incorrect: "text-[#dc3545]",
    },
  },
});

export type HistoryScoreVariantProps = VariantProps<typeof historyScore>;
export type HistoryEntryVariantProps = VariantProps<typeof historyEntry>;
export type HistoryEntryIconVariantProps = VariantProps<typeof historyEntryIcon>;
