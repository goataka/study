/**
 * CategoryRegistry ドメインの公開エントリーポイント。
 *
 * 実装は `domain/categoryRegistry/` 配下へ分割し、既存 import パス
 * (`../domain/categoryRegistry`) を維持するためにここで再エクスポートする。
 */

export { CategoryRegistry } from "./categoryRegistry/CategoryRegistry";
export type { CategoryRef } from "./categoryRegistry/types";
