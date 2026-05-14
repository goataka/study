// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelMenuList } from "../PanelMenuList";

const ITEMS = [
  { id: "item1", label: "アイテム1" },
  { id: "item2", label: "アイテム2" },
  { id: "item3", label: "アイテム3" },
] as const;

describe("PanelMenuList", () => {
  it("各アイテムボタンを表示できる", () => {
    render(<PanelMenuList items={ITEMS} activeId="item1" onSelect={() => {}} />);
    expect(screen.getByText("アイテム1")).toBeTruthy();
    expect(screen.getByText("アイテム2")).toBeTruthy();
    expect(screen.getByText("アイテム3")).toBeTruthy();
  });

  it("グループラベルを表示できる", () => {
    render(<PanelMenuList groupLabel="テストグループ" items={ITEMS} activeId="item1" onSelect={() => {}} />);
    expect(screen.getByText("テストグループ")).toBeTruthy();
  });

  it("グループラベルを省略できる", () => {
    render(<PanelMenuList items={ITEMS} activeId="item1" onSelect={() => {}} />);
    expect(document.querySelector(".panel-menu-group-label")).toBeNull();
  });

  it("アクティブなアイテムに aria-current=page を付与する", () => {
    render(<PanelMenuList items={ITEMS} activeId="item2" onSelect={() => {}} />);
    const activeBtn = screen.getByText("アイテム2").closest("button");
    expect(activeBtn?.getAttribute("aria-current")).toBe("page");
  });

  it("非アクティブなアイテムに aria-current を付与しない", () => {
    render(<PanelMenuList items={ITEMS} activeId="item1" onSelect={() => {}} />);
    const inactiveBtn = screen.getByText("アイテム2").closest("button");
    expect(inactiveBtn?.getAttribute("aria-current")).toBeNull();
  });

  it("アイテムクリックで onSelect が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PanelMenuList items={ITEMS} activeId="item1" onSelect={onSelect} />);
    await user.click(screen.getByText("アイテム2"));
    expect(onSelect).toHaveBeenCalledWith("item2");
  });

  it("各ボタンに panel-menu-btn クラスが付与される", () => {
    render(<PanelMenuList items={ITEMS} activeId="item1" onSelect={() => {}} />);
    const buttons = document.querySelectorAll(".panel-menu-btn");
    expect(buttons.length).toBe(3);
  });
});
