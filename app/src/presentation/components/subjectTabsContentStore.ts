/**
 * 教科タブ列（`.subject-tabs`）のコンテンツを保持するストア。
 * `tabsBuilder` から `set()` を呼んで更新し、`TabsUserRow` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const subjectTabsContentStore = createNodeStore();
