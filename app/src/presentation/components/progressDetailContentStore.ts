/**
 * 進度タブ詳細パネル本文（`#progressDetailContent`）のコンテンツを保持するストア。
 * `progressTabRenderer` / `progressMatrixView` / `progressBlockView` から `set()` を呼んで更新し、
 * `ProgressDetailPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const progressDetailContentStore = createNodeStore();
