/**
 * `quizSettingsStore` の React 用 hooks 集。
 */

import { useSyncExternalStore } from "react";
import { getQuizSettingsSnapshot, subscribeQuizSettingsStore, type QuizSettingsState } from "./quizSettingsStore";

export function useQuizSettings(): QuizSettingsState {
  return useSyncExternalStore(subscribeQuizSettingsStore, getQuizSettingsSnapshot, getQuizSettingsSnapshot);
}
