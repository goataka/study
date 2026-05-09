/**
 * パネルタブグループ群を React 制御化するための共通フック。
 *
 * `useSyncExternalStore` でストアを購読し、再レンダリングをトリガーする。
 */

import { useSyncExternalStore } from "react";
import {
  getPanelTabsSnapshot,
  subscribePanelTabsStore,
  type OverallPanelTab,
  type PanelTab,
  type ProgressDetailMode,
} from "./panelTabsStore";

/** インナーパネルタブの現在のアクティブ値を購読する。 */
export function useActivePanelTab(): PanelTab {
  return useSyncExternalStore(
    subscribePanelTabsStore,
    () => getPanelTabsSnapshot().activePanelTab,
    () => getPanelTabsSnapshot().activePanelTab,
  );
}

/** 総合サマリパネルの現在のアクティブ値を購読する。 */
export function useActiveOverallPanel(): OverallPanelTab {
  return useSyncExternalStore(
    subscribePanelTabsStore,
    () => getPanelTabsSnapshot().activeOverallPanel,
    () => getPanelTabsSnapshot().activeOverallPanel,
  );
}

/** 進度詳細パネルの現在のモードを購読する。 */
export function useActiveProgressDetailMode(): ProgressDetailMode {
  return useSyncExternalStore(
    subscribePanelTabsStore,
    () => getPanelTabsSnapshot().activeProgressDetailMode,
    () => getPanelTabsSnapshot().activeProgressDetailMode,
  );
}

/** インナーパネルタブの非表示集合を購読する。 */
export function useHiddenPanelTabs(): ReadonlySet<PanelTab> {
  return useSyncExternalStore(
    subscribePanelTabsStore,
    () => getPanelTabsSnapshot().hiddenPanelTabs,
    () => getPanelTabsSnapshot().hiddenPanelTabs,
  );
}
