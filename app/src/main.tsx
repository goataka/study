/**
 * React アプリケーションのエントリポイント。
 *
 * `index.html` の `<div id="root"></div>` に `<App />` をマウントする。
 * 既存の vanilla TypeScript 実装（`presentation/quizApp.ts` 配下）への
 * 段階的移行のため、当面は `<App />` 内で従来の `QuizApp` クラスを
 * useEffect ライフサイクルから起動する薄いラッパー構成を採用している。
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./presentation/App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("React マウント先の #root 要素が見つかりません");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
