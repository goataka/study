/**
 * 解説パネルフレーム（`#guidePanelFrame`）のコンテンツを保持するストア。
 * `guidePanelUpdater` から `set()` / `reset()` を呼んで更新し、`QuizPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const guidePanelContentStore = createNodeStore();
