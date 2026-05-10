/**
 * 単元一覧の 1 件分のカテゴリアイテムを表す React コンポーネント。
 *
 * 命令的 DOM ビルダー `presentation/categoryItemView.ts` の `buildCategoryItem` と
 * 等価な DOM 構造（同じクラス名・dataset 属性・aria 属性）を React で生成する。
 *
 * 進捗バー幅・進捗テキスト・ステータスアイコンは props で受け取るため、
 * 本コンポーネントは表示専用の純粋関数。クリック/キーボードハンドラは props 経由で
 * 親から注入する（既存の DOM 委譲モデルとの互換のため、`onActivate` を任意とする）。
 */

import * as React from "react";
import { gradeColorClass, parseBacktickText } from "../uiHelpers";

export interface CategoryItemProps {
  subject: string;
  categoryId: string;
  categoryName: string;
  parentCatId?: string;
  topCatId?: string;
  /** カテゴリ階層情報（学年別ビューでのみ使用）。 */
  hierarchy?: { topName?: string; parentName?: string };
  referenceGrade?: string;
  /** referenceGrade を表示するかどうか（学年別ビューでは非表示）。 */
  showReferenceGrade: boolean;
  description?: string;
  example?: string;
  /** ステータスアイコン文字（デフォルト ⬜）。 */
  statusIcon?: string;
  /** 進捗（学習済み）バーの充填率（0〜100）。 */
  progressFillPercent?: number;
  /** 進行中バーの充填率（0〜100）。 */
  progressInProgressPercent?: number;
  /** 進捗の数値テキスト（例: "3/10"）。 */
  statsText?: string;
  /** クリック / Enter / Space で発火するアクティベーション。 */
  onActivate?: () => void;
  /** active 状態（選択中）。 */
  active?: boolean;
}

/**
 * バッククォート区切りテキストを React ノード列に変換する。
 * `parseBacktickText` の結果（プレーン部分とコード部分のセグメント列）を JSX 化する。
 */
function backtickSegments(text: string): React.ReactNode[] {
  return parseBacktickText(text).map((seg, i) =>
    seg.type === "code" ? <code key={i}>{seg.text}</code> : <React.Fragment key={i}>{seg.text}</React.Fragment>,
  );
}

export function CategoryItem(props: CategoryItemProps): React.JSX.Element {
  const {
    subject,
    categoryId,
    categoryName,
    parentCatId,
    topCatId,
    hierarchy,
    referenceGrade,
    showReferenceGrade,
    description,
    example,
    statusIcon = "⬜",
    progressFillPercent = 0,
    progressInProgressPercent = 0,
    statsText = "",
    onActivate,
    active = false,
  } = props;

  const classes = ["category-item"];
  if (description !== undefined || example !== undefined) classes.push("category-item-has-info");
  if (active) classes.push("active");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!onActivate) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };

  const hierarchyText = hierarchy
    ? [hierarchy.topName, hierarchy.parentName].filter((s): s is string => !!s).join(" › ")
    : "";

  const gradeClass = referenceGrade && showReferenceGrade ? gradeColorClass(referenceGrade) : null;

  return (
    <div
      className={classes.join(" ")}
      data-subject={subject}
      data-category={categoryId}
      data-parent-category={parentCatId}
      data-top-category={topCatId}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      <div className="category-item-left">
        <span className="category-status" aria-hidden="true">
          {statusIcon}
        </span>
        <div className="category-name-area">
          <div className="category-title-row">
            <span className="category-name">{categoryName}</span>
            {hierarchyText && <span className="category-hierarchy">{hierarchyText}</span>}
            {referenceGrade && showReferenceGrade && (
              <span className={gradeClass ? `category-grade ${gradeClass}` : "category-grade"}>{referenceGrade}</span>
            )}
          </div>
          <div className="category-progress-row">
            <div className="category-progress-bar">
              <div className="category-progress-fill" style={{ width: `${progressFillPercent}%` }} />
              <div className="category-progress-fill-inprogress" style={{ width: `${progressInProgressPercent}%` }} />
            </div>
            <span className="category-stats">{statsText}</span>
          </div>
        </div>
      </div>
      {(description !== undefined || example !== undefined) && (
        <div className="category-item-right">
          {description && <span className="category-item-description">{description}</span>}
          {example !== undefined && <span className="category-example">{backtickSegments(example)}</span>}
        </div>
      )}
    </div>
  );
}
