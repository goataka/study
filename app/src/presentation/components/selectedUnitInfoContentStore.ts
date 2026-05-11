/**
 * 「選択中の単元情報」パネル（`#selectedUnitInfo`）のコンテンツを保持するストア。
 * `selectedUnitInfoUpdater` から `set()` を呼んで更新し、`StartScreen` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const selectedUnitInfoContentStore = createNodeStore();
