/**
 * カテゴリ一覧領域（`#categoryList`）のコンテンツを保持するストア。
 *
 * 教科別・学年別・総合・進度・管理など、複数のレンダラーが同一コンテナを共有するため
 * 単一ストアとして管理する。各レンダラーは `set()` を呼んでコンテンツを差し替え、
 * `CategoryPanel` が購読して描画する。
 * `reset()` は clearReactContainer の代替として使用する。
 */
import { createNodeStore } from "./createNodeStore";
export const categoryListContentStore = createNodeStore();
