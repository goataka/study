/**
 * 進度タブ詳細パネルのマトリクスビュー描画を担う関数。
 *
 * QuizApp から肥大化していた `renderProgressDetailMatrix` を切り出したもの。
 * `useCase` 等の依存はコンテキストオブジェクトとして受け取る。
 */

import type { QuizUseCase } from "../application/quizUseCase";

export interface ProgressMatrixContext {
  /** 描画対象の教科 ID */
  subject: string;
  /** ユースケース（カテゴリ・進捗の取得に利用する） */
  useCase: QuizUseCase;
  /** 縦横を入れ替え表示するか */
  transposed: boolean;
  /** 縦横切り替えボタン押下時のコールバック（state を反転して再描画する） */
  onToggleTranspose: () => void;
  /** 単元ブロック押下時のコールバック */
  onSelectUnit: (subject: string, categoryId: string, categoryName: string) => void;
}

type ColDef = { parentId: string; parentName: string; topId: string; topName: string };

/**
 * 進度詳細マトリクスビューを `container` に描画する。
 * 既存単元を「学年 × 親カテゴリ」の表で並べ、`transposed` フラグで縦横を切り替える。
 */
export function renderProgressDetailMatrix(container: HTMLElement, ctx: ProgressMatrixContext): void {
  const { subject, useCase } = ctx;
  const grades = useCase.getUniqueGradesForSubject(subject);

  // 全カテゴリを収集し、トップ/親カテゴリ情報を付与する
  const allCats = useCase.getCategoriesForSubject(subject);

  // 列定義: 親カテゴリ単位で展開（トップカテゴリ情報も保持）
  const parentCatsMap = useCase.getParentCategoriesForSubject(subject);
  const colDefs: ColDef[] = [];
  const seenParents = new Set<string>();

  // トップカテゴリの順序で親カテゴリを列挙
  const topCatsMap = useCase.getTopCategoriesForSubject(subject);
  for (const [topId, topName] of Object.entries(topCatsMap)) {
    const parentCatsForTop = useCase.getParentCategoriesForTop(subject, topId);
    for (const [parentId, parentName] of Object.entries(parentCatsForTop)) {
      if (!seenParents.has(parentId)) {
        seenParents.add(parentId);
        colDefs.push({ parentId, parentName, topId, topName });
      }
    }
    // 親カテゴリなしでこのトップに属する単元があれば、トップ直属列を追加
    const hasDirect = Object.keys(allCats).some((catId) => {
      const topInfo = useCase.getTopCategoryForUnit(subject, catId);
      const parentInfo = useCase.getParentCategoryForUnit(subject, catId);
      return topInfo?.id === topId && !parentInfo;
    });
    if (hasDirect && !seenParents.has(`__top_direct_${topId}__`)) {
      seenParents.add(`__top_direct_${topId}__`);
      colDefs.push({ parentId: `__top_direct_${topId}__`, parentName: topName, topId, topName });
    }
  }

  // トップカテゴリなしの単元を「その他」列として追加
  const noTopCats = Object.keys(allCats).filter((catId) => !useCase.getTopCategoryForUnit(subject, catId));
  if (noTopCats.length > 0) {
    colDefs.push({ parentId: "__other__", parentName: "その他", topId: "__other__", topName: "その他" });
  }

  // 親カテゴリが設定されているが列定義に含まれていない場合、直接追加
  for (const [parentId, parentName] of Object.entries(parentCatsMap)) {
    if (!seenParents.has(parentId)) {
      seenParents.add(parentId);
      colDefs.push({ parentId, parentName, topId: "__other__", topName: "その他" });
    }
  }

  if (grades.length === 0 || colDefs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "progress-block-group";
    empty.textContent = "単元がありません";
    container.appendChild(empty);
    return;
  }

  // スクロール可能なラッパー
  const wrapper = document.createElement("div");
  wrapper.style.overflowX = "auto";
  wrapper.style.overflowY = "auto";
  wrapper.style.flex = "1";
  wrapper.style.minHeight = "0";

  const table = document.createElement("table");
  table.className = "progress-matrix-table progress-matrix-table-units";

  const buildMatrixCategoryLabel = (col: ColDef): string => {
    if (col.topId === "__other__" || col.topName === col.parentName) {
      return col.parentName;
    }
    return `${col.topName} / ${col.parentName}`;
  };

  // ヘッダー
  const thead = document.createElement("thead");

  const topHeaderRow = document.createElement("tr");
  const cornerTh = document.createElement("th");
  cornerTh.className = "progress-matrix-corner-toggle";
  const cornerBtn = document.createElement("button");
  cornerBtn.type = "button";
  cornerBtn.className = "progress-matrix-corner-toggle-btn";
  cornerBtn.textContent = "学年 ⇄ カテゴリ";
  cornerBtn.setAttribute("aria-label", "学年とカテゴリの縦横を切り替える");
  cornerBtn.setAttribute("aria-pressed", String(ctx.transposed));
  cornerBtn.addEventListener("click", () => ctx.onToggleTranspose());
  cornerTh.appendChild(cornerBtn);
  if (!ctx.transposed) {
    cornerTh.rowSpan = 2;
    topHeaderRow.appendChild(cornerTh);
    const topGroups: { topId: string; topName: string; count: number }[] = [];
    for (const col of colDefs) {
      const last = topGroups[topGroups.length - 1];
      if (last && last.topId === col.topId) {
        last.count++;
      } else {
        topGroups.push({ topId: col.topId, topName: col.topName, count: 1 });
      }
    }
    for (const grp of topGroups) {
      const th = document.createElement("th");
      th.textContent = grp.topName;
      th.colSpan = grp.count;
      th.className = "progress-matrix-top-header";
      topHeaderRow.appendChild(th);
    }
    thead.appendChild(topHeaderRow);

    const parentHeaderRow = document.createElement("tr");
    for (const col of colDefs) {
      const th = document.createElement("th");
      th.textContent = buildMatrixCategoryLabel(col);
      th.className = "progress-matrix-parent-header";
      parentHeaderRow.appendChild(th);
    }
    thead.appendChild(parentHeaderRow);
  } else {
    topHeaderRow.appendChild(cornerTh);
    for (const grade of grades) {
      const th = document.createElement("th");
      th.textContent = grade;
      th.className = "progress-matrix-parent-header";
      topHeaderRow.appendChild(th);
    }
    thead.appendChild(topHeaderRow);
  }
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const appendUnitBlock = (inner: HTMLElement, catId: string, catName: string): void => {
    const { mastered, total } = useCase.getMasteredCountForCategory(subject, catId);
    const inProgress = useCase.getInProgressCount({ subject, category: catId });
    const block = document.createElement("button");
    block.type = "button";
    block.className = "progress-block progress-block-sm";
    block.textContent = catName;
    block.title = catName;
    if (mastered > 0 && mastered === total) {
      block.classList.add("mastered");
    } else if (inProgress > 0 || mastered > 0) {
      block.classList.add("in-progress");
    }
    block.addEventListener("click", () => {
      ctx.onSelectUnit(subject, catId, catName);
    });
    inner.appendChild(block);
  };

  const isUnitInColumn = (catId: string, col: ColDef): boolean => {
    const topInfo = useCase.getTopCategoryForUnit(subject, catId);
    const parentInfo = useCase.getParentCategoryForUnit(subject, catId);
    if (col.parentId === "__other__") return !topInfo;
    if (col.parentId.startsWith("__top_direct_")) return topInfo?.id === col.topId && !parentInfo;
    return parentInfo?.id === col.parentId;
  };

  if (!ctx.transposed) {
    // 学年ごとのカテゴリ一覧は (grade, col) セルごとに使うため、ループ外で一度だけ取得する
    const gradeCatsMap = new Map<string, Record<string, string>>();
    for (const grade of grades) {
      gradeCatsMap.set(grade, useCase.getCategoriesForGrade(subject, grade));
    }
    for (const grade of grades) {
      const tr = document.createElement("tr");
      const gradeCell = document.createElement("th");
      gradeCell.scope = "row";
      gradeCell.textContent = grade;
      tr.appendChild(gradeCell);
      const gradeCats = gradeCatsMap.get(grade) ?? {};
      for (const col of colDefs) {
        const td = document.createElement("td");
        td.className = "progress-matrix-cell-units";
        const inner = document.createElement("div");
        inner.className = "progress-matrix-cell-units-inner";
        for (const [catId, catName] of Object.entries(gradeCats)) {
          if (isUnitInColumn(catId, col)) appendUnitBlock(inner, catId, catName);
        }
        td.appendChild(inner);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  } else {
    // 転置時もループ外で学年→カテゴリ一覧を一度だけ取得する
    const gradeCatsMap = new Map<string, Record<string, string>>();
    for (const grade of grades) {
      gradeCatsMap.set(grade, useCase.getCategoriesForGrade(subject, grade));
    }
    for (const col of colDefs) {
      const tr = document.createElement("tr");
      const parentCell = document.createElement("th");
      parentCell.scope = "row";
      parentCell.textContent = buildMatrixCategoryLabel(col);
      tr.appendChild(parentCell);
      for (const grade of grades) {
        const td = document.createElement("td");
        td.className = "progress-matrix-cell-units";
        const gradeCats = gradeCatsMap.get(grade) ?? {};
        const inner = document.createElement("div");
        inner.className = "progress-matrix-cell-units-inner";
        for (const [catId, catName] of Object.entries(gradeCats)) {
          if (isUnitInColumn(catId, col)) appendUnitBlock(inner, catId, catName);
        }
        td.appendChild(inner);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
  table.appendChild(tbody);

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}
