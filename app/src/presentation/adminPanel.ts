/**
 * 管理（admin）画面の描画を担う UI ヘルパー。
 * QuizApp から肥大化していた renderAdminContent を切り出したもの。
 *
 * クリーンアーキテクチャ上の位置付け:
 * - presentation 層に属し、QuizUseCase / IProgressRepository を介してのみアプリケーション層を利用する。
 */

import { createElement } from "react";
import type { QuizUseCase } from "../application/quizUseCase";
import type { IProgressRepository } from "../application/ports";
import { formatExportFilename, formatAllUsersExportFilename } from "./adminPanelLogic";
import { AdminPanelRoot } from "./adminPanel/AdminPanelRoot";
import type { AdminPanelDeps } from "./adminPanel/types";
import { categoryListContentStore } from "./components/categoryListContentStore";

export type { AdminPanelDeps } from "./adminPanel/types";

/** JSON 文字列をファイルとしてダウンロードする共通処理。 */
function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * アクティブユーザーの全データを JSON ファイルとしてダウンロードする（個別管理）。
 * QuizApp.downloadUserData をそのまま外出ししたもの。
 */
export function downloadUserData(useCase: QuizUseCase): void {
  const data = useCase.exportAllData();
  downloadJson(JSON.stringify(data), formatExportFilename());
}

/**
 * 全ユーザーのデータを 1 つの JSON ファイルとしてダウンロードする（一括管理）。
 */
export async function downloadAllUsersData(progressRepo: IProgressRepository): Promise<void> {
  const data = await progressRepo.exportAllUsersData();
  downloadJson(JSON.stringify(data), formatAllUsersExportFilename());
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
      onExportAllUsersData: () => {
        void downloadAllUsersData(deps.progressRepo);
      },
    }),
  );
}
