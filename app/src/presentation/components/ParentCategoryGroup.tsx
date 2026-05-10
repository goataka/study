/**
 * 親カテゴリグループ（折りたたみ可能なセクション）の React コンポーネント。
 *
 * 命令的 DOM ビルダー `presentation/quizApp/categoryItemBuilder.ts` の
 * `buildParentCategoryGroup` を参考にしつつ、アクセシビリティを考慮して
 * 構造を整理した版。`<CategoryItem>` を子要素として束ねる。
 *
 * アクセシビリティ:
 * - ヘッダー行 `.category-group-header` は presentational な `<div>`（role なし）。
 * - その内部に **兄弟関係** の 2 つの `<button>` を配置:
 *   - `.category-group-toggle`: 折りたたみアイコン（`onToggle`）
 *   - `.category-group-header-action`: タイトル選択ボタン（`onHeaderActivate`）
 * - ネストした interactive 要素を避けることで、スクリーンリーダーや
 *   キーボード操作の解釈が安定する。
 *
 * Enter / Space は実 `<button>` がネイティブに処理するため、独自ハンドラ不要。
 */

import * as React from "react";
import { CategoryItem, type CategoryItemProps } from "./CategoryItem";

export interface ParentCategoryGroupProps {
  subject: string;
  parentCatId: string;
  parentCatName: string;
  topCatId?: string;
  /** 折りたたみ状態。 */
  collapsed: boolean;
  /** 全単元学習済みバッジの表示テキスト（例: "✅"）。空文字なら表示しない。 */
  learnedBadge?: string;
  /** ヘッダー（タイトル行）のアクティベート（クリック / Enter / Space）。 */
  onHeaderActivate?: () => void;
  /** 折りたたみトグルアイコンクリック。 */
  onToggle?: () => void;
  /** 子の単元アイテム（順序維持）。 */
  items: CategoryItemProps[];
}

export function ParentCategoryGroup(props: ParentCategoryGroupProps): React.JSX.Element {
  const {
    subject: _subject,
    parentCatId,
    parentCatName,
    topCatId,
    collapsed,
    learnedBadge = "",
    onHeaderActivate,
    onToggle,
    items,
  } = props;

  return (
    <div
      className={[
        "category-group flex flex-col gap-0.5",
        // collapsed 状態で子 category-item を非表示（CSS .category-group.collapsed .category-item で制御）
        collapsed ? "collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-parent-category={parentCatId}
      data-top-category={topCatId}
    >
      <div
        className={[
          "category-group-header",
          "flex items-center gap-1 text-base font-semibold text-[#586069]",
          "uppercase tracking-[0.5px] px-[10px] pt-2 pb-1 mt-1 cursor-pointer select-none rounded",
          "transition-[background] duration-150",
          "hover:bg-[#f0f4f8]",
          "[&.active]:bg-[#e8f0f9] [&.active]:text-[#0366d6]",
        ].join(" ")}
        data-parent-category={parentCatId}
        onClick={() => onHeaderActivate?.()}
      >
        {/* category-group-toggle::before { content: "▼" } は 04-category-groups.css に残置 */}
        <button
          type="button"
          className="category-group-toggle border-none bg-transparent p-0 m-0 text-inherit cursor-pointer leading-none"
          aria-label="セクションの折りたたみを切り替える"
          aria-expanded={collapsed ? "false" : "true"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        />
        <button
          type="button"
          className="category-group-header-action flex-1 flex items-center gap-1 border-none bg-transparent p-0 m-0 font-[inherit] text-inherit text-left cursor-pointer"
        >
          <span>{parentCatName}</span>
          <span className="category-group-learned-badge text-xl leading-none normal-case tracking-normal" aria-hidden="true">
            {learnedBadge}
          </span>
        </button>
      </div>
      {items.map((item) => (
        <CategoryItem key={`${item.subject}::${item.categoryId}`} {...item} />
      ))}
    </div>
  );
}
