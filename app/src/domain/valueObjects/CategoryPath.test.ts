/**
 * CategoryPath ValueObject — 仕様テスト
 */

import { CategoryPath } from "./CategoryPath";

describe("CategoryPath — カテゴリ階層 ValueObject 仕様", () => {
  it("subject と category から生成できる", () => {
    const path = CategoryPath.of({ subject: "math", category: "addition" });
    expect(path.subject).toBe("math");
    expect(path.category).toBe("addition");
    expect(path.parentCategory).toBeUndefined();
    expect(path.topCategory).toBeUndefined();
  });

  it("空 subject を拒否する", () => {
    expect(() => CategoryPath.of({ subject: "", category: "x" })).toThrow(
      "CategoryPath.subject must be a non-empty string",
    );
  });

  it("空 category を拒否する", () => {
    expect(() => CategoryPath.of({ subject: "math", category: "" })).toThrow(
      "CategoryPath.category must be a non-empty string",
    );
  });

  it("parentCategory / topCategory も保持できる", () => {
    const path = CategoryPath.of({
      subject: "english",
      category: "phonics-1",
      parentCategory: "phonics",
      topCategory: "pronunciation",
    });
    expect(path.parentCategory).toBe("phonics");
    expect(path.topCategory).toBe("pronunciation");
  });

  it("key() は subject::category 形式を返す", () => {
    const path = CategoryPath.of({ subject: "math", category: "addition" });
    expect(path.key()).toBe("math::addition");
  });

  it("keyFor(id) は subject::id 形式を返す（親カテゴリ用キャッシュキー）", () => {
    const path = CategoryPath.of({
      subject: "english",
      category: "phonics-1",
      parentCategory: "phonics",
    });
    expect(path.keyFor("phonics")).toBe("english::phonics");
  });

  it("値の同一性比較を行える", () => {
    const a = CategoryPath.of({ subject: "math", category: "addition" });
    const b = CategoryPath.of({ subject: "math", category: "addition" });
    const c = CategoryPath.of({ subject: "math", category: "subtraction" });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
