/**
 * React アプリケーションのルートコンポーネント。
 *
 * `index.html` に静的記述していたボディマークアップ全体を React コンポーネント
 * として描画する。各セクションは `components/` 配下に分割しており、保守性のため
 * 1 ファイル 600 行以下・1 フォルダ 20 ファイル以下に収めている。
 *
 * 既存の `QuizApp`（presentation/quizApp.ts）は本コンポーネントの `useEffect`
 * から起動する。`QuizApp` は `getElementById` 経由で DOM を操作するため、
 * React が同じ ID/クラスの DOM をレンダリングすれば挙動は完全に保存される。
 *
 * 依存方向: 本コンポーネントは infrastructure 層の具象（リポジトリ実装等）に
 * 依存しない。`bootApp` コールバックを props で受け取り、composition root
 * （`main.tsx`）が依存組み立てとライフサイクル起動を所有する。
 *
 * 二重マウント耐性: `StrictMode` で `useEffect` が 2 回呼ばれても `useRef` で
 * 1 度のみ起動する（テストで検証済み）。
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { TabsUserRow } from "./components/TabsUserRow";
import { StartScreen } from "./components/StartScreen";
import { OuterBottomRow } from "./components/OuterBottomRow";
import { QuizScreen } from "./components/QuizScreen";
import { ResultScreen } from "./components/ResultScreen";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { getFontSizeSnapshot, resolveRootFontSize, subscribeFontSizeStore } from "./components/fontSizeStore";
import { getScreenSnapshot, subscribeScreenStore } from "./components/screenStore";

export interface AppProps {
  /**
   * React の DOM が commit された直後に呼ばれる起動コールバック。
   * composition root（`main.tsx`）で依存（QuizApp + IProgressRepository 実装）を
   * 組み立て、本 props 経由で注入する。テストではモック関数を渡せる。
   */
  bootApp: () => void;
}

export function App({ bootApp }: AppProps): React.JSX.Element {
  // React.StrictMode による二重マウントで二重起動しないようガードする
  const bootedRef = useRef(false);
  const currentScreen = useSyncExternalStore(subscribeScreenStore, getScreenSnapshot, getScreenSnapshot);
  const fontSizeLevel = useSyncExternalStore(subscribeFontSizeStore, getFontSizeSnapshot, getFontSizeSnapshot);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    // React が DOM 要素を commit した後に既存コントローラを起動する。
    bootApp();
  }, [bootApp]);

  useEffect(() => {
    document.documentElement.style.fontSize = resolveRootFontSize(fontSizeLevel);
    document.body.classList.remove("font-size-medium", "font-size-large");
    if (fontSizeLevel === "medium") {
      document.body.classList.add("font-size-medium");
    } else if (fontSizeLevel === "large") {
      document.body.classList.add("font-size-large");
    }
    return () => {
      document.documentElement.style.fontSize = "";
      document.body.classList.remove("font-size-medium", "font-size-large");
    };
  }, [fontSizeLevel]);

  return (
    <>
      <div className="mx-auto flex h-full w-full flex-col px-2">
        <TabsUserRow currentScreen={currentScreen} />
        <StartScreen currentScreen={currentScreen} />
        <OuterBottomRow />
        <QuizScreen currentScreen={currentScreen} />
        <ResultScreen currentScreen={currentScreen} />
      </div>
      <ConfirmDialog />
    </>
  );
}
