/**
 * statsInfo ヘルパー
 *
 * statsInfo の期待テキストパターンを一元管理する。
 * 形式が変わった場合はここだけ修正すればすべてのステップに反映される。
 */
import type { Page } from "@playwright/test";

/** statsInfo に表示される問題数テキストのパターン（例: "学習中：0問 / 学習済：0問 / 全：3993問"） */
export const STATS_INFO_PATTERN = /全：[1-9]\d*問/;

/** statsInfo の問題ロード完了タイムアウト（ミリ秒） */
export const STATS_LOAD_TIMEOUT = 60_000;

/**
 * リトライ付き初期ロード時のタイムアウト（ミリ秒）。
 * 失敗時にリロードするため、通常タイムアウトより短く設定する。
 */
export const STATS_LOAD_INITIAL_TIMEOUT = 40_000;

/**
 * statsInfo に問題数が表示されるまで待つ（JS 初期化完了の目安）。
 * [1-9] で先頭を非ゼロにし、\d* で2桁以上に対応（例: 全：1問, 全：108問）。
 * 全0問はロード失敗を示すため、このパターンには一致しない。
 * ただし、サポート・履歴タブなど問題数が0になる特殊タブはタブのアクティブ状態で判定する。
 */
export async function waitForStatsInfoLoaded(page: Page, timeout: number = STATS_LOAD_TIMEOUT): Promise<void> {
  await page.waitForFunction(
    (pattern) => {
      const statsInfoText = document.getElementById("statsInfo")?.textContent ?? "";
      const supportMenuVisible = document.querySelector("nav[aria-label='サポートメニュー']") !== null;
      const supportTabActive = document.querySelector('.subject-tab[data-subject="support"].active') !== null;
      const historyTabActive = document.querySelector('.subject-tab[data-subject="history"].active') !== null;
      return new RegExp(pattern).test(statsInfoText) || supportMenuVisible || supportTabActive || historyTabActive;
    },
    STATS_INFO_PATTERN.source,
    {
      timeout,
    },
  );
}
