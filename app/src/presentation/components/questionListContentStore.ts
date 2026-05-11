/**
 * 問題一覧タブ本文（`#questionListBody`）のコンテンツを保持するストア。
 * `renderQuestionList` から `set()` を呼んで更新し、`QuizPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const questionListContentStore = createNodeStore();
