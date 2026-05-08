/**
 * 進度タブ詳細パネルの「学年別」「カテゴリ別」ビュー描画関数群。
 *
 * QuizApp から肥大化していたメソッドを切り出したもの。
 * `useCase` 等の依存はコンテキストオブジェクトとして受け取る。
 */

import type { QuizUseCase } from "../application/quizUseCase";

export interface ProgressBlockContext {
  /** 描画対象の教科 ID */
  subject: string;
  /** ユースケース（カテゴリ・進捗の取得に利用する） */
  useCase: QuizUseCase;
  /** 学習済み単元を非表示にするか */
  hideLearned: boolean;
  /** 単元ブロック押下時のコールバック */
  onSelectUnit: (subject: string, categoryId: string, categoryName: string) => void;
}

type CategoryProgress = {
  mastered: number;
  total: number;
  inProgress: number;
};

function buildCategoryProgressMap(useCase: QuizUseCase, subject: string): Map<string, CategoryProgress> {
  const categoryProgressMap = new Map<string, CategoryProgress>();
  for (const catId of Object.keys(useCase.getCategoriesForSubject(subject))) {
    const { mastered, total } = useCase.getMasteredCountForCategory(subject, catId);
    const inProgress = useCase.getInProgressCount({ subject, category: catId });
    categoryProgressMap.set(catId, { mastered, total, inProgress });
  }
  return categoryProgressMap;
}

function isVisibleCategory(ctx: ProgressBlockContext, progress: CategoryProgress | undefined): boolean {
  if (!progress) return false;
  return !ctx.hideLearned || progress.total === 0 || progress.mastered !== progress.total;
}

/**
 * ■□ブロック列のグループ要素を生成して返す。
 * @param groupName グループ名（学年名・親カテゴリ名など）
 * @param mastered  習得済み単元数
 * @param total     全単元数
 * @param catEntries [catId, catName] の配列
 */
function buildProgressBlockGroup(
  ctx: ProgressBlockContext,
  categoryProgressMap: Map<string, CategoryProgress>,
  groupName: string,
  mastered: number,
  total: number,
  catEntries: [string, string][],
): HTMLElement {
  const { subject } = ctx;
  const group = document.createElement("div");
  group.className = "progress-block-group";

  const header = document.createElement("div");
  header.className = "progress-block-group-header";

  const nameSpan = document.createElement("span");
  nameSpan.className = "progress-block-group-name";
  nameSpan.textContent = groupName;
  header.appendChild(nameSpan);

  const statsSpan = document.createElement("span");
  statsSpan.className = "progress-block-group-stats";
  statsSpan.textContent = `(${mastered}/${total})`;
  header.appendChild(statsSpan);

  group.appendChild(header);

  const blockSeq = document.createElement("div");
  blockSeq.className = "progress-block-sequence";

  for (const [catId, catName] of catEntries) {
    const progress = categoryProgressMap.get(catId);
    if (!isVisibleCategory(ctx, progress)) continue;
    const { mastered: catMastered, total: catTotal, inProgress } = progress!;

    const block = document.createElement("button");
    block.type = "button";
    block.className = "progress-block";
    block.setAttribute("title", catName);
    block.setAttribute("aria-label", catName);
    block.textContent = catName;

    if (catMastered > 0 && catMastered === catTotal) {
      block.classList.add("mastered");
    } else if (inProgress > 0 || catMastered > 0) {
      block.classList.add("in-progress");
    }

    block.addEventListener("click", () => {
      ctx.onSelectUnit(subject, catId, catName);
    });

    blockSeq.appendChild(block);
  }

  group.appendChild(blockSeq);
  return group;
}

/** カテゴリ ID 一覧から「全問題習得済み」となった単元数を数える。 */
function countMastered(categoryProgressMap: Map<string, CategoryProgress>, catIds: string[]): number {
  let n = 0;
  for (const catId of catIds) {
    const { mastered, total } = categoryProgressMap.get(catId) ?? { mastered: 0, total: 0 };
    if (total > 0 && mastered === total) n++;
  }
  return n;
}

/**
 * 進度詳細の学年別ビューを描画する。
 * 学年グループ（小学1年, 中学1年 等）ごとに ■□ブロック列を表示する。
 */
export function renderProgressDetailByGrade(container: HTMLElement, ctx: ProgressBlockContext): void {
  const { subject, useCase } = ctx;
  const grades = useCase.getUniqueGradesForSubject(subject);
  const categoryProgressMap = buildCategoryProgressMap(useCase, subject);

  for (const grade of grades) {
    const cats = useCase.getCategoriesForGrade(subject, grade);
    const catEntries = Object.entries(cats).filter(([catId]) => isVisibleCategory(ctx, categoryProgressMap.get(catId)));
    if (catEntries.length === 0) continue;

    const masteredCount = countMastered(
      categoryProgressMap,
      catEntries.map(([id]) => id),
    );
    container.appendChild(
      buildProgressBlockGroup(ctx, categoryProgressMap, grade, masteredCount, catEntries.length, catEntries),
    );
  }

  // 学年未設定カテゴリ
  const uncategorized = useCase.getCategoriesWithoutGrade(subject);
  const uncatEntries = Object.entries(uncategorized).filter(([catId]) =>
    isVisibleCategory(ctx, categoryProgressMap.get(catId)),
  );
  if (uncatEntries.length > 0) {
    const masteredCount = countMastered(
      categoryProgressMap,
      uncatEntries.map(([id]) => id),
    );
    container.appendChild(
      buildProgressBlockGroup(ctx, categoryProgressMap, "学年未設定", masteredCount, uncatEntries.length, uncatEntries),
    );
  }
}

