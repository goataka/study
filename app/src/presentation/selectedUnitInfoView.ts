/**
 * 選択中の単元情報パネル（#selectedUnitInfo）の DOM 構築ヘルパー。
 *
 * QuizApp.updateSelectedUnitInfo の 2 ブランチ（教科タブからの単元選択 /
 * 総合タブからの単元選択）で重複していた DOM 組み立て処理を、純粋なビルダー関数として切り出したもの。
 */

import { gradeColorClass, calcDualProgressPct, renderBacktickText } from "./uiHelpers";

/**
 * 単元詳細表示に必要なデータ。
 */
export interface SelectedUnitInfoData {
  /** 単元名（または親カテゴリ・トップカテゴリ名） */
  name: string;
  /** トップカテゴリ名（パンくずに使用） */
  topCatName?: string;
  /** 親カテゴリ名（パンくずに使用） */
  parentCatName?: string;
  /** 学習指導要領上の学年（"小1" など） */
  grade?: string;
  /** 例文（バッククォート付きテキスト） */
  example?: string;
  /** カテゴリの説明文 */
  description?: string;
  /** 習得済み問題数 */
  mastered: number;
  /** 学習中（未習得かつ過去に出題された）問題数 */
  inProgressCount: number;
  /** 単元内の総問題数 */
  total: number;
}

/**
 * 単元詳細表示を組み立てる（タイトル・説明・例文・進捗バーを含む完全な body 要素）。
 */
export function buildSelectedUnitInfoBody(data: SelectedUnitInfoData): HTMLElement {
  const body = document.createElement("div");
  body.className = "selected-unit-info-body";

  const catParts: string[] = [];
  if (data.topCatName) catParts.push(data.topCatName);
  if (data.parentCatName) catParts.push(data.parentCatName);

  // 行1: タイトル（左）/ 説明（右）
  body.appendChild(buildHeaderRow(data.name, data.description));

  // 行2: カテゴリ+学年（左）/ 例文（右）
  const hasCatOrGrade = catParts.length > 0 || !!data.grade;
  if (hasCatOrGrade || data.example !== undefined) {
    body.appendChild(buildDescRow(catParts, data.grade, data.example));
  }

  // 行3: ステータスバー（全幅）
  body.appendChild(buildProgressRow(data.mastered, data.inProgressCount, data.total));

  return body;
}

/**
 * カテゴリ・トップカテゴリ選択時用の簡易表示（タイトルのみ）を組み立てる。
 */
export function buildSelectedUnitInfoSimpleBody(name: string): HTMLElement {
  const body = document.createElement("div");
  body.className = "selected-unit-info-body";
  const nameSpan = document.createElement("span");
  nameSpan.className = "selected-unit-info-name";
  nameSpan.textContent = name;
  body.appendChild(nameSpan);
  return body;
}

/**
 * 「✕ 閉じる」ボタンを生成する。
 *
 * @param ariaLabel aria-label に設定するテキスト
 * @param onClick クリック時のコールバック
 */
export function buildSelectedUnitCloseButton(ariaLabel: string, onClick: () => void): HTMLElement {
  const closeBtn = document.createElement("button");
  closeBtn.className = "selected-unit-close-btn";
  closeBtn.type = "button";
  closeBtn.textContent = "✕";
  closeBtn.title = "閉じる";
  closeBtn.setAttribute("aria-label", ariaLabel);
  closeBtn.addEventListener("click", onClick);
  return closeBtn;
}

function buildHeaderRow(name: string, description: string | undefined): HTMLElement {
  const headerRow = document.createElement("div");
  headerRow.className = "selected-unit-info-header-row";

  const headerLeft = document.createElement("div");
  headerLeft.className = "selected-unit-info-header-left";
  const nameSpan = document.createElement("span");
  nameSpan.className = "selected-unit-info-name";
  nameSpan.textContent = name;
  headerLeft.appendChild(nameSpan);
  headerRow.appendChild(headerLeft);

  if (description !== undefined) {
    const headerRight = document.createElement("div");
    headerRight.className = "selected-unit-info-header-right";
    const descDiv = document.createElement("div");
    descDiv.className = "selected-unit-info-desc-right selected-unit-info-desc";
    descDiv.textContent = description;
    headerRight.appendChild(descDiv);
    headerRow.appendChild(headerRight);
  }
  return headerRow;
}

function buildDescRow(catParts: string[], grade: string | undefined, example: string | undefined): HTMLElement {
  const descRow = document.createElement("div");
  descRow.className = "selected-unit-info-desc-row";

  const descLeft = document.createElement("div");
  descLeft.className = "selected-unit-info-desc-left";
  if (catParts.length > 0) {
    const catLabel = document.createElement("span");
    catLabel.className = "selected-unit-info-category";
    catLabel.textContent = catParts.join(" › ");
    descLeft.appendChild(catLabel);
  }
  if (grade) {
    const gradeSpan = document.createElement("span");
    gradeSpan.className = "category-grade";
    const gradeClass = gradeColorClass(grade);
    if (gradeClass) gradeSpan.classList.add(gradeClass);
    gradeSpan.textContent = grade;
    descLeft.appendChild(gradeSpan);
  }
  descRow.appendChild(descLeft);

  if (example !== undefined) {
    const descRight = document.createElement("div");
    descRight.className = "selected-unit-info-desc-right selected-unit-info-example";
    renderBacktickText(descRight, example);
    descRow.appendChild(descRight);
  }
  return descRow;
}

function buildProgressRow(mastered: number, inProgressCount: number, total: number): HTMLElement {
  const { masteredPct, inProgressPct } = calcDualProgressPct(mastered, inProgressCount, total);
  const progressRow = document.createElement("div");
  progressRow.className = "selected-unit-progress-row";
  const progressBar = document.createElement("div");
  progressBar.className = "selected-unit-progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "selected-unit-progress-fill";
  progressFill.style.width = `${masteredPct}%`;
  progressBar.appendChild(progressFill);
  const progressFillInProgress = document.createElement("div");
  progressFillInProgress.className = "selected-unit-progress-fill-inprogress";
  progressFillInProgress.style.width = `${inProgressPct}%`;
  progressBar.appendChild(progressFillInProgress);
  const progressLabel = document.createElement("span");
  progressLabel.className = "selected-unit-progress-label";
  progressLabel.textContent = inProgressCount > 0 ? `${mastered}(${inProgressCount})/${total}` : `${mastered}/${total}`;
  progressRow.appendChild(progressBar);
  progressRow.appendChild(progressLabel);
  return progressRow;
}
