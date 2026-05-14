/**
 * GradeGuideContent の仕様テスト。
 *
 * 旧 `renderGradeGuideContent`（guidePanelUpdater.ts 内）が出力していた DOM 構造
 * （`.guide-content > h2 + p + ul > li`）と等価であることを確認する。
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { GradeGuideContent } from "./GradeGuideContent";

function render(props: Parameters<typeof GradeGuideContent>[0]): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(<GradeGuideContent {...props} />);
  });
  return container;
}

describe("GradeGuideContent コンポーネント", () => {
  it("見出し・サマリ・単元リストを描画する", () => {
    const container = render({
      title: "小1",
      entries: [
        { id: "cat-add", name: "たし算", description: "1桁のたし算" },
        { id: "cat-sub", name: "ひき算" },
      ],
    });
    expect(container.querySelector(".guide-content")).not.toBeNull();
    expect(container.querySelector("h2")?.textContent).toBe("🎓 小1");
    expect(container.querySelector("p")?.textContent).toBe("対象学年: 小1 / 2単元");
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe("たし算 — 1桁のたし算");
    expect(items[1]?.textContent).toBe("ひき算");
  });

  it("entries が空ならリスト要素は 0 件で 0単元と表示する", () => {
    const container = render({ title: "学年未設定", entries: [] });
    expect(container.querySelector("p")?.textContent).toBe("対象学年: 学年未設定 / 0単元");
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});
