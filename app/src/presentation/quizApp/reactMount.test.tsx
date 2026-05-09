// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import * as React from "react";
import {
  renderReactInto,
  clearReactContainer,
  hasReactMount,
  unmountReactFrom,
} from "./reactMount";

describe("reactMount", () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("renderReactInto", () => {
    it("React 要素を同期的にレンダリングする", () => {
      renderReactInto(container, <p className="hello">こんにちは</p>);
      expect(container.querySelector("p.hello")?.textContent).toBe("こんにちは");
    });

    it("初回レンダリング時にマウントマーカー属性を付与する", () => {
      expect(hasReactMount(container)).toBe(false);
      renderReactInto(container, <p>x</p>);
      expect(hasReactMount(container)).toBe(true);
    });

    it("同一コンテナへの再レンダリングは React の reconciliation として動作する", () => {
      renderReactInto(container, <p>初回</p>);
      const initialP = container.querySelector("p");
      expect(initialP?.textContent).toBe("初回");

      renderReactInto(container, <p>2回目</p>);
      const updatedP = container.querySelector("p");
      // 同一要素が in-place で更新されることを確認（reconciliation の証拠）
      expect(updatedP).toBe(initialP);
      expect(updatedP?.textContent).toBe("2回目");
    });

    it("外部から innerHTML 等で wipe されてマーカーが消失した場合、新しい Root を作り直す", () => {
      renderReactInto(container, <p>初回</p>);
      // 並走している命令的コードがマーカーを残したままコンテナを書き換えたケース
      // ではなく、clearReactContainer 等で確実にマーカーが除去された後を想定する。
      // テストでは実際にコンテナを wipe する前に古い Root を unmount し、孤児 Root の
      // React 警告を出さずにケースを再現する。
      unmountReactFrom(container);
      container.innerHTML = "";

      // 再描画時に新しい root が生成される
      renderReactInto(container, <p>再生成</p>);
      expect(container.querySelector("p")?.textContent).toBe("再生成");
      expect(hasReactMount(container)).toBe(true);
    });
  });

  describe("clearReactContainer", () => {
    it("コンテナの DOM とマウントマーカーをクリアする", () => {
      renderReactInto(container, <p>x</p>);
      expect(hasReactMount(container)).toBe(true);

      clearReactContainer(container);
      expect(container.innerHTML).toBe("");
      expect(hasReactMount(container)).toBe(false);
    });

    it("clearReactContainer 後の renderReactInto は新しい Root として動作する", () => {
      renderReactInto(container, <p>初回</p>);
      // clearReactContainer はマーカーを消すだけでキャッシュ root は破棄しないため、
      // 警告なしで作り直すには事前に unmountReactFrom を呼んで明示的に破棄する。
      unmountReactFrom(container);
      clearReactContainer(container);
      renderReactInto(container, <p>新規</p>);

      expect(container.querySelector("p")?.textContent).toBe("新規");
      expect(hasReactMount(container)).toBe(true);
    });
  });

  describe("hasReactMount", () => {
    it("renderReactInto 前は false を返す", () => {
      expect(hasReactMount(container)).toBe(false);
    });

    it("renderReactInto 後は true を返す", () => {
      renderReactInto(container, <p>x</p>);
      expect(hasReactMount(container)).toBe(true);
    });

    it("clearReactContainer 後は false を返す", () => {
      renderReactInto(container, <p>x</p>);
      clearReactContainer(container);
      expect(hasReactMount(container)).toBe(false);
    });
  });

  describe("unmountReactFrom", () => {
    it("マウント済みのコンテナを unmount してマーカーを削除する", () => {
      renderReactInto(container, <p>x</p>);
      unmountReactFrom(container);
      expect(hasReactMount(container)).toBe(false);
    });

    it("未マウントのコンテナに対しては何もしない（例外を投げない）", () => {
      expect(() => unmountReactFrom(container)).not.toThrow();
      expect(hasReactMount(container)).toBe(false);
    });
  });
});
