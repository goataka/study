/**
 * 教科タブ・パネルタブ・進度タブの構築とアクティブ状態同期を行うヘルパー群。
 *
 * `buildSubjectTabs` のみ React 化済み。`selectTabByFilter` は同じ DOM を後から
 * class/aria 属性で書き換えるため、React の reconciliation を避ける目的で
 * `buildSubjectTabs` は初期化時の 1 度だけ呼び出されることを前提としている。
 */

import { SUBJECTS } from "../uiHelpers";
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
 * クリック時は内部で active クラス・aria-selected を即時に切り替えてからコールバックを呼び出す。
 *
 * このヘルパーは初期化時に 1 度だけ呼び出されることを前提とする。
 * その後の active 状態の変更は `selectTabByFilter` が DOM を直接書き換える。
 */
export function buildSubjectTabs(callbacks: SubjectTabsCallbacks): void {
  const tabsContainer = document.querySelector(".subject-tabs");
  if (!tabsContainer) return;
  renderReactInto(tabsContainer, <SubjectTabs callbacks={callbacks} />);
}

interface SubjectTabsProps {
  callbacks: SubjectTabsCallbacks;
}

function SubjectTabs({ callbacks }: SubjectTabsProps): React.JSX.Element {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, subjectId: string): void => {
    const tab = e.currentTarget;
    const tabsContainer = tab.parentElement;
    // active 状態の更新は selectTabByFilter と同じく DOM 直書き換えで行う
    // （React の制御外。このコンポーネント自体は初期化時の 1 度しかレンダリングされない想定）。
    tabsContainer?.querySelectorAll(".subject-tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    callbacks.onSelectSubject(subjectId);
  };

  return (
    <>
      {SUBJECTS.map((subject) => (
        <button
          key={subject.id}
          type="button"
          className="subject-tab"
          data-subject={subject.id}
          role="tab"
          aria-selected="false"
          onClick={(e) => handleClick(e, subject.id)}
        >
          <span className="tab-label">{`${subject.icon} ${subject.name}`}</span>
        </button>
      ))}
    </>
  );
}

/** 現在のフィルター設定に基づいて教科タブのアクティブ状態を同期する。 */
export function selectTabByFilter(currentSubject: string): void {
  const tabsContainer = document.querySelector(".subject-tabs");
  if (!tabsContainer) return;

  tabsContainer.querySelectorAll(".subject-tab").forEach((tab) => {
    const el = tab as HTMLElement;
    const isActive = el.dataset.subject === currentSubject;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-selected", String(isActive));
  });
}

/** インナーパネルタブ（クイズ/解説/履歴/問題一覧）のクリックハンドラを登録する。 */
export interface PanelTabsCallbacks {
  onSelectPanelTab: (panel: PanelTab) => void;
}

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
      // タブのアクティブ状態・tabindex を更新
      document.querySelectorAll<HTMLElement>(".panel-tab[data-progress-detail-panel]").forEach((t) => {
        const active = t.dataset.progressDetailPanel === mode;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
        t.setAttribute("tabindex", active ? "0" : "-1");
      });
      // tabpanel の aria-labelledby を更新する
      document.getElementById("progressDetailContent")?.setAttribute("aria-labelledby", `progressDetailTab-${mode}`);
      onSelect(mode);
    });
  });
}
