/**
 * 結果画面表示用の外部ストア。
 *
 * QuizApp の採点完了時に `setResults` で更新し、
 * ResultScreen が `useSyncExternalStore` で購読して描画する。
 */

import type { AnswerResult } from "../../application/quizUseCase";

type Listener = () => void;

let currentResults: AnswerResult[] | null = null;
const listeners = new Set<Listener>();

export function subscribeResultStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResultSnapshot(): AnswerResult[] | null {
  return currentResults;
}

export function setResults(results: AnswerResult[] | null): void {
  if (currentResults === results) return;
  currentResults = results;
  listeners.forEach((listener) => listener());
}
