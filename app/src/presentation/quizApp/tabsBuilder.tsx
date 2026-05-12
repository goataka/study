/**
 * 教科タブ・パネルタブ・進度タブの構築とアクティブ状態同期を行うヘルパー群。
 *
 * 教科タブは React で完全制御化されており、`buildSubjectTabs` を再呼び出しすることで
 * active 状態を切り替える（`subjectTabsContentStore` 経由で再レンダリング）。
 * `selectTabByFilter` は後方互換のための薄いラッパーとして残している。
 */

import { SUBJECTS } from "../uiHelpers";
import {
  setActivePanelTab,
  subscribeOverallPanelSideEffect,
  subscribePanelTabSideEffect,
  subscribeProgressDetailSideEffect,
} from "../components/startScreen/panelTabsStore";
import { subjectTabsContentStore } from "../components/subjectTabsContentStore";
import { subjectTab } from "../styles/subjectTabStyles";
import { guidePanelContentStore } from "../components/guidePanelContentStore";
import { guideContent } from "../styles/guideContentStyles";
import { useState } from "react";

/** インナーパネルタブの ID（クイズ／解説／履歴／問題一覧）。 */
export type PanelTab = "quiz" | "guide" | "history" | "questions";

/** 教科タブ構築時のコールバック。 */
export interface SubjectTabsCallbacks {
  /** タブクリック時の遷移ハンドラ。指定教科 ID へ切り替える。 */
  onSelectSubject: (subjectId: string) => void;
}

/**
 * 教科タブ群を `.subject-tabs` 配下に React で構築する。
 *
 * `currentSubject` を渡すことで active 状態を制御する。再呼び出し時は
 * ストアを更新し、React の reconciliation で active クラス・aria-selected を最小差分で更新する。
 *
 * `selectTabByFilter` から再レンダリングできるよう、最後に渡された callbacks を
 * モジュール内にキャッシュする。
 */
export function buildSubjectTabs(callbacks: SubjectTabsCallbacks, currentSubject: string): void {
  cachedCallbacks = callbacks;
  subjectTabsContentStore.set(<SubjectTabs callbacks={callbacks} currentSubject={currentSubject} />);
}

let cachedCallbacks: SubjectTabsCallbacks | null = null;

interface SubjectTabsProps {
  callbacks: SubjectTabsCallbacks;
  currentSubject: string;
}

interface SupportSection {
  id: "startup" | "operation" | "technical" | "troubleshooting";
  menuLabel: string;
  title: string;
  summary: string;
  points: string[];
}

