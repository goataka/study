/**
 * 既存の命令的レンダラー（`document.getElementById(...).innerHTML = ...`）を
 * React コンポーネントの描画に置き換えるための小さなブリッジ。
 *
 * 同じ DOM コンテナに対しては `createRoot` を 1 度だけ生成してキャッシュし、
 * 以降は同一 Root に対して `render()` を呼ぶことで React の再描画として動作させる。
 * `flushSync` で同期的にコミットするので、既存の単体テストが直後に DOM を
 * `querySelector` で検証してもタイミング問題を起こさない。
 *
 * 段階移行中、まだ React 化されていない並走パスがコンテナを `innerHTML = ""`
 * で wipe したり別構造へ入れ替えたりするケースが残っているため、初回マウント時に
 * コンテナへ `data-react-mounted` マーカーを付与し、マーカーが消失していたら
 * 「外部 mutation でキャッシュ root が孤児化した」と判定して新しい root を作り直す。
 */

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

const rootCache = new WeakMap<Element, Root>();
const REACT_MOUNTED_ATTR = "data-react-mounted";

/**
 * 指定 DOM コンテナへ React 要素を同期描画する。
 * 同一コンテナへの 2 回目以降の呼び出しは React の再レンダリングとして処理される。
 *
 * 並走している命令的コードがコンテナを `innerHTML = ""` で空にしたり
 * `appendChild` で別構造に置換した場合は、マーカー消失を検出してキャッシュ root
 * を破棄してから新しい root を作り直す（孤児 root の防御）。
 */
export function renderReactInto(container: Element, element: React.ReactNode): void {
  let root = rootCache.get(container);
  if (root && !container.hasAttribute(REACT_MOUNTED_ATTR)) {
    // 外部コードによりコンテナの中身が React の管理下から外された場合、
    // キャッシュ済み root は内部 fiber tree が実 DOM と一致しなくなっているため
    // 破棄して再作成する。
    rootCache.delete(container);
    root = undefined;
  }
  if (!root) {
    // 既存内容（テストや前世代の innerHTML 設定）を一掃してから React を mount する
    container.innerHTML = "";
    root = createRoot(container);
    rootCache.set(container, root);
    container.setAttribute(REACT_MOUNTED_ATTR, "1");
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
    container.removeAttribute(REACT_MOUNTED_ATTR);
  }
}
