// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { StartScreen } from "./StartScreen";

describe("StartScreen", () => {
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

  it("モバイルで1カラム、md以上で2カラム構成のクラスを持つ", () => {
    flushSync(() => root.render(<StartScreen currentScreen="start" />));

    const subjectContent = container.querySelector("#subjectContent");
    const spine = container.querySelector(".notebook-spine");

    expect(subjectContent?.className).toContain("grid-cols-1");
    expect(subjectContent?.className).toContain("md:grid-cols-[1fr_12px_2fr]");
    expect(spine?.className).toContain("hidden");
    expect(spine?.className).toContain("md:block");
  });
});
