/**
 * サポートパネル右カラム（`#supportContent`）のコンテンツを保持するストア。
 * `supportPanel` から `set()` を呼んで更新し、`StartScreen` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const supportContentStore = createNodeStore();
