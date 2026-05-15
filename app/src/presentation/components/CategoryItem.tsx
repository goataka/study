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
  /** 学習ステージ（0=未学習, 1=学習済, 2=復習済, 3=修了済）。 */
  stage?: number;
  /** 学習状態クラス（learned / studying / unlearned）。 */
  statusKind?: "learned" | "studying" | "unlearned";
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

const STAGE_BADGE_MAP: Readonly<Record<number, { emoji: string; sizeClass: string; label: string }>> = {
  1: { emoji: "🎖️", sizeClass: "text-base", label: "学習済ステージ" },
  2: { emoji: "🏆", sizeClass: "text-lg", label: "復習済ステージ" },
  3: { emoji: "👑", sizeClass: "text-xl", label: "修了済ステージ" },
} as const;

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
    stage,
    statusKind = "unlearned",
    progressFillPercent = 0,
    progressInProgressPercent = 0,
    statsText = "",
    onActivate,
    active = false,
  } = props;

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
  const isProgressDone = progressFillPercent === 100 && progressInProgressPercent === 0;
  const badge = stage !== undefined ? STAGE_BADGE_MAP[stage] : undefined;

  return (
    <div
      className={[
        "category-item",
        // ベーススタイル
        "grid grid-cols-1 rounded-md cursor-pointer select-none transition-[background] duration-150",
        // has-info: 1:2 グリッド（解説・例文あり）
        "[&.category-item-has-info]:grid-cols-[1fr_2fr]",
        // hover・active 状態
        "hover:bg-[#e8f0fe]",
        "[&.active]:bg-[#0366d6] [&.active]:text-white",
        // group: 子要素で group-[.active]: variant を使用
        "group",
        description !== undefined || example !== undefined ? "category-item-has-info" : "",
        statusKind,
        active ? "active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-subject={subject}
      data-category={categoryId}
      data-parent-category={parentCatId}
      data-top-category={topCatId}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      <div className="category-item-left flex items-center gap-2 pl-[10px] pr-[20px] py-[7px] min-w-0">
        <span className="category-status text-sm shrink-0 leading-none" aria-hidden="true">
          {statusIcon}
        </span>
        <div className="category-name-area flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="category-title-row flex items-baseline gap-1.5 min-w-0">
            <span className="category-name text-lg font-semibold text-[#24292e] group-[.active]:text-white">
              {categoryName}
            </span>
            {badge && (
              <span
                className={`category-stage-badge shrink-0 leading-none ${badge.sizeClass}`}
                aria-label={badge.label}
              >
                {badge.emoji}
              </span>
            )}
            {hierarchyText && (
              <span className="category-hierarchy text-xs text-[#586069] bg-[#f0f0f0] px-1.5 py-px rounded-[10px] whitespace-nowrap shrink min-w-0 max-w-[45%] overflow-hidden text-ellipsis ml-auto">
                {hierarchyText}
              </span>
            )}
            {referenceGrade && showReferenceGrade && (
              <span
                className={[
                  gradeClass ? `category-grade ${gradeClass}` : "category-grade",
                  "text-xs whitespace-nowrap px-[5px] py-px rounded-[10px] shrink-0 ml-auto",
                  "[&.grade-elementary]:text-[#c0392b] [&.grade-elementary]:bg-[#fde8e8]",
                  "[&.grade-middle]:text-[#0366d6] [&.grade-middle]:bg-[#e8f0fe]",
                  "[&.grade-high]:text-[#1a7f37] [&.grade-high]:bg-[#e8f8f0]",
                  "group-[.active]:bg-white/25 group-[.active]:text-white",
                ].join(" ")}
              >
                {referenceGrade}
              </span>
            )}
          </div>
          <div className="category-progress-row flex items-center gap-1.5">
            <div className="category-progress-bar flex-1 h-1 bg-[#e1e4e8] rounded-sm overflow-hidden flex">
              <div
                className={[
                  "category-progress-fill h-full bg-[#28a745] rounded-sm shrink-0",
                  isProgressDone ? "progress-fill-done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ width: `${progressFillPercent}%` }}
              />
              <div
                className="category-progress-fill-inprogress h-full bg-[#f0a800] rounded-sm shrink-0"
                style={{ width: `${progressInProgressPercent}%` }}
              />
            </div>
            <span className="category-stats text-[13px] text-[#586069] whitespace-nowrap shrink-0 group-[.active]:text-white/85">
              {statsText}
            </span>
          </div>
        </div>
      </div>
      {(description !== undefined || example !== undefined) && (
        <div className="category-item-right flex flex-col gap-[3px] justify-center px-[10px] py-[7px] pl-2 border-l border-[rgba(0,0,0,0.06)] min-w-0 overflow-hidden group-[.active]:border-white/20">
          {description && (
            <span className="category-item-description text-[15px] text-[#586069] leading-[1.4] break-words group-[.active]:text-white/80">
              {description}
            </span>
          )}
          {/* category-example の ::before { content: "例）" } は 04-category-groups.css に残置 */}
          {example !== undefined && (
            <span className="category-example text-base text-[#24292e] self-end text-right break-words group-[.active]:text-white/80">
              {backtickSegments(example)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
