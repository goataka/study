/**
 * 左列メニューリスト共通コンポーネント。
 *
 * ガイドタブ（SupportMenuList）と管理タブ（AdminPanelRoot の admin-menu-bar）の
 * 両方で同じ仕様・スタイルのメニューリストを提供する。
 *
 * - `groupLabel` を指定するとセクション見出しラベルを表示する（管理タブ用）
 * - 各アイテムのアクティブ状態は `activeId` と一致する `id` で判定する
 */

export interface PanelMenuListItem {
  id: string;
  label: string;
}

interface PanelMenuListProps {
  groupLabel?: string;
  items: readonly PanelMenuListItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
}

export function PanelMenuList({
  groupLabel,
  items,
  activeId,
  onSelect,
  ariaLabel,
}: PanelMenuListProps): React.JSX.Element {
  return (
    <div className="panel-menu-list flex flex-col p-2 gap-0.5">
      {groupLabel ? (
        <span className="panel-menu-group-label inline-flex items-center rounded-sm bg-[#0366d6] px-2 py-1 text-sm font-bold text-white shrink-0 mb-0.5">
          {groupLabel}
        </span>
      ) : null}
      <nav aria-label={ariaLabel ?? "パネルメニュー"}>
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={[
                    "panel-menu-btn w-full rounded-md px-3 py-2 text-left text-sm cursor-pointer transition-[background,color] duration-150 font-[inherit]",
                    isActive ? "bg-[#e8f0ff] font-semibold text-[#0366d6]" : "text-[#24292e] hover:bg-[#f6f8fa]",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