const SUPPORT_SECTIONS: readonly [SupportSection, ...SupportSection[]] = [
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

function SupportPanelContent(): React.JSX.Element {
  const [activeSectionId, setActiveSectionId] = useState<SupportSection["id"]>("startup");
  const activeSection = SUPPORT_SECTIONS.find((section) => section.id === activeSectionId) ?? SUPPORT_SECTIONS[0];

  return (
    <div className={guideContent()}>
      <h2 className="mb-2 text-lg font-bold">
        <span aria-hidden="true">❔ </span>
        サポート
      </h2>
      <p className="mb-3">左のメニューから項目を選ぶと内容を表示できます。</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]" data-support-layout="split">
        <nav
          className="border-b border-[#e1e4e8] pb-3 md:border-r md:border-b-0 md:pr-3 md:pb-0"
          aria-label="サポートメニュー"
        >
          <ul className="space-y-2">
            {SUPPORT_SECTIONS.map((section) => {
              const isActive = section.id === activeSection.id;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className={[
                      "w-full rounded px-2 py-1 text-left text-sm",
                      isActive ? "bg-[#e8f0ff] font-semibold text-[#0366d6]" : "hover:bg-[#f6f8fa]",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    {section.menuLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <section className="min-w-0" aria-live="polite">
          <h3 className="mb-2 text-base font-semibold">{activeSection.title}</h3>
          <p className="mb-3">{activeSection.summary}</p>
          <ul className="pl-6 list-disc">
            {activeSection.points.map((point) => (
              <li key={point} className="my-1">
                {point}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function openSupportInGuidePanel(): void {
  setActivePanelTab("guide");
  // ガイドタブ有効化の副作用（通常ガイド描画）より後にサポート内容を反映する。
  // 先に set すると通常ガイドで上書きされるため、同一イベントループ内の後段で set する。
  queueMicrotask(() => {
    guidePanelContentStore.set(<SupportPanelContent />);
  });
}

function SubjectTabs({ callbacks, currentSubject }: SubjectTabsProps): React.JSX.Element {
  return (
    <>
      {SUBJECTS.map((subject) => {
        const isActive = subject.id === currentSubject;
        return (
          <button
            key={subject.id}
            type="button"
            className={subjectTab({ active: isActive })}
            style={{ backgroundColor: isActive ? subject.tabBgActive : subject.tabBg }}
            data-subject={subject.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => callbacks.onSelectSubject(subject.id)}
          >
            <span className="tab-label">{`${subject.icon} ${subject.name}`}</span>
          </button>
        );
      })}
      <button
        id="supportBtn"
        type="button"
        className={[
          subjectTab({ active: false }),
          "tabs-link-note tabs-link-note-support no-underline",
          "justify-center",
          "bg-[#e8f0ff]",
        ].join(" ")}
        title="サポートを解説パネルで開く"
        aria-label="サポートを解説パネルで開く"
        onClick={openSupportInGuidePanel}
      >
        ❔ サポート
      </button>
    </>
  );
}

/** 現在のフィルター設定に基づいて教科タブのアクティブ状態を同期する。
 *  内部的にはキャッシュ済みの callbacks を使って再レンダリングを行うため、
 *  `buildSubjectTabs` が事前に呼び出されている必要がある。 */
export function selectTabByFilter(currentSubject: string): void {
  if (!cachedCallbacks) return;
  buildSubjectTabs(cachedCallbacks, currentSubject);
}

/** インナーパネルタブ（クイズ/解説/履歴/問題一覧）の選択時 callback。 */
export interface PanelTabsCallbacks {
  onSelectPanelTab: (panel: PanelTab) => void;
}

/**
 * インナーパネルタブ切り替え時の副作用ハンドラを登録する。
 */
export function buildPanelTabs(callbacks: PanelTabsCallbacks): void {
  panelTabsUnsubscribe?.();
  panelTabsUnsubscribe = subscribePanelTabSideEffect((panel) => {
    callbacks.onSelectPanelTab(panel);
  });

  // 静的HTMLテスト向け後方互換: React未マウントのタブにはDOMリスナーを登録する。
  document.querySelectorAll<HTMLElement>(".panel-tab[data-panel]").forEach((tab) => {
    if (isInsideReactMount(tab)) return;
    if (tab.dataset.panelClickBound === "1") return;
    tab.dataset.panelClickBound = "1";
    tab.addEventListener("click", () => {
      const panel = tab.dataset.panel as PanelTab;
      callbacks.onSelectPanelTab(panel);
    });
  });
}

let panelTabsUnsubscribe: (() => void) | null = null;

/** 総合タブ専用のサマリパネルタブ（学習済み / シェア）にハンドラを登録する。 */
export function setupOverallPanelTabs(onSelect: (panel: "learned" | "share") => void): void {
  overallPanelUnsubscribe?.();
  overallPanelUnsubscribe = subscribeOverallPanelSideEffect((panel) => {
    onSelect(panel);
  });

  // 静的HTMLテスト向け後方互換: React未マウントのタブにはDOMリスナーを登録する。
  document.querySelectorAll<HTMLElement>(".panel-tab[data-overall-panel]").forEach((tab) => {
    if (isInsideReactMount(tab)) return;
    if (tab.dataset.overallPanelClickBound === "1") return;
    tab.dataset.overallPanelClickBound = "1";
    tab.addEventListener("click", () => {
      const panel = tab.dataset.overallPanel as "learned" | "share";
      onSelect(panel);
    });
  });
}

let overallPanelUnsubscribe: (() => void) | null = null;

/** 進度タブの詳細パネルタブ（学年別 / カテゴリ別 / マトリクス）にハンドラを登録する。 */
export function setupProgressDetailTabs(onSelect: (mode: "grade" | "category" | "matrix") => void): void {
  progressDetailUnsubscribe?.();
  progressDetailUnsubscribe = subscribeProgressDetailSideEffect((mode) => {
    onSelect(mode);
  });

  // 静的HTMLテスト向け後方互換: React未マウントのタブにはDOMリスナーを登録する。
  document.querySelectorAll<HTMLElement>(".panel-tab[data-progress-detail-panel]").forEach((tab) => {
    if (isInsideReactMount(tab)) return;
    if (tab.dataset.progressDetailPanelClickBound === "1") return;
    tab.dataset.progressDetailPanelClickBound = "1";
    tab.addEventListener("click", () => {
      const mode = tab.dataset.progressDetailPanel as "grade" | "category" | "matrix";
      onSelect(mode);
    });
  });
}

let progressDetailUnsubscribe: (() => void) | null = null;

function isInsideReactMount(el: HTMLElement): boolean {
  return Boolean(
    el.closest(
      "#quizPanelMount[data-react-mounted], #overallSummaryPanelMount[data-react-mounted], #progressDetailPanelMount[data-react-mounted]",
    ),
  );
}
