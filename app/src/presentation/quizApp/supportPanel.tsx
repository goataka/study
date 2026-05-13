/**
 * サポートパネル — 左列メニューリストと右列コンテンツ表示の React コンポーネント。
 *
 * 左列:
 *   - はじめに（スタートアップガイドのmdを表示）
 *   - 使い方（🚀/🖥️/❓ の3タブで各mdを表示）
 *   - コンテンツ（英語/数学/国語の3タブで各mdを表示）
 *
 * 右列: 各メニューに対応するmdコンテンツをタブで表示する。
 */

import { createElement, useSyncExternalStore, useState } from "react";
import { categoryListContentStore } from "../components/categoryListContentStore";
import { supportContentStore } from "../components/supportContentStore";
import { GuideContent } from "../components/GuideContent";
import { panelTab, panelTabs } from "../styles/panelTabStyles";
import { getURLParams } from "./urlStateService";

// ─── 左列メニュー定義 ──────────────────────────────────────────────────────

export type SupportMenuId = "intro" | "usage" | "contents";

export interface SupportMenuItem {
  id: SupportMenuId;
  label: string;
}

export const SUPPORT_MENU_ITEMS: readonly [SupportMenuItem, ...SupportMenuItem[]] = [
  { id: "intro", label: "🏠 はじめに" },
  { id: "usage", label: "📖 使い方" },
  { id: "contents", label: "📚 コンテンツ" },
];

// ─── サブタブ定義 ──────────────────────────────────────────────────────────

interface SubTab {
  id: string;
  label: string;
  url: string;
}

const USAGE_TABS: readonly [SubTab, ...SubTab[]] = [
  { id: "startup", label: "🚀 スタートアップガイド", url: "../support/startup-guide/" },
  { id: "operation", label: "🖥️ 機能リファレンス", url: "../support/operation-guide/" },
  { id: "troubleshooting", label: "❓ トラブルシューティング", url: "../support/troubleshooting/" },
];

const CONTENT_TABS: readonly [SubTab, ...SubTab[]] = [
  { id: "english", label: "英語", url: "../support/content-list/english/" },
  { id: "math", label: "数学", url: "../support/content-list/math/" },
  { id: "japanese", label: "国語", url: "../support/content-list/japanese/" },
];

// ─── アクティブメニュー ストア ─────────────────────────────────────────────

let _activeMenuId: SupportMenuId = SUPPORT_MENU_ITEMS[0].id;
const _menuListeners = new Set<() => void>();

export const supportMenuStore = {
  get: (): SupportMenuId => _activeMenuId,
  set: (id: SupportMenuId): void => {
    _activeMenuId = id;
    _menuListeners.forEach((fn) => fn());
  },
  subscribe: (fn: () => void): (() => void) => {
    _menuListeners.add(fn);
    return () => _menuListeners.delete(fn);
  },
  reset: (id: SupportMenuId = SUPPORT_MENU_ITEMS[0].id): void => {
    _activeMenuId = id;
    _menuListeners.forEach((fn) => fn());
  },
};

// ─── 左列: メニューリスト ─────────────────────────────────────────────────────

/**
 * サポートメニューリスト（左列）。
 */
