/**
 * 教科タブ・パネルタブ・進度タブの構築とアクティブ状態同期を行うヘルパー群。
 *
 * 教科タブは React で完全制御化されており、`buildSubjectTabs` を再呼び出しすることで
 * active 状態を切り替える（`renderReactInto` 経由でキャッシュ済み root に対して再レンダリング）。
 * `selectTabByFilter` は後方互換のための薄いラッパーとして残している。
 */

import { SUBJECTS } from "../uiHelpers";
import {
  subscribeOverallPanelSideEffect,
  subscribePanelTabSideEffect,
  subscribeProgressDetailSideEffect,
} from "../components/startScreen/panelTabsStore";
import { renderReactInto } from "./reactMount";

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
 * `renderReactInto` がキャッシュ済み root に対して props のみを更新し、
 * React の reconciliation で active クラス・aria-selected を最小差分で更新する。
 *
 * `selectTabByFilter` から再レンダリングできるよう、最後に渡された callbacks を
 * モジュール内にキャッシュする。
 */
export function buildSubjectTabs(callbacks: SubjectTabsCallbacks, currentSubject: string): void {
  cachedCallbacks = callbacks;
  const tabsContainer = document.querySelector(".subject-tabs");
  if (!tabsContainer) return;
  renderReactInto(tabsContainer, <SubjectTabs callbacks={callbacks} currentSubject={currentSubject} />);
}

let cachedCallbacks: SubjectTabsCallbacks | null = null;

interface SubjectTabsProps {
  callbacks: SubjectTabsCallbacks;
  currentSubject: string;
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
            className={[
              "subject-tab",
              // レイアウト・ボーダー
              "pt-[6px] px-[18px] pb-2 border border-[rgba(0,0,0,0.12)] border-b-0",
              // 文字
              "cursor-pointer text-[15px] font-semibold text-[#5a4a28] font-[inherit]",
              "flex items-center gap-1.5 whitespace-nowrap",
              "shadow-[0_-2px_4px_rgba(0,0,0,0.08)] relative translate-y-0.5",
              "transition-[background,color,transform,box-shadow] duration-150",
              // hover 状態
              "hover:brightness-[1.05] hover:translate-y-0 hover:shadow-[0_-3px_6px_rgba(0,0,0,0.12)] hover:text-[#333]",
              // active 状態（一括指定）
              "[&.active]:text-[#1a1a1a] [&.active]:translate-y-0 [&.active]:shadow-[0_-3px_8px_rgba(0,0,0,0.15)] [&.active]:z-[1] [&.active]:font-bold [&.active]:brightness-110 [&.active]:outline [&.active]:outline-2 [&.active]:outline-[rgba(3,102,214,0.5)] [&.active]:-outline-offset-1",
              isActive ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
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
      <a
        id="supportBtn"
        className={[
          "tabs-link-note tabs-link-note-support",
          "inline-flex items-center gap-1 justify-center",
          "px-[18px] pt-[6px] pb-2 min-w-7 min-h-[33px]",
          "border border-[rgba(0,0,0,0.12)] border-b-0",
          "text-[15px] font-semibold no-underline whitespace-nowrap leading-none",
          "translate-y-0.5 shadow-[0_-2px_4px_rgba(0,0,0,0.08)]",
          "transition-[filter,transform] duration-150",
          "hover:brightness-[1.08] hover:translate-y-0",
          "bg-[#d8f0e8] text-[#1a6a40]",
        ].join(" ")}
        href="./support/"
        target="_blank"
        rel="noopener noreferrer"
        title="サポートページを開く"
        aria-label="サポートページを開く"
      >
        ❔ サポート ↗
      </a>
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
