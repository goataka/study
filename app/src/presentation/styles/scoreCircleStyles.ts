/**
 * 結果画面のスコア円 CVA レシピ。
 *
 * 旧 `.score-circle.pass` / `.score-circle.fail` / `.score-circle.perfect`
 * 相当の見た目を Tailwind ユーティリティで表現する。
 *
 * セマンティッククラス（`score-circle`、`pass` / `fail` / `perfect`）は
 * 単体テスト（`result.test.ts`）が `.classList.contains("perfect")` などで
 * チェックしているため、レシピの出力に含めて**残置**する。
 * `10-responsive-base.css` のレスポンシブ上書き（`@media (max-width: 600px)`）
 * からも `.score-circle` / `.score-percentage` が参照される。
 *
 * 利用例:
 *   <div className={scoreCircle({ result: "perfect" })}>...</div>
 */

import { cva, type VariantProps } from "class-variance-authority";

const scoreCircleVariants = cva(
  "score-circle flex h-[200px] w-[200px] flex-col items-center justify-center rounded-full p-10 text-center text-white shadow-[0_8px_16px_rgba(0,0,0,0.1)]",
  {
    variants: {
      result: {
        pass: "pass bg-gradient-to-br from-[#11998e] to-[#38ef7d]",
        fail: "fail bg-gradient-to-br from-[#eb3349] to-[#f45c43]",
        perfect: "perfect bg-gradient-to-br from-[#f7971e] to-[#ffd200]",
      },
    },
    // 結果画面では呼び出し側が percentage に応じて pass/fail/perfect を必ず指定するため
    // デフォルトは設定しない（指定漏れがあれば TypeScript で検出される）。
  },
);

export type ScoreCircleVariantProps = VariantProps<typeof scoreCircleVariants>;

export const scoreCircle = scoreCircleVariants;
