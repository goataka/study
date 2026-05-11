/**
 * 読み上げボタン（QuizScreen の英語読み上げ）の CVA レシピ。
 *
 * セマンティッククラス（`speak-btn`）は
 * 既存 CSS（`.speak-btn.hidden + .choices-container` のマージン補正）から
 * 参照されるため残置する。
 *
 * 利用例:
 *   <button className={speakButton({ hidden: false })}>🔊</button>
 *   <button className={speakButton({ hidden: true })}>🔊</button>
 */

import { cva, type VariantProps } from "class-variance-authority";

export const speakButton = cva(
  "speak-btn mb-[18px] inline-flex cursor-pointer items-center justify-center rounded-[20px] border border-solid border-[#0366d6] bg-white px-3.5 py-1 text-lg text-[#0366d6] transition-colors duration-200 hover:bg-[#f0f7ff]",
  {
    variants: {
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

export type SpeakButtonVariantProps = VariantProps<typeof speakButton>;
