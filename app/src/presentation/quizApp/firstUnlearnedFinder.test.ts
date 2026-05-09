// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { findFirstUnlearnedCategory } from "./firstUnlearnedFinder";

describe("findFirstUnlearnedCategory", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="categoryList">
        <li class="category-item learned"
            data-subject="math" data-category="learned01"
            data-parent-category="parentA"></li>
        <li class="category-item"
            data-subject="math" data-category="add01"
            data-parent-category="parentA"></li>
        <li class="category-item"
            data-subject="english" data-category="phon01"></li>
      </ul>
    `;
  });

  it("learned 以外で最初に出現する単元を返す", () => {
    const result = findFirstUnlearnedCategory(false);
    expect(result).toEqual({
      subject: "math",
      category: "add01",
      parentCategory: "parentA",
    });
  });

  it("URL でディープリンク指定がある場合は null を返す", () => {
    expect(findFirstUnlearnedCategory(true)).toBeNull();
  });

  it("#categoryList が存在しない場合は null を返す", () => {
    document.body.innerHTML = "";
    expect(findFirstUnlearnedCategory(false)).toBeNull();
  });

  it("全カテゴリが learned のときは null を返す", () => {
    document.body.innerHTML = `
      <ul id="categoryList">
        <li class="category-item learned" data-subject="math" data-category="a"></li>
        <li class="category-item learned" data-subject="math" data-category="b"></li>
      </ul>
    `;
    expect(findFirstUnlearnedCategory(false)).toBeNull();
  });

  it("subject / category dataset が欠落しているアイテムは無視されて null になる", () => {
    document.body.innerHTML = `
      <ul id="categoryList">
        <li class="category-item"></li>
      </ul>
    `;
    expect(findFirstUnlearnedCategory(false)).toBeNull();
  });

  it("parentCategory が無いアイテムは undefined を返す", () => {
    document.body.innerHTML = `
      <ul id="categoryList">
        <li class="category-item" data-subject="english" data-category="phon01"></li>
      </ul>
    `;
    expect(findFirstUnlearnedCategory(false)).toEqual({
      subject: "english",
      category: "phon01",
      parentCategory: undefined,
    });
  });
});
