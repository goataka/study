/**
 * QuestionId ValueObject — 仕様テスト
 */

import { QuestionId } from "./QuestionId";

describe("QuestionId — 問題識別 ValueObject 仕様", () => {
  it("非空文字列から生成できる", () => {
    const id = QuestionId.from("abc-123");
    expect(id.toString()).toBe("abc-123");
  });

  it("空文字列を拒否する", () => {
    expect(() => QuestionId.from("")).toThrow("QuestionId は空でない文字列でなければなりません");
  });

  it("文字列以外（unknown キャスト）を拒否する", () => {
    expect(() => QuestionId.from(undefined as unknown as string)).toThrow(
      "QuestionId は空でない文字列でなければなりません",
    );
  });

  it("同じ文字列から生成された 2 つの ID は equals で等価とみなされる", () => {
    const a = QuestionId.from("same-id");
    const b = QuestionId.from("same-id");
    expect(a.equals(b)).toBe(true);
  });

  it("異なる文字列から生成された ID は equals で非等価", () => {
    const a = QuestionId.from("id-a");
    const b = QuestionId.from("id-b");
    expect(a.equals(b)).toBe(false);
  });

  it("toSeed は同じ ID に対して常に同じ非負整数を返す", () => {
    const id = QuestionId.from("deterministic-seed");
    const s1 = id.toSeed();
    const s2 = id.toSeed();
    expect(s1).toBe(s2);
    expect(s1).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(s1)).toBe(true);
  });

  it("異なる ID からは（多くの場合）異なるシードが得られる", () => {
    const s1 = QuestionId.from("id-1").toSeed();
    const s2 = QuestionId.from("id-2").toSeed();
    expect(s1).not.toBe(s2);
  });
});
