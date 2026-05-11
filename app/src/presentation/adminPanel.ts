/**
 * 管理（admin）画面の描画を担う UI ヘルパー。
 * QuizApp から肥大化していた renderAdminContent を切り出したもの。
 *
 * クリーンアーキテクチャ上の位置付け:
 * - presentation 層に属し、QuizUseCase / IProgressRepository を介してのみアプリケーション層を利用する。
 */

import { createElement } from "react";
import type { QuizUseCase } from "../application/quizUseCase";
import { formatExportFilename } from "./adminPanelLogic";
import { AdminPanelRoot } from "./adminPanel/AdminPanelRoot";
import type { AdminPanelDeps } from "./adminPanel/types";
import { categoryListContentStore } from "./components/categoryListContentStore";

export type { AdminPanelDeps } from "./adminPanel/types";

/**
 * 全データを JSON ファイルとしてダウンロードする。
 * QuizApp.downloadUserData をそのまま外出ししたもの。
 */
export function downloadUserData(useCase: QuizUseCase): void {
  const data = useCase.exportAllData();
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = formatExportFilename();
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * 管理画面（カテゴリリスト領域＋adminContent 領域）を描画する。
 */
export function renderAdminContent(_categoryList: HTMLElement, deps: AdminPanelDeps): void {
  const adminContentEl = document.getElementById("adminContent");
  if (!adminContentEl) return;

  adminContentEl.innerHTML = "";

  categoryListContentStore.set(
    createElement(AdminPanelRoot, {
      ...deps,
      adminContentEl,
      onExportAllData: () => {
        downloadUserData(deps.useCase);
      },
    }),
  );
}
