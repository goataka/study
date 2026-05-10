/**
 * 親カテゴリグループ（折りたたみ可能なセクション）の React コンポーネント。
 *
 * 命令的 DOM ビルダー `presentation/quizApp/categoryItemBuilder.ts` の
 * `buildParentCategoryGroup` と等価な構造（同じクラス名・dataset・aria 属性）を
 * React で生成する。子の単元アイテムは `<CategoryItem>` で表示する。
 *
 * クリック / Enter / Space で `onHeaderActivate` が発火、折りたたみアイコン
 * クリックで `onToggle` が発火する。表示専用の純粋コンポーネント。
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

  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!onHeaderActivate) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onHeaderActivate();
    }
  };

  const groupClasses = ["category-group"];
  if (collapsed) groupClasses.push("collapsed");

  return (
    <div
      className={groupClasses.join(" ")}
      data-parent-category={parentCatId}
      data-top-category={topCatId}
    >
      <div
        className="category-group-header"
        role="button"
        tabIndex={0}
        data-parent-category={parentCatId}
        onClick={(e) => {
          e.stopPropagation();
          onHeaderActivate?.();
        }}
        onKeyDown={handleHeaderKeyDown}
      >
        <button
          type="button"
          className="category-group-toggle"
          aria-label="セクションの折りたたみを切り替える"
          aria-expanded={collapsed ? "false" : "true"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        />
        <span>{parentCatName}</span>
        <span className="category-group-learned-badge" aria-hidden="true">
          {learnedBadge}
        </span>
      </div>
      {items.map((item) => (
        <CategoryItem key={`${item.subject}::${item.categoryId}`} {...item} />
      ))}
    </div>
  );
}
