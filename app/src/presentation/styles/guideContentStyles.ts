/**
 * 解説パネルのコンテンツコンテナ（`.guide-content`）の CVA レシピ。
 *
 * `guide-content` クラスは `.guide-frame .markdown-body` のスタイル管理で
 * 既存 CSS から参照されているため残置する。
 * Tailwind ユーティリティは base に追加済み。
 *
 * 利用例:
 *   <div className={guideContent()} dangerouslySetInnerHTML={{ __html: html }} />
 *   <div className={guideContent()}>...</div>
 */

import { cva } from "class-variance-authority";

export const guideContent = cva("guide-content px-4 py-3 text-[14px] leading-relaxed text-[#24292e]");
