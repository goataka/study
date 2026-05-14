/**
 * Score ValueObject — 仕様テスト
 */

import { Score } from "./Score";

describe("Score — クイズ採点結果 ValueObject 仕様", () => {
  it("正解数と全問数から生成できる", () => {
    const score = Score.of(3, 5);
    expect(score.correct).toBe(3);
    expect(score.total).toBe(5);
  });

  it("負の正解数を拒否する", () => {
    expect(() => Score.of(-1, 5)).toThrow("Score.correct は非負整数でなければなりません");
  });

  it("整数でない正解数を拒否する", () => {
    expect(() => Score.of(1.5, 5)).toThrow("Score.correct は非負整数でなければなりません");
  });

  it("負の全問数を拒否する", () => {
    expect(() => Score.of(0, -1)).toThrow("Score.total は非負整数でなければなりません");
  });

  it("正解数が全問数を超える場合は拒否する", () => {
    expect(() => Score.of(6, 5)).toThrow("Score.correct は Score.total を超えることができません");
  });

  it("正答率を比率として返す", () => {
    expect(Score.of(3, 4).ratio).toBe(0.75);
  });

  it("全問数 0 の場合は ratio が 0 になる", () => {
    expect(Score.of(0, 0).ratio).toBe(0);
  });

  it("正答率を 0〜100 のパーセンテージとして返す", () => {
    expect(Score.of(1, 3).percentage).toBe(33);
    expect(Score.of(2, 3).percentage).toBe(67);
  });

  it("満点判定を行える", () => {
    expect(Score.of(5, 5).isPerfect).toBe(true);
    expect(Score.of(4, 5).isPerfect).toBe(false);
    expect(Score.of(0, 0).isPerfect).toBe(false);
  });

  it('toString が "正解 / 全問" 形式を返す', () => {
    expect(Score.of(3, 5).toString()).toBe("3 / 5");
  });

  it("値が等しい Score は equals で等価", () => {
    expect(Score.of(2, 5).equals(Score.of(2, 5))).toBe(true);
    expect(Score.of(2, 5).equals(Score.of(3, 5))).toBe(false);
  });
});
