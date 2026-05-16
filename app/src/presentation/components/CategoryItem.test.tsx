// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryItem } from "./CategoryItem";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

describe("CategoryItem (React コンポーネント)", () => {
  let container: HTMLElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
  });

  function render(props: React.ComponentProps<typeof CategoryItem>): HTMLElement {
    flushSync(() => root.render(<CategoryItem {...props} />));
    return container.querySelector(".category-item") as HTMLElement;
  }

  it("subject / category / parent / top の dataset を設定する", () => {
    const el = render({
      subject: "english",
      categoryId: "cat1",
      categoryName: "カテゴリ1",
      parentCatId: "par1",
      topCatId: "top1",
      showReferenceGrade: false,
    });
    expect(el.dataset.subject).toBe("english");
    expect(el.dataset.category).toBe("cat1");
    expect(el.dataset.parentCategory).toBe("par1");
    expect(el.dataset.topCategory).toBe("top1");
    expect(el.getAttribute("role")).toBe("button");
    expect(el.getAttribute("tabindex")).toBe("0");
  });

  it("初期ステータスアイコンとして ⬜ を描画する", () => {
    const el = render({ subject: "x", categoryId: "c", categoryName: "n", showReferenceGrade: false });
    expect(el.querySelector(".category-status")?.textContent).toBe("⬜");
  });

  it("statusIcon を上書きできる", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      statusIcon: "✅",
    });
    expect(el.querySelector(".category-status")?.textContent).toBe("✅");
  });

  it("stage が指定されると単元名の横にステージ絵文字を表示する", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      stage: 2,
    });
    const badge = el.querySelector(".category-stage-badge");
    expect(badge?.textContent).toBe("📜");
    expect(badge?.className).toContain("text-lg");
  });

  it("stage 未指定かつ進捗100%の場合は単元名の横に ✔️ を表示する", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      progressFillPercent: 100,
      progressInProgressPercent: 0,
    });
    const badge = el.querySelector(".category-stage-badge");
    expect(badge?.textContent).toBe("✔️");
  });

  it("description / example があれば右列を描画する", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      description: "説明",
      example: "I `play` games",
    });
    expect(el.classList.contains("category-item-has-info")).toBe(true);
    expect(el.querySelector(".category-item-description")?.textContent).toBe("説明");
    const ex = el.querySelector(".category-example");
    expect(ex?.textContent).toBe("I play games");
    expect(ex?.querySelector("code")?.textContent).toBe("play");
  });

  it("description も example もなければ右列を描画しない", () => {
    const el = render({ subject: "x", categoryId: "c", categoryName: "n", showReferenceGrade: false });
    expect(el.querySelector(".category-item-right")).toBeNull();
    expect(el.classList.contains("category-item-has-info")).toBe(false);
  });

  it("hierarchy が指定されると親・トップ名を › 区切りで表示する", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      hierarchy: { topName: "T", parentName: "P" },
    });
    expect(el.querySelector(".category-hierarchy")?.textContent).toBe("T › P");
  });

  it("referenceGrade を showReferenceGrade=true で表示する", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: true,
      referenceGrade: "小1",
    });
    const grade = el.querySelector(".category-grade");
    expect(grade?.textContent).toBe("小1");
  });

  it("referenceGrade を showReferenceGrade=false の場合は隠す", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      referenceGrade: "小1",
    });
    expect(el.querySelector(".category-grade")).toBeNull();
  });

  it("active prop で active クラスを付与する", () => {
    const el = render({ subject: "x", categoryId: "c", categoryName: "n", showReferenceGrade: false, active: true });
    expect(el.classList.contains("active")).toBe(true);
  });

  it("進捗バー幅と数値テキストを反映する", () => {
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      progressFillPercent: 60,
      progressInProgressPercent: 20,
      statsText: "6/10",
    });
    const fill = el.querySelector(".category-progress-fill") as HTMLElement;
    const inProgress = el.querySelector(".category-progress-fill-inprogress") as HTMLElement;
    expect(fill.style.width).toBe("60%");
    expect(inProgress.style.width).toBe("20%");
    expect(el.querySelector(".category-stats")?.textContent).toBe("6/10");
  });

  it("クリックで onActivate を呼ぶ", () => {
    const onActivate = vi.fn();
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      onActivate,
    });
    el.click();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Enter / Space キーで onActivate を呼ぶ", () => {
    const onActivate = vi.fn();
    const el = render({
      subject: "x",
      categoryId: "c",
      categoryName: "n",
      showReferenceGrade: false,
      onActivate,
    });
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});
