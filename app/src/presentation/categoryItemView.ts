/**
 * 単元一覧のカテゴリアイテム DOM 構築ヘルパー。
 *
 * QuizApp.createCategoryItem の純粋 DOM 部分を切り出したもの。
 * クリック/キーボードハンドラーは QuizApp 側で attach する。
 */

import { gradeColorClass, renderBacktickText } from "./uiHelpers";

/**
 * カテゴリアイテム生成に必要な情報。
 */
export interface CategoryItemData {
  subject: string;
  categoryId: string;
  categoryName: string;
  parentCatId?: string;
  topCatId?: string;
  /** カテゴリ階層情報（学年別ビューでのみ使用） */
  hierarchy?: { topName?: string; parentName?: string };
  referenceGrade?: string;
  /** referenceGrade を表示するかどうか（学年別ビューでは非表示） */
  showReferenceGrade: boolean;
  description?: string;
  example?: string;
}

/**
 * 単元一覧の 1 件分のカテゴリアイテム要素を組み立てる。
 *
 * 進捗バーと進捗数値テキストは空のままで生成する（呼び出し側で setText 等を使って後から更新する）。
 */
export function buildCategoryItem(data: CategoryItemData): HTMLElement {
  const item = document.createElement("div");
  item.className = "category-item";
  item.dataset.subject = data.subject;
  item.dataset.category = data.categoryId;
  if (data.parentCatId) item.dataset.parentCategory = data.parentCatId;
  if (data.topCatId) item.dataset.topCategory = data.topCatId;
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");

  const statusSpan = document.createElement("span");
  statusSpan.className = "category-status";
  statusSpan.setAttribute("aria-hidden", "true");
  statusSpan.textContent = "⬜";

  // カテゴリ名 + 例文 + 進捗バーのエリア
  const nameArea = document.createElement("div");
  nameArea.className = "category-name-area";

  // タイトルと例文・説明文を横並びにするラッパー
  const titleRow = document.createElement("div");
  titleRow.className = "category-title-row";

  const nameSpan = document.createElement("span");
  nameSpan.className = "category-name";
  nameSpan.textContent = data.categoryName;
  titleRow.appendChild(nameSpan);

  // 学年別ビューでは親カテゴリ・トップカテゴリの名称を表示する
  if (data.hierarchy) {
    const nameParts: string[] = [];
    if (data.hierarchy.topName) nameParts.push(data.hierarchy.topName);
    if (data.hierarchy.parentName) nameParts.push(data.hierarchy.parentName);
    if (nameParts.length > 0) {
      const hierarchySpan = document.createElement("span");
      hierarchySpan.className = "category-hierarchy";
      hierarchySpan.textContent = nameParts.join(" › ");
      titleRow.appendChild(hierarchySpan);
    }
  }

  nameArea.appendChild(titleRow);

  // 進捗バーと進捗数値を横並びにするラッパー
  const progressRow = document.createElement("div");
  progressRow.className = "category-progress-row";

  const progressBar = document.createElement("div");
  progressBar.className = "category-progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "category-progress-fill";
  progressBar.appendChild(progressFill);
  const progressFillInProgress = document.createElement("div");
  progressFillInProgress.className = "category-progress-fill-inprogress";
  progressBar.appendChild(progressFillInProgress);

  const statsSpan = document.createElement("span");
  statsSpan.className = "category-stats";

  progressRow.appendChild(progressBar);
  progressRow.appendChild(statsSpan);

  nameArea.appendChild(progressRow);

  // 参考学年バッジ（referenceGrade が設定されている場合のみ表示、学年別ビューでは非表示）
  if (data.referenceGrade && data.showReferenceGrade) {
    const gradeSpan = document.createElement("span");
    gradeSpan.className = "category-grade";
    gradeSpan.textContent = data.referenceGrade;
    const gradeClass = gradeColorClass(data.referenceGrade);
    if (gradeClass) gradeSpan.classList.add(gradeClass);
    titleRow.appendChild(gradeSpan);
  }

  // 左列に statusSpan・nameArea をまとめる
  const leftCol = document.createElement("div");
  leftCol.className = "category-item-left";
  leftCol.appendChild(statusSpan);
  leftCol.appendChild(nameArea);
  item.appendChild(leftCol);

  // 説明・例文は右列に常時表示
  if (data.description !== undefined || data.example !== undefined) {
    item.classList.add("category-item-has-info");
    const rightCol = document.createElement("div");
    rightCol.className = "category-item-right";
    if (data.description) {
      const descSpan = document.createElement("span");
      descSpan.className = "category-item-description";
      descSpan.textContent = data.description;
      rightCol.appendChild(descSpan);
    }
    if (data.example !== undefined) {
      const exampleSpan = document.createElement("span");
      exampleSpan.className = "category-example";
      renderBacktickText(exampleSpan, data.example);
      rightCol.appendChild(exampleSpan);
    }
    item.appendChild(rightCol);
  }

  return item;
}
