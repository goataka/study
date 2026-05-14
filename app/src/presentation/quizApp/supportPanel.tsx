/**
 * サポートパネル — 左列メニューリストと右列コンテンツ表示の React コンポーネント。
 *
 * 左列:
 *   - はじめに（スタートアップガイドのmdを表示）
 *   - 使い方（🚀/🖥️/❓ の3タブで各mdを表示）
 *   - コンテンツ（CategoryRegistry データから動的生成）
 *
 * 右列: 各メニューに対応するコンテンツをタブで表示する。
 */

import { createElement, useSyncExternalStore, useState } from "react";
import { categoryListContentStore } from "../components/categoryListContentStore";
import { supportContentStore } from "../components/supportContentStore";
import { GuideContent } from "../components/startScreen/GuideContent";
import { panelTab, panelTabs } from "../styles/panelTabStyles";
import { getURLParams } from "./urlStateService";
import type { QuizUseCase } from "../../application/quizUseCase";

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

// ─── コンテンツ一覧データ型 ────────────────────────────────────────────────

interface ContentUnit {
  catId: string;
  name: string;
  example?: string;
  hasGuide: boolean;
}

interface ContentParent {
  parentId: string;
  parentName: string;
  units: ContentUnit[];
}

interface ContentTop {
  topId: string;
  topName: string;
  parents: ContentParent[];
  /** トップカテゴリ直下のフラットな単元（親カテゴリなし） */
  flatUnits: ContentUnit[];
}

interface ContentSubject {
  subjectId: string;
  subjectLabel: string;
  topCategories: ContentTop[];
  /** トップカテゴリなし・親カテゴリなしのフラットな単元 */
  flatUnits: ContentUnit[];
}

// ─── コンテンツ一覧 ストア ─────────────────────────────────────────────────

let _contentSubjects: ContentSubject[] = [];
const _contentListeners = new Set<() => void>();

const contentSubjectsStore = {
  get: (): ContentSubject[] => _contentSubjects,
  set: (subjects: ContentSubject[]): void => {
    _contentSubjects = subjects;
    _contentListeners.forEach((fn) => fn());
  },
  subscribe: (fn: () => void): (() => void) => {
    _contentListeners.add(fn);
    return () => _contentListeners.delete(fn);
  },
};

/** QuizUseCase からコンテンツ一覧データを構築する。 */
function buildContentSubjects(useCase: QuizUseCase): ContentSubject[] {
  const subjectDefs = [
    { id: "english", label: "英語" },
    { id: "math", label: "数学" },
    { id: "japanese", label: "国語" },
  ];

  return subjectDefs.map(({ id: subjectId, label: subjectLabel }) => {
    const topCats = useCase.getTopCategoriesForSubject(subjectId);
    const allCats = useCase.getCategoriesForSubject(subjectId);

    // トップカテゴリごとに構築
    const topCategories: ContentTop[] = Object.entries(topCats).map(([topId, topName]) => {
      const parentCats = useCase.getParentCategoriesForTop(subjectId, topId);
      const parents: ContentParent[] = Object.entries(parentCats).map(([parentId, parentName]) => {
        const cats = useCase.getCategoriesForParent(subjectId, parentId);
        const units: ContentUnit[] = Object.entries(cats).map(([catId, catName]) => ({
          catId,
          name: catName,
          example: useCase.getCategoryExample(subjectId, catId),
          hasGuide: useCase.getCategoryGuideUrl(subjectId, catId) !== undefined,
        }));
        return { parentId, parentName, units };
      });

      // このトップカテゴリに直属する単元（親カテゴリなし）
      const parentCatIds = new Set(Object.keys(parentCats));
      const allParentCatUnits = new Set(
        parentCatIds.size > 0
          ? Array.from(parentCatIds).flatMap((pid) => Object.keys(useCase.getCategoriesForParent(subjectId, pid)))
          : [],
      );
      /** トップカテゴリ topId に直属し、いずれの親カテゴリにも属さない単元かを判定する。 */
      const isDirectChildOfTopCategory = (catId: string): boolean => {
        const top = useCase.getTopCategoryForUnit(subjectId, catId);
        const parent = useCase.getParentCategoryForUnit(subjectId, catId);
        return top?.id === topId && (!parent || !allParentCatUnits.has(catId));
      };
      const flatUnits: ContentUnit[] = Object.entries(allCats)
        .filter(([catId]) => isDirectChildOfTopCategory(catId))
        .map(([catId, catName]) => ({
          catId,
          name: catName,
          example: useCase.getCategoryExample(subjectId, catId),
          hasGuide: useCase.getCategoryGuideUrl(subjectId, catId) !== undefined,
        }));

      return { topId, topName, parents, flatUnits };
    });

    // トップカテゴリなしのフラットな単元
    const topCatIds = new Set(Object.keys(topCats));
    const flatUnits: ContentUnit[] = Object.entries(allCats)
      .filter(([catId]) => {
        const top = useCase.getTopCategoryForUnit(subjectId, catId);
        return !top || !topCatIds.has(top.id);
      })
      .map(([catId, catName]) => ({
        catId,
        name: catName,
        example: useCase.getCategoryExample(subjectId, catId),
        hasGuide: useCase.getCategoryGuideUrl(subjectId, catId) !== undefined,
      }));

    return { subjectId, subjectLabel, topCategories, flatUnits };
  });
}

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
      {activeMenuId === "contents" && <SupportDynamicContentsDisplay />}
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

