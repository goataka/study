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
  currentResults = results;
  listeners.forEach((listener) => listener());
}
