// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { StartHeader } from "./StartHeader";

describe("StartHeader", () => {
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

  it("狭い画面向けの折り返しクラスを持つ", () => {
    flushSync(() => root.render(<StartHeader />));
    const header = container.querySelector("header");
    const dateArea = container.querySelector(".header-date-area");
    const date = container.querySelector("#headerTodayDate");

    expect(header?.className).toContain("flex-wrap");
    expect(dateArea?.className).toContain("w-full");
    expect(date?.className).toContain("min-w-[120px]");
  });
});
