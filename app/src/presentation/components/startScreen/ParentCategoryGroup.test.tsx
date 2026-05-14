// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParentCategoryGroup } from "./ParentCategoryGroup";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

describe("ParentCategoryGroup コンポーネント", () => {
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

  function render(props: React.ComponentProps<typeof ParentCategoryGroup>): HTMLElement {
    flushSync(() => root.render(<ParentCategoryGroup {...props} />));
    return container.querySelector(".category-group") as HTMLElement;
  }

  it("category-group コンテナと dataset を設定する", () => {
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      topCatId: "t1",
      collapsed: false,
      items: [],
    });
    expect(el.dataset.parentCategory).toBe("p1");
    expect(el.dataset.topCategory).toBe("t1");
    expect(el.classList.contains("collapsed")).toBe(false);
    // ヘッダー div は presentational（role なし、tabIndex なし）であること
    const header = el.querySelector(".category-group-header") as HTMLElement;
    expect(header.getAttribute("role")).toBeNull();
    expect(header.getAttribute("tabindex")).toBeNull();
  });

  it("collapsed=true で collapsed クラスを付与し aria-expanded を false にする", () => {
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      collapsed: true,
      items: [],
    });
    expect(el.classList.contains("collapsed")).toBe(true);
    const toggle = el.querySelector(".category-group-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("ヘッダーアクションボタンクリックで onHeaderActivate のみ呼ぶ", () => {
    const onHeader = vi.fn();
    const onToggle = vi.fn();
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      collapsed: false,
      onHeaderActivate: onHeader,
      onToggle,
      items: [],
    });
    const action = el.querySelector(".category-group-header-action") as HTMLButtonElement;
    action.click();
    expect(onHeader).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("ヘッダー領域をクリックしても onHeaderActivate を呼ぶ", () => {
    const onHeader = vi.fn();
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      collapsed: false,
      onHeaderActivate: onHeader,
      items: [],
    });
    const header = el.querySelector(".category-group-header") as HTMLElement;
    header.click();
    expect(onHeader).toHaveBeenCalledTimes(1);
  });

  it("toggle ボタンクリックで onToggle のみ呼ぶ（ヘッダーには伝播しない）", () => {
    const onHeader = vi.fn();
    const onToggle = vi.fn();
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      collapsed: false,
      onHeaderActivate: onHeader,
      onToggle,
      items: [],
    });
    const toggle = el.querySelector(".category-group-toggle") as HTMLElement;
    toggle.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onHeader).not.toHaveBeenCalled();
  });

  it("子 items を CategoryItem として描画する", () => {
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      collapsed: false,
      items: [
        { subject: "math", categoryId: "c1", categoryName: "単元1", showReferenceGrade: true },
        { subject: "math", categoryId: "c2", categoryName: "単元2", showReferenceGrade: true },
      ],
    });
    const items = el.querySelectorAll(".category-item");
    expect(items.length).toBe(2);
    expect(items[0].querySelector(".category-name")?.textContent).toBe("単元1");
    expect(items[1].querySelector(".category-name")?.textContent).toBe("単元2");
  });

  it("ヘッダーアクションボタンは <button> なので Enter キーで自動的に click され onHeaderActivate を呼ぶ", () => {
    // jsdom は実際のブラウザのように Enter/Space → click を自動生成しないが、
    // ネイティブ <button> を使うことでブラウザではキーボード操作が標準で動作する。
    // ここでは click() が onHeaderActivate を呼ぶことを確認する（Enter/Space の挙動はブラウザに委譲）。
    const onHeader = vi.fn();
    const el = render({
      subject: "math",
      parentCatId: "p1",
      parentCatName: "親1",
      collapsed: false,
      onHeaderActivate: onHeader,
      items: [],
    });
    const action = el.querySelector(".category-group-header-action") as HTMLButtonElement;
    action.focus();
    action.click();
    expect(onHeader).toHaveBeenCalledTimes(1);
  });
});
