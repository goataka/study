/**
 * React アプリケーションのエントリポイント兼 composition root。
 *
 * 役割:
 * - `index.html` の `<div id="root"></div>` に `<App />` をマウントする。
 * - 本番用の依存（`IndexedDBProgressRepository` + `QuizApp`）を組み立て、
 *   `bootApp` コールバックとして `App` に注入する（依存方向: presentation → application → domain
 *   を保ち、`App` が infrastructure 層の具象を直接 import しない設計）。
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./presentation/App";
import { QuizApp } from "./presentation/quizApp";
import { IndexedDBProgressRepository } from "./infrastructure/indexedDBProgressRepository";

const container = document.getElementById("root");
if (!container) {
  throw new Error("React マウント先の #root 要素が見つかりません");
}

// 本番用の依存組み立て。テストや将来のストーリーブックでは別の bootApp を渡せる。
const bootApp = (): void => {
  new QuizApp(new IndexedDBProgressRepository());
};

createRoot(container).render(
  <StrictMode>
    <App bootApp={bootApp} />
  </StrictMode>,
);
