// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { StartScreen } from "./StartScreen";

describe("StartScreen コンポーネント", () => {
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

  it("モバイル（md未満）1カラム・md以上2カラムを意図したレスポンシブクラスを持つ", () => {
    flushSync(() => root.render(<StartScreen currentScreen="start" />));

    const subjectContent = container.querySelector("#subjectContent");
    const spine = container.querySelector(".notebook-spine");
    const quizPanel = container.querySelector(".quiz-panel");

    expect(subjectContent?.className).toContain("grid-cols-1");
    expect(subjectContent?.className).toContain("md:grid-cols-[1fr_12px_2fr]");
    expect(spine?.className).toContain("hidden");
    expect(spine?.className).toContain("md:block");
    expect(quizPanel?.className).toContain("shadow-none");
    expect(quizPanel?.className).toContain("md:shadow-[inset_3px_0_6px_rgba(0,0,0,0.08)]");
  });
});
