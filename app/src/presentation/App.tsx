/**
 * React アプリケーションのルートコンポーネント。
 *
 * 段階的 React 移行の Phase 1 として、本コンポーネントは以下を担う：
 *
 * 1. 既存の vanilla TypeScript 実装である `QuizApp`（`presentation/quizApp.ts`）の
 *    起動（`useEffect` 内で `new QuizApp(...)` を 1 度だけ実行）。
 * 2. `IndexedDBProgressRepository` 等の依存注入。
 *
 * 既存の DOM マークアップは現時点では `index.html` 側に残しており、React は
 * 起動ライフサイクルのみを所有する薄いラッパーとして機能する。
 * Phase 2 以降で `index.html` の各セクション（startScreen / quizScreen /
 * resultScreen / 各種ダイアログ等）を React コンポーネントへ順次移行していく。
 */

import { useEffect, useRef } from "react";
import { QuizApp } from "./quizApp";
import { IndexedDBProgressRepository } from "../infrastructure/indexedDBProgressRepository";

export function App(): null {
  // React.StrictMode による二重マウントで二重起動しないようガードする
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    // 既存の vanilla 実装を起動。マークアップは index.html に存在する。
    new QuizApp(new IndexedDBProgressRepository());
  }, []);

  return null;
}
