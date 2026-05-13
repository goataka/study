/**
 * 現在選択中の教科情報を保持するストア。
 * `tabsBuilder` から `set()` を呼んで更新し、`StartHeader` が購読して教科名を表示する。
 */

export interface ActiveSubjectInfo {
  id: string;
  name: string;
  icon: string;
}

let _info: ActiveSubjectInfo = { id: "all", name: "おすすめ", icon: "✨" };
const _listeners = new Set<() => void>();

export const activeSubjectStore = {
  get: (): ActiveSubjectInfo => _info,
  set: (info: ActiveSubjectInfo): void => {
    _info = info;
    _listeners.forEach((fn) => fn());
  },
  subscribe: (fn: () => void): (() => void) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
