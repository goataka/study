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
 * で wipe したり別構造へ入れ替えたりするケースが残っているため、孤児 root を
 * 検出する仕組みを 2 段で持つ:
 *   1. 初回マウント時にコンテナへ `data-react-mounted` マーカーを付与し、
 *      マーカーが消失していたら「外部 mutation でキャッシュ root が孤児化した」と判定する。
 *   2. 命令的に wipe する側は `clearReactContainer(container)` を呼んでマーカーを
 *      明示的に削除することで、データなし状態の正常レンダリング（子 0 件）と
 *      外部 wipe を確実に区別できるようにする。
 */

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

const rootCache = new WeakMap<Element, Root>();
const REACT_MOUNTED_ATTR = "data-react-mounted";

/**
 * 指定 DOM コンテナへ React 要素を同期描画する。
 * 同一コンテナへの 2 回目以降の呼び出しは React の再レンダリングとして処理される。
 *
 * 並走している命令的コードがコンテナを wipe した場合は、マーカー消失を検出して
 * キャッシュ root を破棄してから新しい root を作り直す。wipe 側は
 * `clearReactContainer` を使うことでこの検出を確実にトリガーできる。
 */
export function renderReactInto(container: Element, element: React.ReactNode): void {
  let root = rootCache.get(container);
  if (root && !container.hasAttribute(REACT_MOUNTED_ATTR)) {
    // 外部 mutation でコンテナがクリアされ、孤児化した既存 root が残っている。
    // この時点では root が管理していた DOM は既に消えており、root.unmount() を
    // 呼ぶと React が「存在しない子ノードを取り外そう」として
    // NotFoundError を非同期に投げてしまう（jsdom / 本番ともに発生）。
    // そのため安全に解放する手段は cache から外して GC に委ねる方法のみ。
    // 命令的に wipe する側は本ファイルの `clearReactContainer` を使うべきで、
    // そちらは DOM が残っているうちに root.unmount() を呼んで適切に解放する。
    rootCache.delete(container);
    root = undefined;
  }
  if (!root) {
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
 * 命令的に共有コンテナを wipe するときに呼ぶ。
 * 既存の React Root を `unmount()` してキャッシュから取り除き、
 * `innerHTML = ""` で残った DOM をクリアし、React 用マーカー属性も削除する。
 * これにより次回 `renderReactInto` は新規 root を作り、同一コンテナに
 * 複数 root が共存する状態を防げる。
 */
export function clearReactContainer(container: Element): void {
  unmountReactFrom(container);
  container.innerHTML = "";
  container.removeAttribute(REACT_MOUNTED_ATTR);
}

/**
 * 指定コンテナに React がマウントされている（renderReactInto で render 済み）か判定する。
 * 命令的レンダラーが React → 命令的の遷移時に React Root を解放するかどうかを
 * 判断する用途に利用する。
 */
export function hasReactMount(container: Element): boolean {
  return container.hasAttribute(REACT_MOUNTED_ATTR);
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
