/**
 * カテゴリビューコントロール（`#categoryControls`）のコンテンツを保持するストア。
 * `categoryViewControls` から `set()` / `reset()` を呼んで更新し、`CategoryPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const categoryControlsContentStore = createNodeStore();
