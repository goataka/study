/**
 * 教科タブ・パネルタブ・進度タブの構築とアクティブ状態同期を行うヘルパー群。
 *
 * 教科タブは React で完全制御化されており、`buildSubjectTabs` を再呼び出しすることで
 * active 状態を切り替える（`subjectTabsContentStore` 経由で再レンダリング）。
 * `selectTabByFilter` は後方互換のための薄いラッパーとして残している。
 */

import { SUBJECTS } from "../uiHelpers";
import {
  subscribeOverallPanelSideEffect,
  subscribePanelTabSideEffect,
  subscribeProgressDetailSideEffect,
} from "../components/startScreen/panelTabsStore";
import { subjectTabsContentStore } from "../components/subjectTabsContentStore";
import { subjectTab } from "../styles/subjectTabStyles";

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

// /study/v1/ や /study/rc/ など、app 配下から 1 階層上の support を参照すべきパス。
const SUPPORT_PARENT_PATH_SEGMENTS = ["/v1", "/rc"] as const;

function resolveSupportHref(): string {
  if (typeof window === "undefined") return "./support/";
  const path = window.location.pathname;
  const needsParent = SUPPORT_PARENT_PATH_SEGMENTS.some((segment) => {
    return path.includes(`${segment}/`) || path.endsWith(segment);
  });
  if (needsParent) {
    return "../support/";
  }
  return "./support/";
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
      <a
        id="supportBtn"
        className={[
          subjectTab({ active: false }),
          "tabs-link-note tabs-link-note-support no-underline",
          "justify-center",
          "bg-[#e8f0ff]",
        ].join(" ")}
        href={resolveSupportHref()}
        target="_blank"
        rel="noopener noreferrer"
        role="tab"
        aria-selected={false}
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
