/**
 * 教科タブ・パネルタブ・進度タブの構築とアクティブ状態同期を行うヘルパー群。
 */

import { SUBJECTS } from "../uiHelpers";

/** インナーパネルタブの ID（クイズ／解説／履歴／問題一覧）。 */
export type PanelTab = "quiz" | "guide" | "history" | "questions";

/** 教科タブ構築時のコールバック。 */
export interface SubjectTabsCallbacks {
  /** タブクリック時の遷移ハンドラ。指定教科 ID へ切り替える。 */
  onSelectSubject: (subjectId: string) => void;
}

/**
 * 教科タブ群を `.subject-tabs` 配下に構築する。
 */
export function buildSubjectTabs(callbacks: SubjectTabsCallbacks): void {
  const tabsContainer = document.querySelector(".subject-tabs");
  if (!tabsContainer) return;

  tabsContainer.innerHTML = "";

  SUBJECTS.forEach((subject) => {
    const tab = document.createElement("button");
    tab.className = "subject-tab";
    tab.dataset.subject = subject.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("type", "button");
    tab.setAttribute("aria-selected", "false");

    const labelSpan = document.createElement("span");
    labelSpan.className = "tab-label";
    labelSpan.textContent = `${subject.icon} ${subject.name}`;

    tab.appendChild(labelSpan);

    tab.addEventListener("click", () => {
      tabsContainer.querySelectorAll(".subject-tab").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      callbacks.onSelectSubject(subject.id);
    });

    tabsContainer.appendChild(tab);
  });

  const supportLink = document.createElement("a");
  supportLink.id = "supportBtn";
  supportLink.className = "tabs-link-note tabs-link-note-support subject-support-link";
  supportLink.href = "./support/";
  supportLink.target = "_blank";
  supportLink.rel = "noopener noreferrer";
  supportLink.title = "サポートページを開く";
  supportLink.setAttribute("aria-label", "サポートページを開く");
  supportLink.textContent = "❔ サポート";
  tabsContainer.appendChild(supportLink);
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