/** コンテンツ一覧の単元テーブル行。 */
function ContentUnitRow({ unit, subjectId }: { unit: ContentUnit; subjectId: string }): React.JSX.Element {
  const confirmHref = `#subject=${subjectId}&category=${unit.catId}`;
  const guideHref = `#subject=${subjectId}&category=${unit.catId}&panel=guide`;
  return (
    <tr>
      <td className="border border-[#e1e4e8] px-2 py-1 text-sm">{unit.name}</td>
      <td className="border border-[#e1e4e8] px-2 py-1 text-sm text-center">
        {unit.hasGuide ? (
          <a href={guideHref} className="text-[#0366d6] underline hover:text-[#0255b8]">
            解説
          </a>
        ) : (
          <span className="text-[#bbb]">—</span>
        )}
      </td>
      <td className="border border-[#e1e4e8] px-2 py-1 text-sm text-center">
        <a href={confirmHref} className="text-[#0366d6] underline hover:text-[#0255b8]">
          確認
        </a>
      </td>
      <td className="border border-[#e1e4e8] px-2 py-1 text-sm text-[#586069]">{unit.example ?? ""}</td>
    </tr>
  );
}

/** コンテンツ一覧の単元テーブル。 */
function ContentUnitsTable({ units, subjectId }: { units: ContentUnit[]; subjectId: string }): React.JSX.Element {
  return (
    <table className="w-full border-collapse mb-3">
      <thead>
        <tr className="bg-[#f6f8fa]">
          <th className="border border-[#e1e4e8] px-2 py-1 text-sm text-left font-semibold">内容</th>
          <th className="border border-[#e1e4e8] px-2 py-1 text-sm text-left font-semibold">解説</th>
          <th className="border border-[#e1e4e8] px-2 py-1 text-sm text-left font-semibold">確認</th>
          <th className="border border-[#e1e4e8] px-2 py-1 text-sm text-left font-semibold">例</th>
        </tr>
      </thead>
      <tbody>
        {units.map((unit) => (
          <ContentUnitRow key={unit.catId} unit={unit} subjectId={subjectId} />
        ))}
      </tbody>
    </table>
  );
}

/** コンテンツ一覧（CategoryRegistry データから動的生成）。 */
function SupportDynamicContentsDisplay(): React.JSX.Element {
  const subjects = useSyncExternalStore(
    contentSubjectsStore.subscribe,
    contentSubjectsStore.get,
    contentSubjectsStore.get,
  );
  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.subjectId ?? "english");
  const subject = subjects.find((s) => s.subjectId === activeSubjectId) ?? subjects[0];

  if (subjects.length === 0) {
    return <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-[#586069]">コンテンツを読み込み中...</div>;
  }

  return (
    <div className="support-contents-dynamic flex flex-col flex-1 overflow-hidden">
      {/* 教科タブ */}
      <div
        className={panelTabs()}
        role="tablist"
        aria-label="コンテンツ教科切り替え"
        data-testid="contents-subject-tabs"
      >
        {subjects.map((s) => (
          <button
            key={s.subjectId}
            type="button"
            className={[panelTab(), activeSubjectId === s.subjectId ? "active" : ""].filter(Boolean).join(" ")}
            role="tab"
            aria-selected={activeSubjectId === s.subjectId}
            onClick={() => setActiveSubjectId(s.subjectId)}
          >
            {s.subjectLabel}
          </button>
        ))}
      </div>
      {/* コンテンツ本体 */}
      <div className="support-contents-body flex-1 overflow-y-auto px-4 py-3">
        {subject && (
          <>
            {/* トップカテゴリなしのフラット単元 */}
            {subject.flatUnits.length > 0 && (
              <ContentUnitsTable units={subject.flatUnits} subjectId={subject.subjectId} />
            )}
            {/* トップカテゴリ → 親カテゴリ → 単元 */}
            {subject.topCategories.map((top) => (
              <section key={top.topId} className="mb-4">
                <h2 className="text-base font-bold text-[#24292e] mt-4 mb-2 border-b border-[#e1e4e8] pb-1">
                  {top.topName}
                </h2>
                {/* 親カテゴリあり */}
                {top.parents.map((parent) => (
                  <section key={parent.parentId} className="mb-3">
                    <h3 className="text-sm font-semibold text-[#586069] mt-2 mb-1">{parent.parentName}</h3>
                    <ContentUnitsTable units={parent.units} subjectId={subject.subjectId} />
                  </section>
                ))}
                {/* 親カテゴリなしのフラット単元 */}
                {top.flatUnits.length > 0 && <ContentUnitsTable units={top.flatUnits} subjectId={subject.subjectId} />}
              </section>
            ))}
          </>
        )}
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
 * useCase が渡された場合はコンテンツ一覧データを再構築する。
 */
export function renderSupportPanel(useCase?: QuizUseCase): void {
  if (useCase) {
    contentSubjectsStore.set(buildContentSubjects(useCase));
  }
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
