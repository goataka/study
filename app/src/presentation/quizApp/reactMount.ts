/**
 * 既存の命令的レンダラー（`document.getElementById(...).innerHTML = ...`）を
 * React コンポーネントの描画に置き換えるための小さなブリッジ。
 *
 * 同じ DOM コンテナに対しては `createRoot` を 1 度だけ生成してキャッシュし、
 * 以降は同一 Root に対して `render()` を呼ぶことで React の再描画として動作させる。
 * `flushSync` で同期的にコミットするので、既存の単体テストが直後に DOM を
 * `querySelector` で検証してもタイミング問題を起こさない。
 */

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

const rootCache = new WeakMap<Element, Root>();

/**
 * 指定 DOM コンテナへ React 要素を同期描画する。
 * 同一コンテナへの 2 回目以降の呼び出しは React の再レンダリングとして処理される。
 */
export function renderReactInto(container: Element, element: React.ReactNode): void {
  let root = rootCache.get(container);
  if (!root) {
    // 既存内容（テストや前世代の innerHTML 設定）を一掃してから React を mount する
    container.innerHTML = "";
    root = createRoot(container);
    rootCache.set(container, root);
  }
  flushSync(() => {
    root.render(element);
  });
}

/**
 * テスト用: コンテナの React Root を破棄する。
 * 通常の本番フローでは呼ぶ必要はない（コンテナ自体が DOM から消える際に GC される）。
 */
export function unmountReactFrom(container: Element): void {
  const root = rootCache.get(container);
  if (root) {
    root.unmount();
    rootCache.delete(container);
  }
}