export function SupportMenuList(): React.JSX.Element {
  const activeMenuId = useSyncExternalStore(supportMenuStore.subscribe, supportMenuStore.get, supportMenuStore.get);

  return (
    <div className="support-menu-list flex flex-col p-2" data-testid="support-menu-list">
      <nav aria-label="サポートメニュー">
        <ul className="space-y-1">
          {SUPPORT_MENU_ITEMS.map((item) => {
            const isActive = item.id === activeMenuId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={[
                    "w-full rounded-md px-3 py-2 text-left text-sm",
                    isActive ? "bg-[#e8f0ff] font-semibold text-[#0366d6]" : "text-[#24292e] hover:bg-[#f6f8fa]",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    supportMenuStore.set(item.id);
                  }}
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

// ─── 右列: コンテンツ表示 ─────────────────────────────────────────────────────

/**
 * サポートコンテンツ表示（右列）。
 * `supportMenuStore` のアクティブメニューに対応するコンテンツを表示する。
 */
export function SupportContentDisplay(): React.JSX.Element {
  const activeMenuId = useSyncExternalStore(supportMenuStore.subscribe, supportMenuStore.get, supportMenuStore.get);

  return (
    <div
      className="support-content-display flex flex-col flex-1 overflow-hidden"
      data-testid="support-content-display"
      aria-live="polite"
    >
      {activeMenuId === "intro" && <SupportIntroContent />}
      {activeMenuId === "usage" && <SupportSubTabContent tabs={USAGE_TABS} namespace="usage" />}
      {activeMenuId === "contents" && <SupportSubTabContent tabs={CONTENT_TABS} namespace="contents" />}
    </div>
  );
}

/** はじめに: サポートトップ（無料・ログイン不要など）の md コンテンツを表示。 */
function SupportIntroContent(): React.JSX.Element {
  return (
    <div className="support-intro-content support-guide-frame flex-1 overflow-y-auto px-4 py-3 guide-frame">
      <GuideContent guideUrl="../support/" />
    </div>
  );
}

/** 使い方/コンテンツ: サブタブで md コンテンツを切り替えて表示。 */
function SupportSubTabContent({
  tabs,
  namespace,
}: {
  tabs: readonly [SubTab, ...SubTab[]];
  namespace: string;
}): React.JSX.Element {
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const tabBtnId = (id: string) => `supportTab-${namespace}-${id}`;
  const panelId = `supportTabPanel-${namespace}`;

  return (
    <div className="support-subtab-content flex flex-col flex-1 overflow-hidden">
      {/* サブタブバー */}
      <div className={panelTabs()} role="tablist" aria-label="サポートサブタブ切り替え">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              id={tabBtnId(tab.id)}
              type="button"
              className={["support-subtab", panelTab(), isActive ? "active" : ""].filter(Boolean).join(" ")}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* サブタブコンテンツ */}
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabBtnId(activeTab.id)}
        className="support-subtab-panel support-guide-frame flex-1 overflow-y-auto px-4 py-3 guide-frame"
      >
        <GuideContent guideUrl={activeTab.url} />
      </div>
    </div>
  );
}

// ─── 描画エントリ ─────────────────────────────────────────────────────────────

/** 左列（単元一覧エリア）にサポートメニューをレンダリングする。 */
function renderSupportMenuList(): void {
  categoryListContentStore.set(createElement(SupportMenuList));
}

/** 右列（`#supportContent`）にサポートコンテンツをレンダリングする。 */
export function renderSupportContentPanel(): void {
  supportContentStore.set(createElement(SupportContentDisplay));
}

/**
 * サポートパネル全体（左列 + 右列）を描画する。
 * `quizPanelVisibility.ts` から呼ぶことで、両列が同期した状態で表示される。
 */
export function renderSupportPanel(): void {
  supportMenuStore.reset(resolveSupportMenuFromUrl());
  renderSupportMenuList();
  renderSupportContentPanel();
}

function resolveSupportMenuFromUrl(): SupportMenuId {
  const params = getURLParams();
  const supportMenu = params.get("supportMenu");
  if (supportMenu === "intro" || supportMenu === "usage" || supportMenu === "contents") {
    return supportMenu;
  }
  return SUPPORT_MENU_ITEMS[0].id;
}

// ─── 後方互換エクスポート ──────────────────────────────────────────────────────

/** @deprecated supportMenuStore を使用してください。 */
export const supportSectionStore = {
  get: () => supportMenuStore.get() as string,
  set: (id: string): void => supportMenuStore.set(id as SupportMenuId),
  subscribe: supportMenuStore.subscribe,
  reset: supportMenuStore.reset,
};