/**
 * 進度詳細のカテゴリ別ビューを描画する。
 * トップカテゴリ > 親カテゴリ単位で単元名ブロック列を表示する。
 */
export function renderProgressDetailByCategory(container: HTMLElement, ctx: ProgressBlockContext): void {
  const { subject, useCase } = ctx;
  const allCats = useCase.getCategoriesForSubject(subject);
  const catEntries = Object.entries(allCats);
  const categoryProgressMap = buildCategoryProgressMap(useCase, subject);

  if (catEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "progress-block-group";
    empty.textContent = "単元がありません";
    container.appendChild(empty);
    return;
  }

  // トップカテゴリ → 親カテゴリ → 単元のツリー構造を構築する
  const topMap = new Map<
    string,
    { name: string; parentMap: Map<string, { name: string; categories: [string, string][] }> }
  >();
  const noTopParentMap = new Map<string, { name: string; categories: [string, string][] }>();
  const standaloneCats: [string, string][] = [];

  for (const [catId, catName] of catEntries) {
    const topInfo = useCase.getTopCategoryForUnit(subject, catId);
    const parentInfo = useCase.getParentCategoryForUnit(subject, catId);

    if (topInfo) {
      if (!topMap.has(topInfo.id)) {
        topMap.set(topInfo.id, { name: topInfo.name, parentMap: new Map() });
      }
      const topEntry = topMap.get(topInfo.id)!;
      const parentKey = parentInfo?.id ?? "__none__";
      const parentName = parentInfo?.name ?? topInfo.name;
      if (!topEntry.parentMap.has(parentKey)) {
        topEntry.parentMap.set(parentKey, { name: parentName, categories: [] });
      }
      topEntry.parentMap.get(parentKey)!.categories.push([catId, catName]);
    } else if (parentInfo) {
      if (!noTopParentMap.has(parentInfo.id)) {
        noTopParentMap.set(parentInfo.id, { name: parentInfo.name, categories: [] });
      }
      noTopParentMap.get(parentInfo.id)!.categories.push([catId, catName]);
    } else {
      standaloneCats.push([catId, catName]);
    }
  }

  // トップカテゴリグループを描画する
  for (const [, { name: topName, parentMap }] of topMap) {
    const topHeader = document.createElement("div");
    topHeader.className = "progress-top-category-header";
    topHeader.textContent = topName;
    container.appendChild(topHeader);

    for (const [, { name: parentName, categories }] of parentMap) {
      const visibleCategories = categories.filter(([catId]) => isVisibleCategory(ctx, categoryProgressMap.get(catId)));
      if (visibleCategories.length === 0) continue;
      const masteredCount = countMastered(
        categoryProgressMap,
        visibleCategories.map(([id]) => id),
      );
      container.appendChild(
        buildProgressBlockGroup(
          ctx,
          categoryProgressMap,
          parentName,
          masteredCount,
          visibleCategories.length,
          visibleCategories,
        ),
      );
    }
  }

  // トップカテゴリのない親カテゴリグループを描画する
  for (const [, { name, categories }] of noTopParentMap) {
    const visibleCategories = categories.filter(([catId]) => isVisibleCategory(ctx, categoryProgressMap.get(catId)));
    if (visibleCategories.length === 0) continue;
    const masteredCount = countMastered(
      categoryProgressMap,
      visibleCategories.map(([id]) => id),
    );
    container.appendChild(
      buildProgressBlockGroup(
        ctx,
        categoryProgressMap,
        name,
        masteredCount,
        visibleCategories.length,
        visibleCategories,
      ),
    );
  }

  // 親カテゴリのないスタンドアロン単元をまとめて表示する
  const visibleStandaloneCats = standaloneCats.filter(([catId]) =>
    isVisibleCategory(ctx, categoryProgressMap.get(catId)),
  );
  if (visibleStandaloneCats.length > 0) {
    const groupName = topMap.size + noTopParentMap.size > 0 ? "その他" : "すべての単元";
    const masteredCount = countMastered(
      categoryProgressMap,
      visibleStandaloneCats.map(([id]) => id),
    );
    container.appendChild(
      buildProgressBlockGroup(
        ctx,
        categoryProgressMap,
        groupName,
        masteredCount,
        visibleStandaloneCats.length,
        visibleStandaloneCats,
      ),
    );
  }
}
