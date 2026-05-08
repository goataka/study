/**
 * 画面遷移（スタート／クイズ／結果）の DOM 制御ヘルパー。
 *
 * ブラウザ履歴（pushState/replaceState）と関連する UI 要素（教科タブ等）の
 * 表示切替を扱う純粋な DOM 操作関数。
 */

export type ScreenName = "start" | "quiz" | "result";

/**
 * 指定した画面に切り替える。
 * - クイズ／結果画面は pushState で履歴に追加（戻るボタンで戻れる）
 * - スタート画面は replaceState で現在のエントリを置き換え
 * - 教科タブ・タブリンクエリアはスタート画面のみ表示する
 */
export function showScreen(screenName: ScreenName): void {
  // ブラウザ履歴を管理する
  if (screenName === "quiz" || screenName === "result") {
    window.history.pushState({ screen: screenName }, document.title);
  } else {
    window.history.replaceState({ screen: "start" }, document.title);
  }
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  const idMap: Record<ScreenName, string> = {
    start: "startScreen",
    quiz: "quizScreen",
    result: "resultScreen",
  };
  document.getElementById(idMap[screenName])?.classList.remove("hidden");

  // 教科タブ（#startScreen の外にある）はスタート画面のみ表示する
  const subjectTabs = document.querySelector<HTMLElement>(".subject-tabs");
  if (subjectTabs) {
    subjectTabs.classList.toggle("hidden", screenName !== "start");
  }
  const tabsLinksArea = document.querySelector<HTMLElement>(".tabs-links-area");
  if (tabsLinksArea) {
    tabsLinksArea.classList.toggle("hidden", screenName !== "start");
  }
}
