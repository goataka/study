/**
 * 教科タブ・パネルタブ・進度タブの構築とアクティブ状態同期を行うヘルパー群。
 *
 * 教科タブは React で完全制御化されており、`buildSubjectTabs` を再呼び出しすることで
 * active 状態を切り替える（`renderReactInto` 経由でキャッシュ済み root に対して再レンダリング）。
 * `selectTabByFilter` は後方互換のための薄いラッパーとして残している。
 */

import { SUBJECTS } from "../uiHelpers";
import { setActiveProgressDetailMode } from "../components/startScreen/panelTabsStore";
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
              // 文字・背景（nth-child 色は 02-notebook-and-tabs.css で上書き）
              "cursor-pointer text-[15px] font-semibold text-[#5a4a28] font-[inherit]",
              "flex items-center gap-1.5 whitespace-nowrap",
              "shadow-[0_-2px_4px_rgba(0,0,0,0.08)] relative translate-y-0.5",
              "transition-[background,color,transform,box-shadow] duration-150",
              // hover 状態
              "hover:brightness-[1.05] hover:translate-y-0 hover:shadow-[0_-3px_6px_rgba(0,0,0,0.12)] hover:text-[#333]",
              // active 状態
              "[&.active]:text-[#1a1a1a] [&.active]:translate-y-0",
              "[&.active]:shadow-[0_-3px_8px_rgba(0,0,0,0.15)] [&.active]:z-[1]",
              "[&.active]:font-bold [&.active]:brightness-110",
              "[&.active]:outline [&.active]:outline-2 [&.active]:outline-[rgba(3,102,214,0.5)] [&.active]:-outline-offset-1",
              isActive ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-subject={subject.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => callbacks.onSelectSubject(subject.id)}
          >
            <span className="tab-label">{`${subject.icon} ${subject.name}`}</span>
          </button>
        );
      })}
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
 * インナーパネルタブのクリックハンドラを登録する。
 *
 * `<QuizPanel>` がボタン要素を所有するが、React onClick と DOM 委譲の二重発火を
 * 避けるため、ボタン側には onClick を付けず、本関数が DOM の click を購読する。
 * これにより静的 HTML 互換のテスト構成と React マウント構成の両方で同じ経路を通る。
 */
export function buildPanelTabs(callbacks: PanelTabsCallbacks): void {
  document.querySelectorAll<HTMLElement>(".panel-tab[data-panel]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const panel = tab.dataset.panel as PanelTab;
      callbacks.onSelectPanelTab(panel);
    });
  });
}

/** 総合タブ専用のサマリパネルタブ（学習済み / シェア）にハンドラを登録する。 */
export function setupOverallPanelTabs(onSelect: (panel: "learned" | "share") => void): void {
  document.querySelectorAll<HTMLElement>(".panel-tab[data-overall-panel]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const panel = tab.dataset.overallPanel as "learned" | "share";
      onSelect(panel);
    });
  });
}

/** 進度タブの詳細パネルタブ（学年別 / カテゴリ別 / マトリクス）にハンドラを登録する。 */
export function setupProgressDetailTabs(onSelect: (mode: "grade" | "category" | "matrix") => void): void {
  document.querySelectorAll<HTMLElement>(".panel-tab[data-progress-detail-panel]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.progressDetailPanel as "grade" | "category" | "matrix";

      // ストア更新（React 経由で active クラスを反映）
      setActiveProgressDetailMode(mode);

      // 後方互換: React 未マウント環境向けに命令的 DOM 更新も併用
      document.querySelectorAll<HTMLElement>(".panel-tab[data-progress-detail-panel]").forEach((t) => {
        const active = t.dataset.progressDetailPanel === mode;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
        t.setAttribute("tabindex", active ? "0" : "-1");
      });
      document.getElementById("progressDetailContent")?.setAttribute("aria-labelledby", `progressDetailTab-${mode}`);

      onSelect(mode);
    });
  });
}
