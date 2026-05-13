/**
 * サポートパネル — 左列メニューリストと右列コンテンツ表示の React コンポーネント。
 *
 * ・左列: `categoryListContentStore` に `SupportMenuList` をセットする
 * ・右列: `supportContentStore` に `SupportContentDisplay` をセットする
 *
 * `renderSupportPanel()` を呼ぶことで両列を描画する。
 * アクティブセクションは `supportSectionStore` で共有する。
 */

import { createElement, useSyncExternalStore } from "react";
import { categoryListContentStore } from "../components/categoryListContentStore";
import { supportContentStore } from "../components/supportContentStore";

// ─── サポートセクション定義 ──────────────────────────────────────────────────

export interface SupportSection {
  id: "startup" | "operation" | "technical" | "troubleshooting";
  menuLabel: string;
  title: string;
  summary: string;
  points: string[];
}

export const SUPPORT_SECTIONS: readonly [SupportSection, ...SupportSection[]] = [
  {
    id: "startup",
    menuLabel: "🚀 スタートアップガイド",
    title: "🚀 スタートアップガイド",
    summary: "はじめて使うときの流れを確認できます。",
    points: ["学習の始め方", "単元の選び方", "クイズ開始までの基本操作"],
  },
  {
    id: "operation",
    menuLabel: "🖥️ 機能リファレンス",
    title: "🖥️ 機能リファレンス",
    summary: "画面構成と主要機能の使い方を確認できます。",
    points: ["ヘッダーの各ボタン", "単元一覧の見方", "解説・確認・問題・履歴タブの使い方"],
  },
  {
    id: "technical",
    menuLabel: "🔧 技術リファレンス",
    title: "🔧 技術リファレンス",
    summary: "問題データ仕様や技術的な前提を確認できます。",
    points: ["問題データ JSON の構造", "解説URLのルール", "運用時の注意点"],
  },
  {
    id: "troubleshooting",
    menuLabel: "❓ トラブルシューティング",
    title: "❓ トラブルシューティング",
    summary: "よくある困りごとと対処方法を確認できます。",
    points: ["表示や動作の確認手順", "データ保存まわりの注意", "再読み込み時のチェックポイント"],
  },
];

// ─── アクティブセクション ストア ─────────────────────────────────────────────

type SupportSectionId = SupportSection["id"];

let _activeSectionId: SupportSectionId = SUPPORT_SECTIONS[0].id;
const _listeners = new Set<() => void>();

export const supportSectionStore = {
  get: (): SupportSectionId => _activeSectionId,
  set: (id: SupportSectionId): void => {
    _activeSectionId = id;
    _listeners.forEach((fn) => fn());
  },
  subscribe: (fn: () => void): (() => void) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
  reset: (): void => {
    _activeSectionId = SUPPORT_SECTIONS[0].id;
    _listeners.forEach((fn) => fn());
  },
};

// ─── 左列: メニューリスト ─────────────────────────────────────────────────────

/**
 * サポートメニューリスト（左列）。
 * 各セクションボタンをクリックすると `supportSectionStore` を更新し、
 * 右列のコンテンツも同期して切り替わる。
 */
export function SupportMenuList(): React.JSX.Element {
  const activeSectionId = useSyncExternalStore(
    supportSectionStore.subscribe,
    supportSectionStore.get,
    supportSectionStore.get,
  );

  return (
    <div className="support-menu-list flex flex-col p-2" data-testid="support-menu-list">
      <div className="px-2 pb-2 pt-1">
        <span className="text-sm font-bold text-[#0366d6]">❔ サポート</span>
      </div>
      <nav aria-label="サポートメニュー">
        <ul className="space-y-1">
          {SUPPORT_SECTIONS.map((section) => {
            const isActive = section.id === activeSectionId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className={[
                    "w-full rounded-md px-3 py-2 text-left text-sm",
                    isActive ? "bg-[#e8f0ff] font-semibold text-[#0366d6]" : "text-[#24292e] hover:bg-[#f6f8fa]",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    supportSectionStore.set(section.id);
                    renderSupportContentPanel();
                  }}
                >
                  {section.menuLabel}
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
 * `supportSectionStore` のアクティブセクションに対応する内容を表示する。
 */
export function SupportContentDisplay(): React.JSX.Element {
  const activeSectionId = useSyncExternalStore(
    supportSectionStore.subscribe,
    supportSectionStore.get,
    supportSectionStore.get,
  );
  const section = SUPPORT_SECTIONS.find((s) => s.id === activeSectionId) ?? SUPPORT_SECTIONS[0];

  return (
    <div
      className="support-content-display flex-1 overflow-y-auto px-5 py-4"
      data-testid="support-content-display"
      aria-live="polite"
    >
      <h2 className="mb-3 text-lg font-bold text-[#24292e]">{section.title}</h2>
      <p className="mb-4 text-[15px] text-[#586069]">{section.summary}</p>
      <ul className="list-disc pl-6 space-y-1.5">
        {section.points.map((point) => (
          <li key={point} className="text-[15px] text-[#24292e]">
            {point}
          </li>
        ))}
      </ul>
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
  supportSectionStore.reset();
  renderSupportMenuList();
  renderSupportContentPanel();
}
