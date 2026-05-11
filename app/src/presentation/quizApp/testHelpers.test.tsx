// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { setCurrentScreen } from "../components/screenStore";
import { setupTabDom } from "./testHelpers";

describe("testHelpers の screenStore DOMブリッジ", () => {
  beforeEach(() => {
    setupTabDom();
  });

  it("screenStore変更時に画面とタブの hidden クラスを同期する", () => {
    const startScreen = document.getElementById("startScreen");
    const quizScreen = document.getElementById("quizScreen");
    const resultScreen = document.getElementById("resultScreen");
    const subjectTabs = document.querySelector(".subject-tabs");

    expect(startScreen?.classList.contains("hidden")).toBe(false);
    expect(quizScreen?.classList.contains("hidden")).toBe(true);
    expect(resultScreen?.classList.contains("hidden")).toBe(true);
    expect(subjectTabs?.classList.contains("hidden")).toBe(false);

    setCurrentScreen("quiz", { history: "none" });
    expect(startScreen?.classList.contains("hidden")).toBe(true);
    expect(quizScreen?.classList.contains("hidden")).toBe(false);
    expect(resultScreen?.classList.contains("hidden")).toBe(true);
    expect(subjectTabs?.classList.contains("hidden")).toBe(true);

    setCurrentScreen("result", { history: "none" });
    expect(resultScreen?.classList.contains("hidden")).toBe(false);

    setCurrentScreen("start", { history: "none" });
    expect(startScreen?.classList.contains("hidden")).toBe(false);
    expect(subjectTabs?.classList.contains("hidden")).toBe(false);
  });
});
