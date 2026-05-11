/**
 * React.ReactNode を保持するシンプルなストアを生成するファクトリ。
 *
 * `renderReactInto` ブリッジの代替として使用する。
 * 呼び出し側は `store.set(<Component />)` でノードを更新し、
 * React コンポーネントは `useSyncExternalStore` で購読して描画する。
 *
 * 購読者への通知は `flushSync` でラップし、旧 `renderReactInto` と同様に
 * React レンダリングを同期的にフラッシュする。
 */

import { flushSync } from "react-dom";

export interface NodeStore {
  /** 保持するノードを更新し、購読者へ通知する。 */
  set(node: React.ReactNode): void;
  /** 現在のノードを返す（スナップショット）。 */
  get(): React.ReactNode;
  /** 購読関数を登録する。戻り値は購読解除関数。 */
  subscribe(fn: () => void): () => void;
  /** ノードを null にリセットして購読者へ通知する（テスト用途にも使用）。 */
  reset(): void;
}

/**
 * React.ReactNode を保持するシンプルなストアを生成する。
 * 生成された各ストアは独立したインスタンスを持つ。
 */
export function createNodeStore(): NodeStore {
  let node: React.ReactNode = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    if (listeners.size === 0) return;
    flushSync(() => listeners.forEach((fn) => fn()));
  }

  return {
    set(next: React.ReactNode): void {
      node = next;
      notify();
    },
    get(): React.ReactNode {
      return node;
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset(): void {
      node = null;
      notify();
    },
  };
}
