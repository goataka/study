/**
 * クイズ画面の選択肢エリア（`#choicesContainer`）のコンテンツを保持するストア。
 * `choicesRenderer` から `set()` を呼んで更新し、`QuizScreen` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const choicesContentStore = createNodeStore();
