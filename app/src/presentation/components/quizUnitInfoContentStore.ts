/**
 * クイズ画面用「単元情報」パネルのコンテンツを保持するストア。
 * `selectedUnitInfoContentStore` とは異なり、閉じるボタンを持たない表示専用コンポーネントを格納する。
 * `selectedUnitInfoUpdater` から set() / clear() を呼んで更新し、`QuizScreen` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const quizUnitInfoContentStore = createNodeStore();
